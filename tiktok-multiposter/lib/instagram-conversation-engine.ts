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

function classifyIntent(text: string) {
  const t = norm(text);
  if (/no me (la|lo) (mandaste|enviaste|pasaste)|no (la|lo) veo|no aparece|no me aparece|no llego|no me llego|reenvi|otra vez|de nuevo/.test(t)) return "claim_missing_resource";
  const farewell = /\b(chau|adios|nos vemos|hasta luego|gracias,? chau|listo,? gracias)\b/.test(t);
  const hasContinuation = /\?|\b(y por ultimo|pero|consulta|pregunta|tenes|tienes|podes|puedes|quisiera|quiero|necesito|como|donde|cual|que)\b/.test(t);
  if (farewell && !hasContinuation) return "close";
  if (/precio|comprar|contratar|pagar|plan|presupuesto|cotizacion/.test(t)) return "qualification";
  if (/gracias|listo|genial|perfecto|dale/.test(t) && t.split(/\s+/).length < 6) return "ack";
  return "discovery";
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
  const m = norm(r?.mime_type), n = norm(`${r?.name || ""} ${r?.storage_path || ""} ${r?.external_url || ""}`);
  if (m.startsWith("image/") || /\.(png|jpg|jpeg|gif|webp)/.test(n)) return "image";
  if (m.startsWith("video/") || /\.(mp4|mov)/.test(n)) return "video";
  if (m.startsWith("audio/") || /\.(mp3|m4a|aac|ogg)/.test(n)) return "audio";
  return "image";
}

async function deliverResource(db: any, event: InstagramConversationEvent, automationId: string, state: any, r: any) {
  const id = String(r?.id || "");
  if (!id) return { sent: false, messageId: "", error: "resource_id_missing" };
  
  state.resources_offered = uniq([...(state.resources_offered || []), id]);
  state.pending_resource_id = id;

  try {
    let j: any;
    let deliveredUrl = "";
    if (r.kind === "url") {
      const value = String(r.external_url || "").trim();
      if (!value) throw new Error("resource_external_url_missing");
      j = await metaSend(event.account, event.contactId, { message: { text: value } });
    } else {
      const url = await signed(String(r.storage_path || ""), 604800);
      if (!url) throw new Error("resource_signed_url_missing");
      deliveredUrl = url;
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
      attachment_type: r.kind === "url" ? null : attachmentType(r),
      attachment_url: deliveredUrl || null,
      attachment_meta: r.kind === "url" ? {} : { resource_id: id, mime_type: r.mime_type || null, storage_path: r.storage_path || null }
    });

    return { sent: true, messageId, error: "" };
  } catch (err: any) {
    console.error("[VYRAL Instagram] Error al entregar adjunto:", { resourceId: id, error: String(err?.message || err) });
    return { sent: false, messageId: "", error: String(err?.message || err) };
  }
}

async function loadResources(userId: string, a: any) {
  if (a.resourceUrl) {
    const raw = String(a.resourceUrl || "").trim();
    const isExternal = /^https?:\/\//i.test(raw);
    return [{
      id: String(a.resourceId || "specific"),
      name: String(a.resourceName || "Adjunto"),
      kind: isExternal ? "url" : "file",
      storage_path: isExternal ? null : raw,
      external_url: isExternal ? raw : null,
      mime_type: a.resourceMimeType || null,
      purpose: String(a.resourcePurpose || ""),
      send_when: String(a.resourceWhen || "")
    }];
  }

  const q = await supabaseAdmin()
    .from("vyral_business_resources")
    .select("id,name,kind,storage_path,external_url,mime_type,purpose,send_when")
    .eq("user_id", userId)
    .eq("enabled", true);

  if (q.error) {
    console.error("[VYRAL Instagram] Error al cargar recursos:", q.error);
    return [];
  }
  return q.data || [];
}

