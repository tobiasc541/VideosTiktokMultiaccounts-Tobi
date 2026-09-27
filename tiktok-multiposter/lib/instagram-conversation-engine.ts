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

type ResourceAction = "NONE" | "SEND" | "RESEND";
type DeliveryStatus = "none" | "delivered" | "already_sent" | "failed";

function formattedResources(resources:any[]){
  return resources.length?resources.map((r:any)=>`- ID: "${String(r.id)}"
  Nombre: "${String(r.name||"Sin nombre")}"
  Tipo: "${String(r.kind||(r.storage_path?"file":"url"))}"
  Qué demuestra o contiene: "${String(r.purpose||"Sin descripción")}"
  Cuándo se debe enviar: "${String(r.send_when||"Sin condición")}"`).join("\n"):"No hay recursos disponibles.";
}

async function openAiJson(prompt:string,maxOutputTokens=300){
  const key=process.env.VYRAL_CREATOR_PRODUCTION;
  if(!key)throw new Error("openai_key_missing");
  const r=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,max_output_tokens:maxOutputTokens}),
    signal:AbortSignal.timeout(12000)
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j?.error?.message||`OpenAI HTTP ${r.status}`);
  let raw=String(j.output_text||"");
  if(!raw)for(const x of j.output||[])for(const z of x.content||[])if(z.type==="output_text")raw+=z.text||"";
  return JSON.parse(raw.trim().replace(/^~~~json\s*/i,"").replace(/~~~$/i,"").trim());
}

/**
 * RESOURCE DECISION ENGINE
 * Decides only whether a resource action exists. It never writes user-facing copy.
 * Style/tone rules cannot influence execution anymore.
 */
async function decideResourceAction(event:InstagramConversationEvent,state:any,resources:any[]){
  if(!resources.length)return{action:"NONE" as ResourceAction,resourceId:null as string|null};
  const prompt=`Tu única tarea es decidir si el mensaje ACTUAL requiere entregar un recurso real.
No redactes una respuesta al usuario. No hagas conversación.

MENSAJE ACTUAL:
${event.text}

HISTORIAL:
${event.history||"Sin historial previo"}

RECURSOS DISPONIBLES:
${formattedResources(resources)}

IDS YA ENTREGADOS EN ESTA ACTIVACIÓN:
${JSON.stringify(state.resources_sent||[])}

REGLAS:
- Compará semánticamente el mensaje actual + historial con "Cuándo se debe enviar" y "Qué demuestra o contiene".
- SEND: el usuario pide acceso, link, archivo, prueba, muestra, evidencia o algo que coincide claramente con la condición de un recurso y ese recurso todavía no fue entregado.
- RESEND: únicamente cuando el usuario actual indica que no lo recibió/no aparece o pide explícitamente que se lo vuelvan a enviar.
- NONE: conversación, agradecimiento, preguntas sobre algo ya visto, o cuando no corresponde entregar nada.
- Una pregunta como "cómo me uno/entro/accedo" sí requiere SEND si existe un recurso de acceso pertinente y todavía no fue entregado.
- No selecciones por simple afinidad temática. Tiene que existir intención real de recibir/usar/ver el recurso o una condición send_when inequívoca.
- Nunca inventes IDs.

JSON estricto:
{"action":"NONE|SEND|RESEND","resource_id":null}`;
  try{
    const parsed=await openAiJson(prompt,180);
    const candidate=parsed.resource_id==null?null:String(parsed.resource_id);
    const validId=candidate&&resources.some((r:any)=>String(r.id)===candidate)?candidate:null;
    const rawAction=String(parsed.action||"NONE").toUpperCase();
    const action:ResourceAction=rawAction==="SEND"||rawAction==="RESEND"?rawAction:"NONE";
    if(!validId||action==="NONE")return{action:"NONE" as ResourceAction,resourceId:null};
    return{action,resourceId:validId};
  }catch(err:any){
    console.error("[VYRAL Instagram] Error al decidir recurso:",String(err?.message||err));
    return{action:"NONE" as ResourceAction,resourceId:null};
  }
}

/**
 * RESPONSE WRITER
 * Writes only from the executor result. It cannot select or trigger resources.
 */
