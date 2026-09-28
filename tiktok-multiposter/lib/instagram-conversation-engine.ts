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
const metaSendAudio=(account:any,recipientId:string,url:string)=>metaRequest(account,recipientId,{attachment:{type:"audio",payload:{url}}});

type VoiceSettings={enabled:boolean;voice_profile_id:string|null;max_ai_audios:number;max_audio_seconds:number;mode:string;voice_probability:number};
async function loadVoiceConfig(userId:string,automationId:string){
  const db=supabaseAdmin();
  const settingsQ=await db.from("vyral_automation_voice_settings").select("*").eq("user_id",userId).eq("automation_id",automationId).maybeSingle();
  const settings=(settingsQ.data||null) as VoiceSettings|null;
  if(!settings?.enabled||!settings.voice_profile_id)return {settings,profile:null};
  const profileQ=await db.from("vyral_voice_profiles").select("*").eq("id",settings.voice_profile_id).eq("user_id",userId).eq("status","ready").maybeSingle();
  return {settings,profile:profileQ.data||null};
}
function shouldUseVoice(settings:VoiceSettings|null,sentCount:number,text:string){
  if(!settings?.enabled||settings.mode==="text_only"||sentCount>=Math.min(3,Number(settings.max_ai_audios||3)))return false;
  const clean=String(text||"").trim();
  if(!clean||clean.length>700||/https?:\/\//i.test(clean))return false;
  const probability=Math.max(0,Math.min(100,Number(settings.voice_probability??35)));
  return Math.random()*100<probability;
}
async function synthesizeVoice(text:string,profile:any,maxSeconds:number){
  const key=process.env.ELEVENLABS_API_KEY;
  const voiceId=String(profile?.provider_voice_id||profile?.preset_voice_id||"").trim();
  if(!key||!voiceId)return null;
  const model=String(profile?.provider_settings?.model_id||"eleven_multilingual_v2");
  const r=await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`,{
    method:"POST",headers:{"xi-api-key":key,"Content-Type":"application/json","Accept":"audio/mpeg"},
    body:JSON.stringify({text,model_id:model,voice_settings:profile?.provider_settings?.voice_settings||undefined}),
    signal:AbortSignal.timeout(Math.max(12000,Math.min(30000,Number(maxSeconds||40)*750)))
  });
  if(!r.ok)return null;
  const bytes=new Uint8Array(await r.arrayBuffer());
  if(!bytes.length)return null;
  const path=`ai-voice/${profile.user_id}/${crypto.randomUUID()}.mp3`;
  const up=await supabaseAdmin().storage.from("scheduled-media").upload(path,bytes,{contentType:"audio/mpeg",upsert:false});
  if(up.error)return null;
  const url=await signed(path);
  return url?{url,path}:null;
}

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

async function generateReply(event:InstagramConversationEvent,profile:any,resources:any[],sentResourceIds:string[]){
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

RECURSOS YA ENVIADOS EN ESTA CONVERSACIÓN (ids):
${JSON.stringify(sentResourceIds)}

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
- Un recurso cuyo id figura en RECURSOS YA ENVIADOS ya fue entregado. NO lo vuelvas a seleccionar por continuidad temática, agradecimiento, aceptación, cierre ni porque vuelva a mencionarse.
- Solo podés solicitar el reenvío de un recurso ya enviado cuando el MENSAJE ACTUAL pide inequívocamente recibir ESE MISMO recurso otra vez o afirma que no lo recibió, lo perdió o ya no puede acceder a él. En ese único caso usá resend_resource=true.
- Una petición inicial de acceso no es reenvío. resend_resource existe exclusivamente para una segunda entrega explícitamente solicitada.

Respondé únicamente JSON:
{"text":"respuesta al usuario","send_resource_id":null,"resend_resource":false}`;

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
  const resendResource=parsed?.resend_resource===true;
  return{text,resourceId,resendResource};
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
  const [profileQ,resources,stateQ]=await Promise.all([
    db.from("vyral_bussines_profile").select("*").eq("user_id",String(event.account.user_id)).maybeSingle(),
    loadResources(String(event.account.user_id)),
    db.from("instagram_conversation_state").select("id,resources_sent,ai_voice_messages_sent")
      .eq("account_id",String(event.account.id)).eq("contact_id",event.contactId).eq("automation_id",automationId).maybeSingle()
  ]);
  const sentResourceIds=(stateQ.data?.resources_sent||[]).map(String);
  const voiceCount=Math.max(0,Number(stateQ.data?.ai_voice_messages_sent||0));
  const voiceConfig=await loadVoiceConfig(String(event.account.user_id),automationId);
  const reply=await generateReply(event,profileQ.data||{},resources,sentResourceIds);
  const candidate=reply.resourceId?resources.find((r:any)=>String(r.id)===reply.resourceId)||null:null;
  const alreadySent=Boolean(candidate&&sentResourceIds.includes(String(candidate.id)));
  const selected=candidate&&(!alreadySent||reply.resendResource===true)?candidate:null;

  let resourceMessageId="";
  if(selected){
    const resourceSent=await sendResource(event,selected);
    resourceMessageId=String(resourceSent.message_id||"");
    if(resourceMessageId&&!sentResourceIds.includes(String(selected.id))){
      const nextSent=[...sentResourceIds,String(selected.id)];
      if(stateQ.data?.id)await db.from("instagram_conversation_state").update({resources_sent:nextSent,updated_at:new Date().toISOString()}).eq("id",stateQ.data.id);
    }
  }

  let replyText=reply.text;
  for(const resource of resources){
    const url=String(resource.external_url||"").trim();
    if(url)replyText=replyText.split(url).join("").replace(/\n{3,}/g,"\n\n").trim();
  }
  let textMessageId="",audioMessageId="",audioPath="";
  const wantsVoice=Boolean(voiceConfig.profile&&shouldUseVoice(voiceConfig.settings,voiceCount,replyText));
  if(wantsVoice){
    const audio=await synthesizeVoice(replyText,voiceConfig.profile,Number(voiceConfig.settings?.max_audio_seconds||40)).catch(()=>null);
    if(audio){
      const audioSent=await metaSendAudio(event.account,event.contactId,audio.url);
      audioMessageId=String(audioSent.message_id||"");audioPath=audio.path;
      if(audioMessageId&&stateQ.data?.id)await db.from("instagram_conversation_state").update({ai_voice_messages_sent:voiceCount+1,updated_at:new Date().toISOString()}).eq("id",stateQ.data.id);
      await db.from("vyral_inbox_messages").insert({user_id:event.account.user_id,account_id:event.account.id,platform:"instagram",contact_id:event.contactId,message_id:audioMessageId,body:replyText,direction:"out",sender_type:"ai",automation_id:automationId});
    }
  }
  if(!audioMessageId){
    const sent=await metaSend(event.account,event.contactId,replyText);
    textMessageId=String(sent.message_id||"");
    await db.from("vyral_inbox_messages").insert({
      user_id:event.account.user_id,account_id:event.account.id,platform:"instagram",contact_id:event.contactId,
      message_id:textMessageId,body:replyText,direction:"out",sender_type:"ai",automation_id:automationId
    });
  }

  return{
    success:true,attachmentConfirmed:Boolean(resourceMessageId||audioMessageId),messageId:textMessageId||audioMessageId||resourceMessageId,
    textMessageId,audioMessageId,audioPath,resourceMessageId,selectedResourceId:selected?String(selected.id):null,
    resourceAction:selected?"SEND":"NONE",deliveryStatus:selected?"delivered":"none"
  };
}
