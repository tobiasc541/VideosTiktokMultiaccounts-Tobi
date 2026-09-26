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

function stageOfVoice(v: any): string {
  const explicit = norm(v?.stage); if (explicit) return explicit;
  const s = norm(`${v?.name || ""} ${v?.purpose || ""} ${v?.when || ""}`);
  if (/primer|inicio|opening|bienven|saludo/.test(s)) return "opening";
  if (/prueba|evidencia|backtest|resultado|win ?rate/.test(s)) return "proof";
  if (/recurso|link|acceso|discord|guia|pdf/.test(s)) return "resource_offer";
  if (/seguimiento|follow/.test(s)) return "follow_up";
  if (/cierre|closing|listo para entrar/.test(s)) return "closing";
  if (/pregunta|duda|topic/.test(s)) return "topic_answer";
  return "qualification";
}

function allowedOrigin(v: any, origin: ConversationOrigin) {
  const xs = Array.isArray(v?.allowed_origins) ? v.allowed_origins : Array.isArray(v?.allowedOrigins) ? v.allowedOrigins : [];
  return !xs.length || xs.includes(origin);
}

function tokens(v: any) { return norm(v).split(/[^a-z0-9]+/).filter((x: string) => x.length > 2); }
function semanticOverlap(a: any, b: any) {
  const A = new Set(tokens(a)), B = new Set(tokens(b));
  let n = 0; for (const x of A) if (B.has(x)) n++; return n;
}

function classifyIntent(text: string, resources: any[] = [], history = "") {
  const t = norm(text);
  const asksDelivery = /\b(como|donde)\b.*\b(uno|entro|accedo|ingreso|ingresar|consigo|obtengo|puedo|hago|explicas|compartis|muestras)\b|\b(pasame|mandame|enviame|compartime|dame|acceso|link|enlace|archivo|material|recurso|discord|comunidad|canal)\b/.test(t);
  const related = chooseResource(resources, text, null, history);
  if (asksDelivery && related) return "resource_request";

  const farewell = /\b(chau|adios|nos vemos|hasta luego|gracias,? chau|listo,? gracias)\b/.test(t);
  const hasContinuation = /\?|\b(y por ultimo|pero|consulta|pregunta|tenes|tienes|podes|puedes|quisiera|quiero|necesito|como|donde|cual|que)\b/.test(t);
  if (farewell && !hasContinuation) return "close";

  if (/no me (la|lo) (mandaste|enviaste|pasaste)|no (la|lo) veo|no aparece|no me aparece|no llego|no me llego|reenvi|otra vez|de nuevo/.test(t)) return "claim_missing_resource";
  if (/precio|comprar|contratar|pagar|plan|presupuesto|cotizacion/.test(t)) return "qualification";
  if (/gracias|listo|genial|perfecto|dale/.test(t) && t.split(/\s+/).length < 6) return "ack";

  return "discovery";
}

function nextStage(current: ConversationStage, intent: string): ConversationStage {
  if (intent === "close") return "closed";
  if (intent === "high_intent" || intent === "claim_missing_resource" || intent === "proof_request" || intent === "resource_request") return "resource_ready";
  if (current === "opening") return "discovery";
  if (current === "resource_sent") return "follow_up";
  if (intent === "qualification") return "qualification";
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
  return "file";
}

async function deliverResource(db: any, event: InstagramConversationEvent, automationId: string, state: any, r: any) {
  const id = String(r?.id || "");
  if (!id) return { sent: false, messageId: "", error: "resource_id_missing" };
  
  state.resources_offered = uniq([...(state.resources_offered || []), id]);
  state.pending_resource_id = id;
  state.current_stage = "resource_ready";

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
      body: r.kind === "url" ? String(r.external_url || "") : `[Recurso enviado: ${r.name || id}]`,
      direction: "out",
      sender_type: "ai",
      automation_id: automationId,
      attachment_type: r.kind === "url" ? null : attachmentType(r)
    });

    return { sent: true, messageId, error: "" };
  } catch (err: any) {
    state.pending_resource_id = id;
    state.current_stage = "resource_ready";
    console.error("[VYRAL Instagram] resource delivery failed", { resourceId: id, resourceName: r?.name, kind: r?.kind, error: String(err?.message || err) });
    return { sent: false, messageId: "", error: String(err?.message || err) };
  }
}