async function writeConversationReply(event:InstagramConversationEvent,intent:string,profile:any,resource:any,status:DeliveryStatus){
  const resourceContext=resource?JSON.stringify({name:String(resource.name||""),kind:String(resource.kind||""),purpose:String(resource.purpose||""),send_when:String(resource.send_when||"")}):"ninguno";
  const prompt=`Sos el cerebro conversacional de Instagram de este negocio. Conversá con la comprensión, continuidad y criterio de un excelente asistente humano que conoce profundamente la empresa.
No sos un bot de respuestas prearmadas ni un árbol de automatizaciones. Tu única responsabilidad es comprender y REDACTAR; jamás decidís ni ejecutás acciones externas.

FUENTE DE VERDAD DEL NEGOCIO (BRAND BRAIN):
${JSON.stringify(profile||{})}

CONTEXTO DE ORIGEN:
${JSON.stringify(event.contextPayload||{})}

HISTORIAL RECIENTE DE LA CONVERSACIÓN:
${event.history||"Sin historial previo"}

MENSAJE ACTUAL DEL USUARIO:
${event.text}

INTENCIÓN ORIENTATIVA DEL SISTEMA:
${intent}

RESULTADO INMUTABLE DEL EJECUTOR:
delivery_status=${status}
resource=${resourceContext}

CÓMO PENSAR LA CONVERSACIÓN:
1. Entendé primero qué quiso comunicar o conseguir la persona AHORA. Contestá esa intención concreta antes de intentar avanzar la conversación.
2. Usá el Brand Brain como conocimiento privado y fuente factual del negocio. Integralo naturalmente; nunca recites campos ni digas que consultaste un perfil.
3. Usá el historial como memoria semántica. Recordá qué preguntó, qué respondió el agente, qué ya quedó claro, qué está pendiente y el tono de la conversación.
4. No repitas información ya comunicada salvo que el usuario pida aclararla, repetirla o exista una necesidad real de desambiguación. Parafrasear la misma idea también cuenta como repetición.
5. Adaptate a la persona: idioma, registro, formalidad, vocabulario, longitud y nivel técnico. Si escribe corto, normalmente respondé corto. Si hace una pregunta técnica o pide explicación, desarrollá lo necesario sin convertirlo en un ensayo.
6. Soná humano y contextual. Evitá muletillas de bot, cierres automáticos, preguntas de seguimiento innecesarias y frases genéricas. No termines cada turno con una pregunta.
7. Si falta un dato del negocio, no lo inventes. Podés reconocer el límite de manera natural o hacer UNA pregunta concreta sólo si realmente es necesaria para responder.
8. No fuerces ventas, recursos ni CTAs. Si corresponde continuar conversando, continuá. Si la respuesta ya está completa, terminá ahí.
9. No hagas eco del saludo ni copies la frase del usuario como introducción.
10. Respetá especialmente brand_voice, words_to_use y words_to_avoid cuando existan. Si no existen, inferí un tono natural del historial.

VERDAD SOBRE ACCIONES Y ENTREGAS:
- delivered = Meta confirmó message_id en ESTE turno. Sólo entonces podés hablar de algo que acaba de enviarse.
- already_sent = ya había sido entregado antes. No digas que acabás de enviarlo ni que lo reenviás.
- failed = el intento de entrega falló. No afirmes ni insinúes éxito.
- none = no hubo entrega en este turno. Está prohibido afirmar o insinuar "te lo pasé", "ahí está", "tocá el link que te mandé", "te adjunto", "te envié" o equivalentes.
- Si delivered y el historial ya explicó qué contiene/para qué sirve, limitate a una confirmación o CTA mínima; no vuelvas a vender ni explicar lo mismo.
- Si delivered y el recurso todavía necesita contexto para que el usuario entienda qué recibió, agregá sólo el contexto nuevo imprescindible.
- JAMÁS copies, reconstruyas ni escribas URLs, dominios, enlaces markdown o direcciones web de recursos. Los enlaces los entrega exclusivamente el backend.
- No uses frente al cliente jerga interna como "recurso", "asset", "lead magnet", "send_when", "Brand Brain" o nombres de estados internos.

LONGITUD:
- Conversación cotidiana, confirmaciones y preguntas simples: preferí 1–2 oraciones.
- Preguntas técnicas, explicativas o comparativas: usá las oraciones necesarias para responder bien, normalmente 2–5.
- Nunca alargues una respuesta sólo para parecer útil.

CONTROL FINAL ANTES DE RESPONDER:
Preguntate silenciosamente: ¿respondí lo que realmente preguntó?, ¿estoy repitiendo algo que ya sabe?, ¿inventé algún dato?, ¿afirmé una acción que el ejecutor no confirmó?, ¿suena como esta marca hablando con esta persona? Corregí cualquiera de esos problemas antes de devolver el JSON.

Devolvé únicamente JSON válido:
{"text":"respuesta final al usuario"}`;
  try{
    const parsed=await openAiJson(prompt,520);
    const text=String(parsed.text||"").trim();
    if(text)return text;
    throw new Error("writer_empty_text");
  }catch(firstErr:any){
    console.error("[VYRAL Instagram] Primer intento de redacción falló:",String(firstErr?.message||firstErr));
    try{
      const retryPrompt=prompt+`\n\nREINTENTO TÉCNICO: la salida anterior no pudo procesarse. Conservá exactamente el mismo razonamiento conversacional y devolvé únicamente JSON válido con una propiedad text no vacía. No simplifiques a una respuesta genérica.`;
      const parsed=await openAiJson(retryPrompt,600);
      const text=String(parsed.text||"").trim();
      if(text)return text;
      throw new Error("writer_retry_empty_text");
    }catch(secondErr:any){
      console.error("[VYRAL Instagram] Segundo intento de redacción falló; se suprime el DM para no exponer un fallback al cliente.",{
        firstError:String(firstErr?.message||firstErr),
        secondError:String(secondErr?.message||secondErr),
        deliveryStatus:status,
        resourceId:resource?.id?String(resource.id):null,
        contactId:event.contactId
      });
      return"";
    }
  }
}

