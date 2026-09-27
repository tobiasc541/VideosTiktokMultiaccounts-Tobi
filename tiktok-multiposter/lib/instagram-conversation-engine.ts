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

type DeliveryStatus = "none" | "delivered" | "already_sent" | "failed";

function formattedResources(resources:any[]){
  return resources.length?resources.map((r:any)=>`- ID: "${String(r.id)}"
  Nombre: "${String(r.name||"Sin nombre")}"
  Tipo: "${String(r.kind||(r.storage_path?"file":"url"))}"
  Contenido/propósito: "${String(r.purpose||"Sin descripción")}"
  Cuándo corresponde entregarlo: "${String(r.send_when||"Sin condición")}"`).join("\n"):"No hay recursos disponibles.";
}

function parseAiJson(rawValue:any){
  const raw=String(rawValue||"").trim();
  if(!raw)throw new Error("openai_empty_output");
  const unfenced=raw.replace(/^\s*(?:```|~~~)(?:json)?\s*/i,"").replace(/\s*(?:```|~~~)\s*$/i,"").trim();
  try{return JSON.parse(unfenced)}catch(firstErr){
    const start=unfenced.indexOf("{"),end=unfenced.lastIndexOf("}");
    if(start>=0&&end>start){try{return JSON.parse(unfenced.slice(start,end+1))}catch{}}
    throw new Error(`openai_invalid_json: ${String((firstErr as any)?.message||firstErr)}`);
  }
}

async function openAiJson(prompt:string,maxOutputTokens=700){
  const key=process.env.VYRAL_CREATOR_PRODUCTION;
  if(!key)throw new Error("openai_key_missing");
  const r=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,max_output_tokens:maxOutputTokens,text:{format:{type:"json_object"}}}),
    signal:AbortSignal.timeout(15000)
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j?.error?.message||`OpenAI HTTP ${r.status}`);
  let raw=String(j.output_text||"");
  if(!raw)for(const x of j.output||[])for(const z of x.content||[])if(z.type==="output_text")raw+=z.text||"";
  return parseAiJson(raw);
}

async function runConversationAgent(event:InstagramConversationEvent,profile:any,resources:any[],state:any){
  const prompt=`Sos el agente conversacional de Instagram de este negocio. Tenés libertad para conversar como un excelente humano especializado en esta empresa.

BRAND BRAIN (fuente factual privada):
${JSON.stringify(profile||{})}

CONTEXTO DE LA PUBLICACIÓN/HISTORIA QUE ORIGINÓ LA CONVERSACIÓN:
${JSON.stringify(event.contextPayload||{})}

HISTORIAL RECIENTE:
${event.history||"Sin historial previo"}

MENSAJE ACTUAL:
${event.text}

RECURSOS REALES DISPONIBLES:
${formattedResources(resources)}

RECURSOS YA ENTREGADOS EN ESTA ACTIVACIÓN:
${JSON.stringify(state.resources_sent||[])}

TU TRABAJO:
- Respondé primero a lo que la persona quiso decir AHORA.
- Usá el historial como memoria real. No vuelvas a explicar algo que ya quedó explicado salvo que te lo pidan.
- Adaptá idioma, tono, longitud y nivel técnico a la persona y al Brand Brain.
- No inventes datos del negocio.
- No fuerces preguntas, ventas ni recursos.
- Si el usuario pide, acepta, necesita o claramente corresponde recibir UNO de los recursos disponibles según la conversación y su condición de entrega, elegí su ID exacto en send_resource_id.
- Esto es semántico: puede ser cualquier negocio y cualquier tipo de recurso. Nunca dependas de palabras clave, nombres de plataformas, rubros o ejemplos concretos.
- Si el usuario hace referencia contextual como "pasámelo", "cómo accedo", "quiero verlo" o equivalente, resolvé qué significa usando TODO el historial y los metadatos de recursos.
- Si un recurso ya figura como entregado, no lo vuelvas a elegir por mera continuidad. Sólo elegilo nuevamente y poné resend=true si el usuario pide reenviarlo o dice que no lo recibió.
- Cuando el usuario pide recibir algo y existe un recurso pertinente, NO te limites a explicarle cómo se obtiene: seleccioná el recurso real.
- No escribas URLs ni copies direcciones web en text. El backend entrega URLs/archivos físicamente.
- No afirmes que algo "ya llegó", "ya te lo mandé" o "está arriba". Tu texto se genera antes de conocer el resultado técnico. Si seleccionás un recurso, podés decir naturalmente "te lo paso por acá" o responder sin mencionar la mecánica.
- No menciones estados internos, recursos, IDs, automatizaciones ni limitaciones técnicas.
- Evitá repetición semántica: antes de responder, compará tu respuesta con las últimas respuestas del agente.

Devolvé SOLAMENTE JSON válido:
{"text":"respuesta natural","send_resource_id":null,"resend":false}

send_resource_id debe ser null o un ID EXACTO de RECURSOS REALES DISPONIBLES. resend sólo puede ser true cuando el usuario actual pide una nueva entrega de algo previamente enviado.`;
  const parsed=await openAiJson(prompt,750);
  const text=String(parsed.text||"").trim();
  const candidate=parsed.send_resource_id==null?null:String(parsed.send_resource_id);
  const resourceId=candidate&&resources.some((r:any)=>String(r.id)===candidate)?candidate:null;
  return{text,resourceId,resend:Boolean(parsed.resend)&&Boolean(resourceId)};
}