function resourceScore(r: any, text: string, history = "") {
  const meta = `${r?.name || ""} ${r?.purpose || ""} ${r?.send_when || ""}`;
  const current = semanticOverlap(text, meta);
  const context = semanticOverlap(history, meta);
  return current * 4 + Math.min(context, 3);
}

function chooseResource(pool: any[], text: string, pending?: string | null, history = "") {
  if (pending) {
    const p = pool.find(r => String(r.id) === String(pending));
    if (p) return p;
  }
  let best: any = null, bestScore = 0, second = 0;
  for (const r of pool) {
    const s = resourceScore(r, text, history);
    if (s > bestScore) { second = bestScore; bestScore = s; best = r; }
    else if (s > second) second = s;
  }
  return bestScore >= 4 && bestScore > second ? best : pool[0] || null;
}

function chooseStageVoice(a: any, state: any, intent: string, isFirstTouch = false, currentMessage = "", resourceDeliveryConfirmed = false) {
  if (!a?.voiceEnabled) return null;
  const all = (Array.isArray(a.voiceAssets) ? a.voiceAssets : []).filter((v: any) => v?.url);
  const sent = new Set((state.voice_assets_sent || []).map(String));
  const first = isFirstTouch && sent.size === 0;
  const role = first ? "opening" : intent === "proof_request" ? "proof" : state.current_stage === "follow_up" ? "follow_up" : state.current_stage;
  if (role === "resource_ready" || role === "resource_offer") return null;
  if (role === "resource_sent" && !resourceDeliveryConfirmed) return null;
  const candidates = all.filter((v: any) => stageOfVoice(v) === role && allowedOrigin(v, state.origin) && (!sent.has(String(v.id)) || v.is_reusable === true));
  if (first) return candidates[0] || null;
  if (!candidates.length) return null;
  const message = String(currentMessage || "").trim();
  if (!message) return null;
  let best: any = null, bestScore = 0;
  for (const v of candidates) {
    const voiceMeaning = `${v.when || ""} ${v.purpose || ""} ${v.transcript || ""} ${v.name || ""}`;
    const score = semanticOverlap(message, voiceMeaning);
    if (score > bestScore) { best = v; bestScore = score; }
  }
  return bestScore >= 2 ? best : null;
}

async function loadResources(userId: string, a: any) {
  if (a.resourceMode === "specific" && a.resourceUrl) return [{ id: "specific", name: a.resourceName || "recurso", kind: /^https?:/i.test(a.resourceUrl) ? "url" : "file", external_url: /^https?:/i.test(a.resourceUrl) ? a.resourceUrl : null, storage_path: /^https?:/i.test(a.resourceUrl) ? null : a.resourceUrl, purpose: a.resourcePurpose || "", send_when: a.resourceWhen || "" }];
  const q = await supabaseAdmin().from("vyral_business_resources").select("id,name,kind,storage_path,external_url,mime_type,purpose,send_when").eq("user_id", userId).eq("enabled", true);
  return (q.data || []).filter((r: any) => !Array.isArray(a.businessResourceIds) || !a.businessResourceIds.length || a.businessResourceIds.includes(r.id));
}