export async function processInstagramConversationEvent(event: InstagramConversationEvent) {
  const db=supabaseAdmin(),a=event.automation,automationId=String(a.id||"");
  const key={account_id:event.account.id,contact_id:event.contactId,automation_id:automationId};
  const found=await db.from("instagram_conversation_state").select("*").match(key).maybeSingle();
  let state:any=found.data||{...key,user_id:event.account.user_id,thread_id:event.threadId||null,current_stage:"opening",origin:event.origin||"direct_dm",resources_offered:[],resources_sent:[],pending_resource_id:null};

  const resources=await loadResources(event.account.user_id,a);
  const intent=classifyIntent(event.text);
  const profileQ=await db.from("vyral_bussines_profile").select("*").eq("user_id",String(event.account.user_id)).maybeSingle();
  const profile=profileQ.data||{};

  // Phase 1: action decision. No user-facing prose exists here.
  const decision=await decideResourceAction(event,state,resources);
  const decidedResource=decision.resourceId?resources.find((r:any)=>String(r.id)===decision.resourceId)||null:null;
  const alreadySent=Boolean(decidedResource&&(state.resources_sent||[]).map(String).includes(String(decidedResource.id)));

  // Phase 2: deterministic executor. Only this phase can physically send a resource.
  let deliveryStatus:DeliveryStatus="none";
  let resourceMessageId="";
  let executedResource:any=null;

  if(decidedResource){
    if(decision.action==="RESEND"){
      const delivery=await deliverResource(db,event,automationId,state,decidedResource);
      executedResource=decidedResource;
      deliveryStatus=delivery.sent?"delivered":"failed";
      resourceMessageId=delivery.messageId||"";
    }else if(decision.action==="SEND"&&!alreadySent){
      const delivery=await deliverResource(db,event,automationId,state,decidedResource);
      executedResource=decidedResource;
      deliveryStatus=delivery.sent?"delivered":"failed";
      resourceMessageId=delivery.messageId||"";
    }else if(decision.action==="SEND"&&alreadySent){
      executedResource=decidedResource;
      deliveryStatus="already_sent";
      state.pending_resource_id=null;
      if(state.current_stage==="resource_ready")state.current_stage="resource_sent";
    }
  }

  // Phase 3: copy only. The writer cannot create/cancel/alter the action above.
  const replyText=await writeConversationReply(event,intent,profile,executedResource,deliveryStatus);
  let textMessageId="";
  if(replyText){
    const metaRes=await metaSend(event.account,event.contactId,{message:{text:replyText}});
    textMessageId=String(metaRes.message_id||"");
    await db.from("vyral_inbox_messages").insert({
      user_id:event.account.user_id,account_id:event.account.id,platform:"instagram",contact_id:event.contactId,
      message_id:textMessageId,body:replyText,direction:"out",sender_type:"ai",automation_id:automationId
    });
  }

  await db.from("instagram_conversation_state").upsert({...state,updated_at:new Date().toISOString()},{onConflict:"account_id,contact_id,automation_id"});

  return{
    success:true,
    attachmentConfirmed:deliveryStatus==="delivered",
    messageId:textMessageId||resourceMessageId||"",
    textMessageId,
    resourceMessageId,
    selectedResourceId:executedResource?String(executedResource.id):null,
    resourceAction:decision.action,
    deliveryStatus
  };
}
