import crypto from "crypto";
import { supabaseAdmin } from "./supabase-admin";

const GRAPH = "https://graph.instagram.com";
const VER = process.env.META_GRAPH_API_VERSION || "v24.0";

export type ConversationStage = "opening" | "discovery" | "qualification" | "resource_ready" | "resource_sent" | "follow_up" | "closed";
export type ConversationOrigin = "post_comment" | "story_reply" | "direct_dm";

export type InstagramConversationEvent = {
  account: any;
  automation: any;
  contactId: string;
  threadId?: string | null;
  messageId: string;
  text: string;
  origin?: ConversationOrigin;
  contextPayload?: Record<string, any>;
  history?: string;
  firstName?: string;
  source: "webhook" | "polling";
};

function norm(v: any) { return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase(); }
function uniq(xs: any[]) { return [...new Set(xs.map(String).filter(Boolean))]; }

function classifyIntent(text: string, resources: any[] = [], history = "") {
  const t = norm(text);

  // Reclamo explícito
  if (/no me (la|lo) (mandaste|enviaste|pasaste)|no (la|lo) veo|no aparece|no me aparece|no llego|no me llego|reenvi|otra vez|de nuevo/.test(t)) {
    return "claim_missing_resource";
  }

  // Solicitud directa de fotos, pruebas, backtests o capturas
  const asksProofOrResource = /\b(foto|fotos|captura|capturas|imagen|imagenes|prueba|pruebas|evidencia|resultado|resultados|backtest|backtesting|winrate)\b/.test(t) ||
    /\b(pasame|mandame|enviame|compartime|dame|acceso|link|enlace|archivo|material|recurso|discord)\b/.test(t) ||
    /\b(tendrias|tenes|tienes|mostrame|enseñame)\b.*\b(foto|captura|imagen|prueba)\b/.test(t);

  const related = chooseResource(resources, text, null, history);
  if (asksProofOrResource && related) return "resource_request";

  const farewell = /\b(chau|adios|nos vemos|hasta luego|gracias,? chau|listo,? gracias)\b/.test(t);
  const hasContinuation = /\?|\b(y por ultimo|pero|consulta|pregunta|tenes|tienes|podes|puedes|quisiera|quiero|necesito|como|donde|cual|que)\b/.test(t);
  if (farewell && !hasContinuation) return "close";

  if (/precio|comprar|contratar|pagar|plan|presupuesto|cotizacion/.test(t)) return "qualification";
  if (/gracias|listo|genial|perfecto|dale/.test(t) && t.split(/\s+/).length < 6) return "ack";

  return "discovery";
}

function nextStage(current: ConversationStage, intent: string): ConversationStage {
  if (intent === "close") return "closed";
  if (intent === "claim_missing_resource" || intent === "resource_request") return "resource_ready";
  if (current === "opening") return "discovery";
  if (current === "resource_sent") return "follow_up";
  return current === "closed" ? "closed" : current;
}

async function metaSend(account: any, recipientId: string, payload: any) {
  const r = await fetch(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${account.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: recipientId }, ...payload }),
    cache: "no-store"
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error || !j.message_id) throw new Error(j.error?.message || `Instagram send failed HTTP ${r.status}`);
  return j;
}

async function signed(path: string, seconds = 604800) {
  if (!path) return "";
  if (/^https:\/\//i.test(path)) return path;
  const s = await supabaseAdmin().storage.from("scheduled-media").createSignedUrl(path, seconds);
  return String(s.data?.signedUrl || "");
}

function attachmentType(r: any) {
  const m = norm(r?.mime_type), n = norm(`${r?.name || ""} ${r?.storage_path || ""}`);
  if (m.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp)/.test(n)) return "image";
  if (m.startsWith("video/") || /\.(mp4|mov)/.test(n)) return "video";
  if (m.startsWith("audio/") || /\.(mp3|m4a|aac|ogg)/.test(n)) return "audio";
  return "image"; // Fallback por defecto a imagen
}