async function generateText(a: any, event: InstagramConversationEvent, state: any, intent: string, attachmentConfirmed: boolean, resource: any, resources: any[], profile: any) {
  const key = process.env.VYRAL_CREATOR_PRODUCTION;
  if (!key) return { text: "", sendResourceId: null as string | null };

  const formattedResources = resources.length > 0
    ? resources.map((r: any) => `- ID: "${String(r.id)}"
  Nombre: "${String(r.name || "Sin nombre")}"
  Tipo: "${String(r.kind || (r.storage_path ? "file" : "url"))}" (file/url)
  Qué demuestra o contiene: "${String(r.purpose || "Sin descripción")}"
  Cuándo se debe enviar: "${String(r.send_when || "Sin condición")}"`).join("\n")
    : "No hay recursos disponibles.";

  const prompt = `Sos el asistente de Instagram DM de la marca.
Mensaje del usuario: "${event.text}"
Historial: ${event.history || "Sin historial previo"}
Intención conversacional orientativa: ${intent}
Adjunto enviado recién con éxito (attachment_confirmed): ${attachmentConfirmed}
already_sent_resource_ids: ${JSON.stringify(state.resources_sent || [])}

RECURSOS DISPONIBLES DEL NEGOCIO:
${formattedResources}

REGLAS DE SELECCIÓN Y ENTREGA DE RECURSOS:
1. Analizá el mensaje ACTUAL y el historial. Compará la intención con "Cuándo se debe enviar" y "Qué demuestra o contiene" de TODOS los recursos.
2. Si attachment_confirmed=true, este pase es SÓLO DE REDACCIÓN: devolvé siempre send_resource_id:null. Si attachment_confirmed=false y la solicitud coincide claramente con un recurso y corresponde entregarlo AHORA, devolvé su ID EXACTO en send_resource_id.
3. Si no coincide claramente con ninguno o todavía no corresponde enviarlo, devolvé send_resource_id: null.
3A. ANTI-REENVÍO: si el ID ya aparece en already_sent_resource_ids, devolvé send_resource_id:null. Sólo podés volver a elegirlo cuando el mensaje ACTUAL diga explícitamente que no llegó, no aparece o pida un reenvío/otra vez. Una pregunta sobre el contenido de un adjunto ya enviado NO autoriza reenviarlo.
4. Nunca inventes IDs. Sólo podés devolver uno de los IDs listados arriba.
5. attachment_confirmed describe una entrega que YA fue confirmada por Meta en este turno. Si es false, NUNCA afirmes ni insinúes que un adjunto/link ya fue enviado.
6. Si elegís send_resource_id en esta primera decisión, el backend intentará entregarlo después. Por eso el texto de esta decisión NO puede afirmar que ya llegó. La confirmación de entrega se redactará recién después de recibir message_id de Meta.
7. Si attachment_confirmed=true, el texto DEBE explicar brevemente qué acaba de recibir usando el nombre/purpose del recurso entregado. Prohibido responder con frases genéricas como "Decime qué necesitás ver" o equivalentes.
7A. ANTI-LOOP DE TEXTO: revisá especialmente los últimos 3 mensajes del Agente en el historial. No repitas frases, argumentos, beneficios ni explicaciones que ya usaste. Si una idea ya fue explicada, omitila o expresá sólo la información nueva.
8. PROHIBIDO EL ECO: no repitas ni parafrasees el saludo/apelativo con el que abrió el usuario.
9. CONCISIÓN EXTREMA: máximo 1 o 2 oraciones cortas, fluidas y directas.

FORMATO REQUERIDO — JSON estrictamente válido, sin markdown:
{"text":"respuesta corta","send_resource_id":null}
`;

  try {
    const r = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "gpt-5.6-luna", input: prompt, max_output_tokens: 300 }),
      signal: AbortSignal.timeout(12000)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j?.error?.message || `OpenAI HTTP ${r.status}`);
    let raw = String(j.output_text || "");
    if (!raw) for (const x of j.output || []) for (const z of x.content || []) if (z.type === "output_text") raw += z.text || "";
    let cleaned = raw.trim().replace(/^~~~json\s*/i, "").replace(/~~~$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    const candidate = parsed.send_resource_id == null ? null : String(parsed.send_resource_id);
    const validId = candidate && resources.some((r: any) => String(r.id) === candidate) ? candidate : null;
    return { text: String(parsed.text || "").trim(), sendResourceId: validId };
  } catch (err: any) {
    console.error("[VYRAL Instagram] Error al planificar respuesta:", String(err?.message || err));
    return { text: "Decime qué necesitás ver y te ayudo.", sendResourceId: null as string | null };
  }
}

