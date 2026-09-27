import { supabaseAdmin } from "./supabase-admin";

const GRAPH = "https://graph.instagram.com";
const VER = process.env.META_GRAPH_API_VERSION || "v24.0";

export type ConversationOrigin = "post_comment" | "story_reply" | "direct_dm";
export type InstagramConversationEvent = {
  account:any; automation:any; contactId:string; threadId?:string|null; messageId:string; text:string;
  origin?:ConversationOrigin; contextPayload?:Record<string,any>; history?:string; firstName?:string; source:"webhook"|"polling";
};

async function metaRequest(account:any,recipientId:string,message:any){
  const r=await fetch(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,{
    method:"POST",headers:{Authorization:`Bearer ${account.access_token}`,"Content-Type":"application/json"},
    body:JSON.stringify({recipient:{id:recipientId},message}),cache:"no-store"
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.error||!j.message_id)throw new Error(j.error?.message||`Instagram send failed HTTP ${r.status}`);
  return j;
}
const metaSend=(account:any,recipientId:string,text:string)=>metaRequest(account,recipientId,{text});

async function signed(path:string){
  if(/^https:\/\//i.test(path))return path;
  const s=await supabaseAdmin().storage.from("scheduled-media").createSignedUrl(path,604800);
  return String(s.data?.signedUrl||"");
}

function attachmentType(r:any){
  const m=String(r?.mime_type||"").toLowerCase(),n=String(r?.name||"").toLowerCase();
  if(m.startsWith("video/")||/\.(mp4|mov)$/.test(n))return "video";
  if(m.startsWith("audio/")||/\.(mp3|m4a|aac|ogg)$/.test(n))return "audio";
  return "image";
}

async function loadResources(userId:string){
  const q=await supabaseAdmin().from("vyral_business_resources")
    .select("id,name,kind,storage_path,external_url,mime_type,purpose,send_when")
    .eq("user_id",userId).eq("enabled",true);
  if(q.error)throw q.error;
  return q.data||[];
}

function resourceCatalog(resources:any[]){
  return resources.map((r:any)=>({
    id:String(r.id),name:String(r.name||""),type:String(r.kind||""),
    purpose:String(r.purpose||""),send_when:String(r.send_when||"")
  }));
}

function parseJson(raw:string){
  const clean=raw.trim().replace(/^\s*(?:```|~~~)(?:json)?\s*/i,"").replace(/\s*(?:```|~~~)\s*$/i,"");
  try{return JSON.parse(clean)}catch{}
  const a=clean.indexOf("{"),b=clean.lastIndexOf("}");
  if(a>=0&&b>a)return JSON.parse(clean.slice(a,b+1));
  throw new Error("openai_invalid_json");
}

function responseText(j:any){
  if(j?.output_text)return String(j.output_text).trim();
  let out="";for(const item of j?.output||[])for(const part of item?.content||[])if(part?.type==="output_text")out+=part.text||"";
  return out.trim();
}

async function generateReply(event:InstagramConversationEvent,profile:any,resources:any[]){
  const key=process.env.VYRAL_CREATOR_PRODUCTION;
  if(!key)throw new Error("openai_key_missing");
  const prompt=`Respondé el mensaje actual como si fueras la persona detrás de este negocio.

NEGOCIO:
${JSON.stringify(profile||{})}

CONTEXTO:
${JSON.stringify(event.contextPayload||{})}

CONVERSACIÓN:
${event.history||""}

RECURSOS DISPONIBLES:
${JSON.stringify(resourceCatalog(resources))}

MENSAJE ACTUAL:
${event.text}

No inventes datos que no estén respaldados por el negocio o la conversación.

CALIDAD CONVERSACIONAL — REGLAS UNIVERSALES:
- Tratá toda la CONVERSACIÓN como memoria de lo que ya fue dicho, incluido cualquier saludo o apertura previa que aparezca en el historial. Respondé al MENSAJE ACTUAL, no reinicies la conversación.
- Si la conversación ya fue abierta o saludada, NO vuelvas a iniciar con otro saludo. Entrá directamente en la respuesta útil. Esto aplica en cualquier idioma.
- No hagas eco del usuario: no copies automáticamente su saludo, apelativo, muletilla, forma de llamarte, primera frase ni construcción verbal. Que el usuario use una expresión no es una invitación a devolvérsela.
- Los apelativos y vocativos son opcionales, no una plantilla. No repitas el mismo apelativo de forma recurrente entre mensajes. Preferí muchas veces responder sin ninguno antes que sonar mecánico.
- Antes de escribir, compará semánticamente la respuesta con lo que el agente ya dijo en los mensajes recientes. No repitas una explicación, beneficio, recomendación, argumento, ejemplo o descripción ya comunicada, aunque puedas expresarla con otras palabras.
- Si el usuario retoma algo ya explicado, continuá desde ese punto y aportá información nueva, una precisión o una respuesta directa; no vuelvas a resumir lo anterior salvo que lo pida.
- Si vas a enviar un recurso que ya fue explicado en la conversación, no vuelvas a describir sus mismos beneficios o contenido. Respondé solamente lo nuevo que preguntó y acompañá la entrega con una confirmación breve y natural.
- No rellenes por rellenar. Cuando la pregunta ya quedó resuelta, una respuesta breve y natural es mejor que repetir contexto.
- Interpretá el significado del mensaje antes de nombrar el problema. No sustituyas una expresión específica del usuario por una etiqueta distinta si cambia el sentido.
- Estas reglas son semánticas y multilingües: adaptalas al idioma, cultura y registro de la conversación; no dependen de palabras concretas ni de un negocio específico.

No inventes ni escribas links, URLs o adjuntos. Si corresponde enviar uno de los recursos disponibles, elegí su id exacto en send_resource_id. Si no corresponde, dejalo en null.

Respondé únicamente JSON:
{"text":"respuesta al usuario","send_resource_id":null}`;

  const r=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,max_output_tokens:700,text:{format:{type:"json_object"}}}),
    signal:AbortSignal.timeout(15000)
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j?.error?.message||`OpenAI HTTP ${r.status}`);
  const parsed=parseJson(responseText(j));
  const text=String(parsed?.text||"").trim();
  if(!text)throw new Error("openai_empty_output");
  const candidate=parsed?.send_resource_id==null?null:String(parsed.send_resource_id);
  const resourceId=candidate&&resources.some((x:any)=>String(x.id)===candidate)?candidate:null;
  return{text,resourceId};
}