async function deliverResource(db: any, event: InstagramConversationEvent, automationId: string, state: any, r: any) {
  const id = String(r?.id || "");
  if (!id) return { sent: false, messageId: "", error: "resource_id_missing" };
  
  state.resources_offered = uniq([...(state.resources_offered || []), id]);
  state.pending_resource_id = id;

  try {
    let j: any;
    if (r.kind === "url") {
      const value = String(r.external_url || "").trim();
      if (!value) throw new Error("resource_external_url_missing");
      j = await metaSend(event.account, event.contactId, { message: { text: value } });
    } else {
      const url = await signed(String(r.storage_path || ""));
      if (!url) throw new Error("resource_signed_url_missing");
      j = await metaSend(event.account, event.contactId, { message: { attachment: { type: attachmentType(r), payload: { url } } } });
    }
    const messageId = String(j.message_id || "");
    if (!messageId) throw new Error("resource_meta_message_id_missing");

    state.resources_sent = uniq([...(state.resources_sent || []), id]);
    state.pending_resource_id = null;
    state.current_stage = "resource_sent";

    await db.from("vyral_inbox_messages").insert({
      user_id: event.account.user_id,
      account_id: event.account.id,
      platform: "instagram",
      contact_id: event.contactId,
      message_id: messageId,
      body: r.kind === "url" ? String(r.external_url || "") : `[Adjunto enviado: ${r.name || id}]`,
      direction: "out",
      sender_type: "ai",
      automation_id: automationId,
      attachment_type: r.kind === "url" ? null : attachmentType(r)
    });

    return { sent: true, messageId, error: "" };
  } catch (err: any) {
    console.error("[VYRAL Instagram] Error al entregar adjunto:", { resourceId: id, error: String(err?.message || err) });
    return { sent: false, messageId: "", error: String(err?.message || err) };
  }
}

function chooseResource(pool: any[], text: string, pending?: string | null, history = "") {
  if (!pool || !pool.length) return null;
  if (pending) {
    const p = pool.find(r => String(r.id) === String(pending));
    if (p) return p;
  }
  // Si piden foto/prueba/backtest explícitamente y hay recursos cargados, asignamos el primero o el más acorde
  return pool[0] || null;
}

async function loadResources(userId: string, a: any) {
  if (a.resourceMode === "specific" && a.resourceUrl) {
    return [{
      id: "specific",
      name: a.resourceName || "recurso",
      kind: /^https?:/i.test(a.resourceUrl) ? "url" : "file",
      external_url: /^https?:/i.test(a.resourceUrl) ? a.resourceUrl : null,
      storage_path: /^https?:/i.test(a.resourceUrl) ? null : a.resourceUrl,
      purpose: a.resourcePurpose || "",
      send_when: a.resourceWhen || ""
    }];
  }
  const q = await supabaseAdmin().from("vyral_business_resources").select("id,name,kind,storage_path,external_url,mime_type,purpose,send_when").eq("user_id", userId).eq("enabled", true);
  return q.data || [];
}