export async function processInstagramConversationEvent(event: InstagramConversationEvent) {
  const db=supabaseAdmin(),a=event.automation,automationId=String(a.id||"");
  const key={account_id:event.account.id,contact_id:event.contactId,automation_id:automationId};
  const found=await db.from("instagram_conversation_state").select("*").match(key).maybeSingle();
  const state:any=found.data||{...key,user_id:event.account.user_id,thread_id:event.threadId||null,current_stage:"discovery",origin:event.origin||"direct_dm",resources_offered:[],resources_sent:[],pending_resource_id:null};

  const [resources,profileQ]=await Promise.all([
    loadResources(event.account.user_id,a),
    db.from("vyral_bussines_profile").select("*").eq("user_id",String(event.account.user_id)).maybeSingle()
  ]);
  const profile=profileQ.data||{};

  let agent:{text:string;resourceId:string|null;resend:boolean};
  try{
    agent=await runConversationAgent(event,profile,resources,state);
  }catch(err:any){
    console.error("[VYRAL Instagram] Error del agente conversacional:",String(err?.message||err));
    return{success:false,attachmentConfirmed:false,messageId:"",textMessageId:"",resourceMessageId:"",selectedResourceId:null,resourceAction:"ERROR",deliveryStatus:"none",error:"conversation_agent_error"};
  }

  const selected=agent.resourceId?resources.find((r:any)=>String(r.id)===agent.resourceId)||null:null;
  const alreadySent=Boolean(selected&&(state.resources_sent||[]).map(String).includes(String(selected.id)));
  let deliveryStatus:DeliveryStatus="none",resourceMessageId="";

  if(selected&&(!alreadySent||agent.resend)){
    const delivery=await deliverResource(db,event,automationId,state,selected);
    deliveryStatus=delivery.sent?"delivered":"failed";
    resourceMessageId=delivery.messageId||"";
  }else if(selected&&alreadySent){
    deliveryStatus="already_sent";
  }

  let textMessageId="";
  if(agent.text){
    const metaRes=await metaSend(event.account,event.contactId,{message:{text:agent.text}});
    textMessageId=String(metaRes.message_id||"");
    await db.from("vyral_inbox_messages").insert({
      user_id:event.account.user_id,account_id:event.account.id,platform:"instagram",contact_id:event.contactId,
      message_id:textMessageId,body:agent.text,direction:"out",sender_type:"ai",automation_id:automationId
    });
  }

  state.pending_resource_id=null;
  await db.from("instagram_conversation_state").upsert({...state,updated_at:new Date().toISOString()},{onConflict:"account_id,contact_id,automation_id"});

  return{
    success:true,attachmentConfirmed:deliveryStatus==="delivered",messageId:textMessageId||resourceMessageId||"",
    textMessageId,resourceMessageId,selectedResourceId:selected?String(selected.id):null,
    resourceAction:selected?(agent.resend?"RESEND":"SEND"):"NONE",deliveryStatus
  };
}