async function generateText(a: any, event: InstagramConversationEvent, state: any, intent: string, attachmentConfirmed: boolean, resource: any, resources: any[], profile: any) {
  const key = process.env.VYRAL_CREATOR_PRODUCTION; if (!key) return { text: "", sendResourceId: null as string | null, deliveryReason: "none" };
  const catalog = (resources || []).map((r: any) => ({ id: String(r.id), name: r.name, purpose: r.purpose, send_when: r.send_when, kind: r.kind, already_sent: Boolean(state.resources_sent?.includes(String(r.id))), already_offered: Boolean(state.resources_offered?.includes(String(r.id))) }));
  const prompt = `Sos el cerebro conversacional multirrubro de VYRAL para Instagram DM. Razoná por significado, no por coincidencia literal.
Etapa: ${state.current_stage}. Intención: ${intent}. Origen: ${state.origin}.
Contexto/publicación: ${JSON.stringify(state.context_payload || {})} ${String(a.contentLabel || "")}
Historial: ${event.history || "Sin historial"}
Mensaje nuevo: ${event.text}
BUSINESS BRAIN: ${JSON.stringify(profile || {})}
RECURSOS REALES: ${JSON.stringify(catalog)}
Recurso relacionado: ${resource ? JSON.stringify({ id: String(resource.id), name: resource.name, purpose: resource.purpose, send_when: resource.send_when }) : "ninguno"}
attachment_confirmed=${attachmentConfirmed}
CONTRATO DE PRESENTACIÓN DEL RECURSO: si attachment_confirmed=true y existe Recurso relacionado, text DEBE contextualizar explícitamente el recurso que acaba de entregarse. Si attachment_confirmed=false, NUNCA digas "ahí te dejé", "te pasé", "te mandé" ni hables en pasado sobre la entrega de un recurso en este turno.
REGLAS DE ORO DE VOCABULARIO Y TONO HUMANO: nunca expongas jerga interna del sistema. En el mensaje al usuario están prohibidas palabras como "recurso", "lead magnet" y expresiones robóticas como "el recurso que te compartí" o "recurso relacionado".
ANTI-REPETICIÓN CONVERSACIONAL: si already_sent=true, no vuelvas a seleccionar ese elemento por agradecimientos, entusiasmo, "me voy a unir", "me sirve", confirmaciones ni continuidad temática. Sólo seleccioná nuevamente el mismo ID si el usuario comunica que no llegó/no aparece o pide realmente que se lo reenvíen; en ese caso delivery_reason=retry_missing.
Respondé SOLO JSON válido: {"text":"respuesta final","send_resource_id":null,"delivery_reason":"none"}.`;

  async function request(input: string, maxTokens = 650) {
    const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-5.6-luna", input, max_output_tokens: maxTokens }), signal: AbortSignal.timeout(15000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, raw: "", incomplete: false };
    let raw = String(j.output_text || "");
    if (!raw) for (const x of j.output || []) for (const z of x.content || []) if (z.type === "output_text") raw += z.text || "";
    return { ok: true, raw: raw.trim(), incomplete: Boolean(j.status === "incomplete" || j.incomplete_details || j.output?.some?.((x: any) => x.status === "incomplete")) };
  }

  const parse = (raw: string) => {
    try {
      let x = raw.trim(); if (x.startsWith("~~~json")) x = x.slice(7); if (x.endsWith("~~~")) x = x.slice(0, -3);
      const p = JSON.parse(x.trim());
      return { text: String(p.text || "").trim(), sendResourceId: p.send_resource_id == null ? null : String(p.send_resource_id), deliveryReason: ["proactive_value", "first_delivery", "new_need", "explicit_request", "retry_missing", "none"].includes(String(p.delivery_reason)) ? String(p.delivery_reason) : "none" };
    } catch { return { text: "", sendResourceId: null as string | null, deliveryReason: "none" }; }
  };

  const complete = (x: string) => Boolean(x && /[.!?…]$/.test(x.trim()));
  let res = await request(prompt), generated = parse(res.raw);
  if (!res.ok || res.incomplete || !complete(generated.text)) {
    res = await request(prompt + "\\nLa salida anterior fue inválida o incompleta. Generá nuevamente el JSON completo desde cero.", 800);
    generated = parse(res.raw);
  }
  if (!res.ok || res.incomplete || !complete(generated.text)) return { text: "", sendResourceId: null as string | null, deliveryReason: "none" };
  if (generated.sendResourceId && !resources.some((r: any) => String(r.id) === generated.sendResourceId)) generated.sendResourceId = null;
  return generated;
}