async function generateText(a: any, event: InstagramConversationEvent, state: any, intent: string, attachmentConfirmed: boolean, resource: any, resources: any[], profile: any) {
  const key = process.env.VYRAL_CREATOR_PRODUCTION; 
  if (!key) return { text: "", sendResourceId: null as string | null, deliveryReason: "none" };

  const prompt = `Sos el asistente de Instagram DM de la marca.
Mensaje del usuario: "${event.text}"
Historial: ${event.history || "Sin historial previo"}
Adjunto enviado recién con éxito (attachment_confirmed): ${attachmentConfirmed}
Recurso/Imagen asociada: ${resource ? resource.name : "Ninguno"}

REGLAS OBLIGATORIAS DE ESTILO Y HUMANIZACIÓN:
1. PROHIBIDO EL ECO: NUNCA saludes ni repitas la misma frase inicial con la que el usuario abrió su mensaje (ejemplo: si dice "Cómo va amigo", NUNCA respondas "Cómo va, amigo" ni repitas sus palabras exactas).
2. CONCISIÓN EXTREMA: Sé natural, directo y cercano. Máximo 1 o 2 oraciones cortas. EVITÁ testamentos explicativos, listas o textos secos y largos.
3. REGLA FOTO/ADJUNTO: 
   - Si attachment_confirmed = TRUE: Hacé una referencia muy breve a la imagen que acaba de llegarle (ej: "Sí, obvio! Mirá, acá te dejo la captura de los resultados. ¿Qué te parece?").
   - Si attachment_confirmed = FALSE: NUNCA digas "ahí te dejé", "acá tenés la foto", ni hables como si se hubiera enviado una imagen. Responde de forma fluida y natural.

Respondé ÚNICAMENTE un JSON válido: {"text":"tu respuesta corta aquí","send_resource_id":null,"delivery_reason":"none"}`;

  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-5.6-luna", input: prompt, max_output_tokens: 300 }),
      signal: AbortSignal.timeout(12000)
    });
    const j = await r.json().catch(() => ({}));
    let raw = String(j.output_text || "");
    if (!raw) for (const x of j.output || []) for (const z of x.content || []) if (z.type === "output_text") raw += z.text || "";
    let cleaned = raw.trim(); if (cleaned.startsWith("~~~json")) cleaned = cleaned.slice(7); if (cleaned.endsWith("~~~")) cleaned = cleaned.slice(0, -3);
    const parsed = JSON.parse(cleaned.trim());
    return { text: String(parsed.text || "").trim(), sendResourceId: parsed.send_resource_id || null, deliveryReason: parsed.delivery_reason || "none" };
  } catch {
    return { text: "¡Hola! Sí, dale, decime en qué te puedo ayudar o qué necesitas ver.", sendResourceId: null, deliveryReason: "none" };
  }
}

export async function processInstagramConversationEvent(event: InstagramConversationEvent) {
  const db = supabaseAdmin(), a = event.automation, automationId = String(a.id || "");
  const key = { account_id: event.account.id, contact_id: event.contactId, automation_id: automationId };
  const found = await db.from("instagram_conversation_state").select("*").match(key).maybeSingle();
  
  let state: any = found.data || { ...key, user_id: event.account.user_id, thread_id: event.threadId || null, current_stage: "opening", origin: event.origin || "direct_dm", resources_offered: [], resources_sent: [], pending_resource_id: null };
  
  const resources = await loadResources(event.account.user_id, a);
  const intent = classifyIntent(event.text, resources, event.history || "");
  const profileQ = await db.from("vyral_bussines_profile").select("*").eq("user_id", String(event.account.user_id)).maybeSingle();
  const profile = profileQ.data || {};

  // Buscar el recurso relevante
  const resource = chooseResource(resources, event.text, state.pending_resource_id, event.history || "");

  let attachmentConfirmed = false;
  let resourceMessageId = "";
  let textMessageId = "";

  // 1. INTENTAR ENTREGAR EL RECURSO FÍSICO PRIMERO (SI EL USUARIO LO PIDE Y EXISTE EN LA BASE)
  if (resource && (intent === "resource_request" || intent === "claim_missing_resource" || /foto|captura|backtest|prueba/i.test(event.text))) {
    const delivery = await deliverResource(db, event, automationId, state, resource);
    if (delivery.sent) {
      attachmentConfirmed = true;
      resourceMessageId = delivery.messageId;
    }
  }

  // 2. GENERAR EL TEXTO CONOCIENDO EXACTAMENTE SI EL ARCHIVO SE ENVIÓ O NO
  const plan = await generateText(a, event, state, intent, attachmentConfirmed, resource, resources, profile);

  // 3. ENVIAR EL MENSAJE DE TEXTO A INSTAGRAM
  if (plan.text) {
    const metaRes = await metaSend(event.account, event.contactId, { message: { text: plan.text } });
    textMessageId = String(metaRes.message_id || "");
    await db.from("vyral_inbox_messages").insert({
      user_id: event.account.user_id,
      account_id: event.account.id,
      platform: "instagram",
      contact_id: event.contactId,
      message_id: textMessageId,
      body: plan.text,
      direction: "out",
      sender_type: "ai",
      automation_id: automationId
    });
  }

  await db.from("instagram_conversation_state").upsert({ ...state, updated_at: new Date().toISOString() }, { onConflict: "account_id,contact_id,automation_id" });

  return { success: true, textMessageId, resourceMessageId };
}