async function sendResource(event:InstagramConversationEvent,r:any){
  if(r.kind==="url"){
    const value=String(r.external_url||"").trim();
    if(!value)throw new Error("resource_url_missing");
    return metaSend(event.account,event.contactId,value);
  }
  const url=await signed(String(r.storage_path||""));
  if(!url)throw new Error("resource_file_missing");
  return metaRequest(event.account,event.contactId,{attachment:{type:attachmentType(r),payload:{url}}});
}

export async function processInstagramConversationEvent(event:InstagramConversationEvent){
  const db=supabaseAdmin(),automationId=String(event.automation?.id||"");
  const [profileQ,resources]=await Promise.all([
    db.from("vyral_bussines_profile").select("*").eq("user_id",String(event.account.user_id)).maybeSingle(),
    loadResources(String(event.account.user_id))
  ]);
  const reply=await generateReply(event,profileQ.data||{},resources);
  const selected=reply.resourceId?resources.find((r:any)=>String(r.id)===reply.resourceId)||null:null;

  let resourceMessageId="";
  if(selected){
    const resourceSent=await sendResource(event,selected);
    resourceMessageId=String(resourceSent.message_id||"");
  }

  const sent=await metaSend(event.account,event.contactId,reply.text);
  const textMessageId=String(sent.message_id||"");
  await db.from("vyral_inbox_messages").insert({
    user_id:event.account.user_id,account_id:event.account.id,platform:"instagram",contact_id:event.contactId,
    message_id:textMessageId,body:reply.text,direction:"out",sender_type:"ai",automation_id:automationId
  });

  return{
    success:true,attachmentConfirmed:Boolean(resourceMessageId),messageId:textMessageId||resourceMessageId,
    textMessageId,resourceMessageId,selectedResourceId:selected?String(selected.id):null,
    resourceAction:selected?"SEND":"NONE",deliveryStatus:selected?"delivered":"none"
  };
}