async function validateReplyBeforeSend(event: InstagramConversationEvent, state: any, resources: any[], profile: any, reply: string) {
  const text = String(reply || "").trim(), key = process.env.VYRAL_CREATOR_PRODUCTION; if (!text || !key) return text;
  const db = supabaseAdmin(), started = String(state.context_payload?.session_started_at || "");
  let q = db.from("vyral_inbox_messages").select("body,attachment_type,attachment_meta,created_at").eq("account_id", event.account.id).eq("contact_id", event.contactId).eq("automation_id", String(event.automation?.id || "")).eq("direction", "out");
  if (started) q = q.gte("created_at", started);
  const evidenceQ = await q.order("created_at", { ascending: true }).limit(60);
  const evidence = (evidenceQ.data || []).map((x: any) => ({ body: String(x.body || ""), attachment_type: x.attachment_type || null, attachment_meta: x.attachment_meta || {}, created_at: x.created_at }));
  const sentIds = (state.resources_sent || []).map(String);
  const sentResources = (resources || []).filter((r: any) => sentIds.includes(String(r.id))).map((r: any) => ({ id: String(r.id), name: r.name, kind: r.kind, purpose: r.purpose }));

  const prompt = `Sos el verificador final de una respuesta de Instagram DM. Auditá y corregí la RESPUESTA PROPUESTA antes de enviarla.
RESPUESTA PROPUESTA: ${text}
ÚLTIMO MENSAJE DEL USUARIO: ${String(event.text || "")}
EVIDENCIA REAL DE ESTA ACTIVACIÓN: ${JSON.stringify(evidence)}
RECURSOS CONFIRMADOS COMO ENVIADOS EN ESTA ACTIVACIÓN: ${JSON.stringify(sentResources)}
BUSINESS BRAIN: ${JSON.stringify(profile || {})}
REGLA CENTRAL: toda afirmación sobre hechos o acciones pasadas debe estar demostrada por la evidencia. Si la evidencia no muestra un recurso enviado recien, prohibido decir "ahí te dejé" o "te lo mandé".
Respondé SOLO JSON válido: {"valid":true,"text":"respuesta final"}.`;

  try {
    const r = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: "gpt-5.6-luna", input: prompt, max_output_tokens: 650 }), signal: AbortSignal.timeout(15000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return text;
    let raw = String(j.output_text || "");
    if (!raw) for (const x of j.output || []) for (const z of x.content || []) if (z.type === "output_text") raw += z.text || "";
    let cleaned = raw.trim(); if (cleaned.startsWith("~~~json")) cleaned = cleaned.slice(7); if (cleaned.endsWith("~~~")) cleaned = cleaned.slice(0, -3);
    const parsed = JSON.parse(cleaned.trim()), checked = String(parsed.text || "").trim();
    return checked && /[.!?…]$/.test(checked) ? checked : text;
  } catch { return text; }
}