export async function processInstagramConversationEvent(event: InstagramConversationEvent) {
  const db = supabaseAdmin(), a = event.automation, automationId = String(a.id || "");
  const key = { account_id: event.account.id, contact_id: event.contactId, automation_id: automationId };
  const found = await db.from("instagram_conversation_state").select("*").match(key).maybeSingle();

  let state: any = found.data || { ...key, user_id: event.account.user_id, thread_id: event.threadId || null, current_stage: "opening", origin: event.origin || "direct_dm", resources_offered: [], resources_sent: [], pending_resource_id: null };

  const resources = await loadResources(event.account.user_id, a);
  const intent = classifyIntent(event.text);
  const profileQ = await db.from("vyral_bussines_profile").select("*").eq("user_id", String(event.account.user_id)).maybeSingle();
  const profile = profileQ.data || {};

  let attachmentConfirmed = false;
  let resourceMessageId = "";
  let textMessageId = "";

  // GPT sees the complete catalog and returns one exact resource ID or null.
  const plan = await generateText(a, event, state, intent, false, null, resources, profile);
  const plannedResource = plan.sendResourceId
    ? resources.find((r: any) => String(r.id) === String(plan.sendResourceId))
    : null;
  const alreadySent = Boolean(plannedResource && (state.resources_sent || []).map(String).includes(String(plannedResource.id)));
  const explicitRetry = intent === "claim_missing_resource";
  const selectedResource = plannedResource && (!alreadySent || explicitRetry) ? plannedResource : null;

  let replyText = plan.text;

  if (plannedResource && alreadySent && !explicitRetry) {
    state.pending_resource_id = null;
    if (state.current_stage === "resource_ready") state.current_stage = "resource_sent";
  }

  if (selectedResource) {
    const delivery = await deliverResource(db, event, automationId, state, selectedResource);
    if (delivery.sent) {
      attachmentConfirmed = true;
      resourceMessageId = delivery.messageId;

      // Only after Meta returned message_id may the model say that delivery happened.
      const confirmation = await generateText(a, event, state, intent, true, selectedResource, resources, profile);
      if (confirmation.text) replyText = confirmation.text;
    } else {
      // Never send copy that could falsely imply successful delivery.
      replyText = "No pude adjuntarlo en este momento. Si querés, volvé a pedírmelo y lo intento de nuevo.";
    }
  }

  if (replyText) {
    const metaRes = await metaSend(event.account, event.contactId, { message: { text: replyText } });
    textMessageId = String(metaRes.message_id || "");
    await db.from("vyral_inbox_messages").insert({
      user_id: event.account.user_id,
      account_id: event.account.id,
      platform: "instagram",
      contact_id: event.contactId,
      message_id: textMessageId,
      body: replyText,
      direction: "out",
      sender_type: "ai",
      automation_id: automationId
    });
  }

  await db.from("instagram_conversation_state").upsert({ ...state, updated_at: new Date().toISOString() }, { onConflict: "account_id,contact_id,automation_id" });

  return {
    success: true,
    attachmentConfirmed,
    messageId: textMessageId || resourceMessageId || "",
    textMessageId,
    resourceMessageId,
    selectedResourceId: selectedResource ? String(selectedResource.id) : null
  };
}