export async function processInstagramConversationEvent(event: InstagramConversationEvent) {
  const db = supabaseAdmin(), a = event.automation, automationId = String(a.id || "");
  const key = { account_id: event.account.id, contact_id: event.contactId, automation_id: automationId };
  const found = await db.from("instagram_conversation_state").select("*").match(key).maybeSingle();
  
  const newActivation = !found.data;
  const freshState = { ...key, user_id: event.account.user_id, thread_id: event.threadId || null, current_stage: "opening", origin: event.origin || "direct_dm", context_payload: { ...(event.contextPayload || {}), session_started_at: new Date().toISOString(), activation_message_id: String(event.messageId || "") }, last_question_asked: null, last_audio_id: null, voice_assets_sent: [], resources_offered: [], resources_sent: [], pending_resource_id: null, last_intent: null };
  const isFirstTouch = !found.data;
  let state: any = found.data || freshState;
  const sessionEvent: InstagramConversationEvent = newActivation ? { ...event, history: "" } : event;
  
  const resources = await loadResources(event.account.user_id, a);
  const intent = classifyIntent(sessionEvent.text, resources, sessionEvent.history || "");
  const profileQ = await db.from("vyral_bussines_profile").select("*").eq("user_id", String(event.account.user_id)).maybeSingle();
  const profile = profileQ.data || {};
  
  let resource: any = null;
  if (intent === "claim_missing_resource") {
    if (state.pending_resource_id) resource = resources.find((r: any) => String(r.id) === String(state.pending_resource_id)) || null;
    if (!resource && state.resources_offered?.length) {
      const lastOffered = String(state.resources_offered[state.resources_offered.length - 1]);
      resource = resources.find((r: any) => String(r.id) === lastOffered) || null;
    }
  } else {
    resource = chooseResource(resources, sessionEvent.text, state.pending_resource_id, sessionEvent.history || "");
  }

  const wantsResource = ["resource_request", "claim_missing_resource"].includes(intent) && Boolean(resource);
  state.last_intent = intent;
  state.current_stage = nextStage(state.current_stage, intent);
  if (wantsResource) {
    state.pending_resource_id = String(resource.id);
    state.resources_offered = uniq([...(state.resources_offered || []), resource.id]);
  }
  await db.from("instagram_conversation_state").upsert({ ...state, updated_at: new Date().toISOString() }, { onConflict: "account_id,contact_id,automation_id" });

  let attachmentConfirmed = false, resourceMessageId = "", textMessageId = "", reply = "", brainResource: any = null;

  // 1. PRIMER PLAN DE LA IA
  let plan = await generateText(a, sessionEvent, state, intent, false, resource, resources, profile);

  if (plan.sendResourceId) {
    const candidate = resources.find((r: any) => String(r.id) === String(plan.sendResourceId)) || null;
    if (candidate) {
      brainResource = candidate;
      state.pending_resource_id = String(candidate.id);
      state.resources_offered = uniq([...(state.resources_offered || []), String(candidate.id)]);
      state.current_stage = "resource_ready";
    } else {
      plan.sendResourceId = null;
      plan.deliveryReason = "none";
    }
  }

  // 2. CONTROL DE ENTREGA FÍSICA INEQUÍVOCA
  const plannedResource = wantsResource ? resource : brainResource;
  const plannedId = String(plannedResource?.id || "");
  const alreadyDelivered = Boolean(plannedId && state.resources_sent?.map(String).includes(plannedId));
  const explicitRetry = intent === "claim_missing_resource";

  // Si NUNCA fue entregado, o si es un reclamo explícito, SE ENVÍA. Si ya fue entregado y no es un reclamo, SE BLOQUEA.
  const actionResource = plannedResource && (!alreadyDelivered || explicitRetry) ? plannedResource : null;

  if (plannedResource && alreadyDelivered && !explicitRetry) {
    state.pending_resource_id = null;
    if (state.current_stage === "resource_ready") state.current_stage = "resource_sent";
  }

  // 3. EJECUCIÓN FÍSICA EN META INSTAGRAM
  if (actionResource) {
    const delivery = await deliverResource(db, sessionEvent, automationId, state, actionResource);
    if (delivery.sent) {
      attachmentConfirmed = true;
      resourceMessageId = delivery.messageId;
    }
  }

  // 4. RE-GENERACIÓN DEL TEXTO SI HUBO ENTREGA EFECTIVA O BLOQUEO
  // Si la entrega física fue exitosa, forzamos generateText con attachmentConfirmed = true.
  // Si no se envió nada (por deduplicación), se asegura attachmentConfirmed = false.
  if (attachmentConfirmed || (plan.sendResourceId && !actionResource)) {
    const refreshedPlan = await generateText(a, sessionEvent, state, intent, attachmentConfirmed, actionResource || plannedResource, resources, profile);
    reply = refreshedPlan.text;
  } else {
    reply = plan.text;
  }

  // 5. AUDITORÍA FINAL ANTES DE ENVIAR EL TEXTO
  const validatedText = await validateReplyBeforeSend(sessionEvent, state, resources, profile, reply);

  if (validatedText) {
    const metaRes = await metaSend(event.account, event.contactId, { message: { text: validatedText } });
    textMessageId = String(metaRes.message_id || "");
    await db.from("vyral_inbox_messages").insert({
      user_id: event.account.user_id,
      account_id: event.account.id,
      platform: "instagram",
      contact_id: event.contactId,
      message_id: textMessageId,
      body: validatedText,
      direction: "out",
      sender_type: "ai",
      automation_id: automationId
    });
  }

  await db.from("instagram_conversation_state").upsert({ ...state, updated_at: new Date().toISOString() }, { onConflict: "account_id,contact_id,automation_id" });

  return { 
    success: true, 
    textMessageId, 
    resourceMessageId, 
    messageId: textMessageId || resourceMessageId || "" 
  };
}
