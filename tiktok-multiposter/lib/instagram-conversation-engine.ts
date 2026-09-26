import crypto from "crypto";
import {supabaseAdmin} from "./supabase-admin";

const GRAPH="https://graph.instagram.com";
const VER=process.env.META_GRAPH_API_VERSION||"v24.0";

export type ConversationStage="opening"|"discovery"|"qualification"|"resource_ready"|"resource_sent"|"follow_up"|"closed";
export type ConversationOrigin="post_comment"|"story_reply"|"direct_dm";

export type InstagramConversationEvent={
 account:any;
 automation:any;
 contactId:string;
 threadId?:string|null;
 messageId:string;
 text:string;
 origin?:ConversationOrigin;
 contextPayload?:Record<string,any>;
 history?:string;
 firstName?:string;
 source:"webhook"|"polling";
};

function norm(v:any){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase()}
function uniq(xs:any[]){return [...new Set(xs.map(String).filter(Boolean))]}
function stageOfVoice(v:any):string{
 const explicit=norm(v?.stage);if(explicit)return explicit;
 const s=norm(`${v?.name||""} ${v?.purpose||""} ${v?.when||""}`);
 if(/primer|inicio|opening|bienven|saludo/.test(s))return"opening";
 if(/prueba|evidencia|backtest|resultado|win ?rate/.test(s))return"proof";
 if(/recurso|link|acceso|discord|guia|pdf/.test(s))return"resource_offer";
 if(/seguimiento|follow/.test(s))return"follow_up";
 if(/cierre|closing|listo para entrar/.test(s))return"closing";
 if(/pregunta|duda|topic/.test(s))return"topic_answer";
 return"qualification";
}
function allowedOrigin(v:any,origin:ConversationOrigin){const xs=Array.isArray(v?.allowed_origins)?v.allowed_origins:Array.isArray(v?.allowedOrigins)?v.allowedOrigins:[];return !xs.length||xs.includes(origin)}
function classifyIntent(text:string){
 const t=norm(text);
 if(/\b(chau|adios|nos vemos|hasta luego|gracias,? chau|listo,? gracias)\b/.test(t))return"close";
 if(/donde (puedo )?(ver|entrar|acceder|aprender|estudiar|seguir)|como (hago para )?(entrar|acceder|aprender|estudiar|seguir)|donde (ensen|enseñ)as|como (ensen|enseñ)as|quiero (entrar|acceder|ver mas|aprender|estudiar|seguir)|pasame (el )?(link|enlace|acceso|discord|recurso)|mandame (el )?(link|enlace|acceso|discord|recurso)|tu (discord|comunidad|grupo)|discord|comunidad gratuita/.test(t))return"high_intent";
 if(/no me (la|lo) (mandaste|enviaste|pasaste)|no llego|no me llego|reenvi|otra vez|de nuevo/.test(t))return"claim_missing_resource";
 if(/prueba|evidencia|backtest|resultado|win ?rate|captura/.test(t))return"proof_request";
 if(/link|discord|acceso|guia|pdf|archivo|foto|imagen|recurso|catalogo/.test(t)&&/(manda|envia|pasame|quiero|link|acceso)/.test(t))return"resource_request";
 if(/gracias|listo|genial|perfecto|dale/.test(t)&&t.split(/\s+/).length<6)return"ack";
 if(/precio|comprar|contratar|pagar|plan/.test(t))return"qualification";
 return"discovery";
}
function nextStage(current:ConversationStage,intent:string):ConversationStage{
 if(intent==="close")return"closed";
 if(intent==="high_intent"||intent==="claim_missing_resource"||intent==="proof_request"||intent==="resource_request")return"resource_ready";
 if(current==="opening")return"discovery";
 if(current==="resource_sent")return"follow_up";
 if(intent==="qualification")return"qualification";
 return current==="closed"?"closed":current;
}
async function metaSend(account:any,recipientId:string,payload:any){
 const r=await fetch(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,{method:"POST",headers:{Authorization:`Bearer ${account.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({recipient:{id:recipientId},...payload}),cache:"no-store"});
 const j=await r.json().catch(()=>({}));
 if(!r.ok||j.error||!j.message_id)throw new Error(j.error?.message||`Instagram send failed HTTP ${r.status}`);
 return j;
}
async function signed(path:string,seconds=604800){if(!path)return"";if(/^https:\/\//i.test(path))return path;const s=await supabaseAdmin().storage.from("scheduled-media").createSignedUrl(path,seconds);return String(s.data?.signedUrl||"")}
function attachmentType(r:any){const m=norm(r?.mime_type),n=norm(`${r?.name||""} ${r?.storage_path||""}`);if(m.startsWith("image/")||/\.(png|jpg|jpeg|gif|webp)/.test(n))return"image";if(m.startsWith("video/")||/\.(mp4|mov)/.test(n))return"video";if(m.startsWith("audio/")||/\.(mp3|m4a|aac|ogg)/.test(n))return"audio";return"file"}
function resourceScore(r:any,text:string){const t=norm(text),h=norm(`${r?.name||""} ${r?.purpose||""} ${r?.send_when||""}`);let s=t.split(/\W+/).filter(x=>x.length>3&&h.includes(x)).length;if(/prueba|evidencia|backtest|resultado|win ?rate|captura/.test(t)&&/prueba|evidencia|backtest|resultado|win ?rate|captura/.test(h))s+=30;if(/discord|acceso|comunidad/.test(t)&&/discord|acceso|comunidad/.test(h))s+=20;return s}
function chooseResource(pool:any[],text:string,pending?:string|null){if(pending){const p=pool.find(r=>String(r.id)===String(pending));if(p)return p}let best:any=null,score=0;for(const r of pool){const s=resourceScore(r,text);if(s>score){score=s;best=r}}return best}
function chooseStageVoice(a:any,state:any,intent:string,isFirstTouch=false){
 if(!a?.voiceEnabled)return null;
 const all=(Array.isArray(a.voiceAssets)?a.voiceAssets:[]).filter((v:any)=>v?.url);
 const sent=new Set((state.voice_assets_sent||[]).map(String));
 const first=isFirstTouch&&sent.size===0;
 const role=first?"opening":intent==="proof_request"?"proof":state.current_stage==="follow_up"?"follow_up":state.current_stage==="resource_ready"?"resource_offer":state.current_stage;
 const candidates=all.filter((v:any)=>stageOfVoice(v)===role&&allowedOrigin(v,state.origin)&&(!sent.has(String(v.id))||v.is_reusable===true));
 if(first)return candidates[0]||null;
 if(!candidates.length)return null;
 const t=norm(state.last_intent||"");
 return candidates.find((v:any)=>norm(`${v.when||""} ${v.purpose||""}`).split(/\W+/).some((w:string)=>w.length>4&&t.includes(w)))||candidates[0];
}
async function loadResources(userId:string,a:any){
 if(a.resourceMode==="specific"&&a.resourceUrl)return[{id:"specific",name:a.resourceName||"recurso",kind:/^https?:/i.test(a.resourceUrl)?"url":"file",external_url:/^https?:/i.test(a.resourceUrl)?a.resourceUrl:null,storage_path:/^https?:/i.test(a.resourceUrl)?null:a.resourceUrl,purpose:a.resourcePurpose||"",send_when:a.resourceWhen||""}];
 const q=await supabaseAdmin().from("vyral_business_resources").select("id,name,kind,storage_path,external_url,mime_type,purpose,send_when").eq("user_id",userId).eq("enabled",true);
 return(q.data||[]).filter((r:any)=>!Array.isArray(a.businessResourceIds)||!a.businessResourceIds.length||a.businessResourceIds.includes(r.id));
}
async function generateText(a:any,event:InstagramConversationEvent,state:any,intent:string,attachmentConfirmed:boolean,resource:any,resources:any[],profile:any){
 const key=process.env.VYRAL_CREATOR_PRODUCTION;
 if(!key)return "";
 const prompt=`Sos el motor conversacional de ventas por Instagram DM para VYRAL.\n\nOrigen: ${state.origin}.\nEtapa actual: ${state.current_stage}.\nIntención detectada: ${intent}.\n\nContexto de la publicación:\n${JSON.stringify(state.context_payload||{})}\n\nPublicación/oferta:\n${String(a.contentLabel||"")}\n\nHistorial de la conversación:\n${event.history||"Sin historial"}\n\nMensaje nuevo del usuario:\n${event.text}\n\nPERFIL / BRAND BRAIN DEL DUEÑO:\n${JSON.stringify(profile||{})}\n\nRECURSOS REALES DISPONIBLES:\n${JSON.stringify((resources||[]).map((r:any)=>({name:r.name,purpose:r.purpose,send_when:r.send_when,kind:r.kind})))}\n\nRecurso relacionado:\n${resource?JSON.stringify({name:resource.name,purpose:resource.purpose,send_when:resource.send_when}):"ninguno"}\n\nattachment_confirmed=${attachmentConfirmed}\n\nREGLAS DE ORO CONVERSACIONALES:\n1. SÉ HUMANO Y DIRECTO: Respondé de forma natural, corta y fluida. Máximo 1 pregunta por mensaje.\n2. NO REPETIR LO YA DICHO: Revisá el historial. Está ESTRICTAMENTE PROHIBIDO repetir promesas, muletillas, preguntas o explicaciones ya hechas en audios o mensajes anteriores.\n3. URLS: Nunca escribas, deletrees ni dictes URLs como parte de una respuesta conversacional. El backend entrega el enlace real como mensaje independiente. Si ya fue entregado, sólo podés referirte naturalmente a que quedó por escrito.\n4. INTENCIÓN ALTA (HIGH_INTENT): Si el usuario pide directamente recurso/acceso/link, no hagas preguntas de calificación adicionales. El backend se encarga de entregar el recurso.\n5. CERO CHAT INFINITO: Si responde corto o con poco interés, no abras un interrogatorio. Dejá una cortesía abierta.\n6. MANEJO DE ADJUNTOS: Si attachment_confirmed=false, PROHIBIDO afirmar o prometer que algo fue enviado. Si attachment_confirmed=true, podés confirmar brevemente que el recurso quedó enviado.\n7. CONTROL DE PREGUNTAS: Sólo hacé preguntas cuando la etapa actual sea opening o discovery. Fuera de esas etapas, respondé sin preguntas.\n8. No repitas el nombre, saludo, CTA ni información del post salvo que sea imprescindible para contestar lo que preguntó el usuario. No inventes recursos, resultados ni datos.\n9. CONTESTÁ LA PREGUNTA REAL: si pregunta por la estrategia, cómo la usa el creador, dónde aprenderla o cómo seguirla, respondé usando PERFIL/BRAND BRAIN + RECURSOS REALES. No des una respuesta genérica si las fuentes contienen la respuesta.\n10. PUENTE NATURAL AL RECURSO: si el usuario muestra interés claro en aprender/seguir la estrategia y existe un recurso pertinente, podés decir naturalmente que la comparte/enseña allí; el backend enviará el recurso cuando la intención sea de acceso.\n11. Nunca uses como respuesta de relleno frases tipo "Te leo", "Contame un poco más", "seguimos", "¿algo más?" si no contestan concretamente el mensaje actual.\n12. Terminá frases completas. Nunca devuelvas una oración cortada.\n\nRespondé ÚNICAMENTE con el texto final que se le enviará al usuario.`;
 const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,max_output_tokens:250}),signal:AbortSignal.timeout(12000)}),j=await r.json().catch(()=>({}));
 if(!r.ok)return "";
 let out=String(j.output_text||"");if(!out)for(const x of j.output||[])for(const z of x.content||[])if(z.type==="output_text")out+=z.text||"";
 return out.trim().slice(0,1500);
}

export async function processInstagramConversationEvent(event:InstagramConversationEvent){
 const db=supabaseAdmin(),a=event.automation,automationId=String(a.id||"");
 const key={account_id:event.account.id,contact_id:event.contactId,automation_id:automationId};
 const found=await db.from("instagram_conversation_state").select("*").match(key).maybeSingle();
 const isFirstTouch=!found.data;
 let state:any=found.data||{...key,user_id:event.account.user_id,thread_id:event.threadId||null,current_stage:"opening",origin:event.origin||"direct_dm",context_payload:event.contextPayload||{},last_question_asked:null,last_audio_id:null,voice_assets_sent:[],resources_offered:[],resources_sent:[],pending_resource_id:null,last_intent:null};
 const intent=classifyIntent(event.text);
 const resources=await loadResources(event.account.user_id,a);\n const profileQ=await db.from("vyral_bussines_profile").select("*").eq("user_id",String(event.account.user_id)).maybeSingle();const profile=profileQ.data||{};
 const previousStage=state.current_stage as ConversationStage;
 let resource=chooseResource(resources,event.text,state.pending_resource_id);
 if(intent==="high_intent"&&!resource)resource=resources.find((r:any)=>r.kind==="url")||resources[0]||null;
 if(intent==="claim_missing_resource"&&!resource&&state.resources_offered?.length)resource=resources.find((r:any)=>state.resources_offered.includes(String(r.id)))||null;
 if(intent==="ack"&&previousStage==="discovery"&&!resource)resource=resources.find((r:any)=>r.kind==="url")||null;
 const lowInterestDelivery=intent==="ack"&&previousStage==="discovery"&&Boolean(resource);
 const wantsResource=(["high_intent","resource_request","proof_request","claim_missing_resource"].includes(intent)||lowInterestDelivery)&&Boolean(resource);
 state.last_intent=intent;
 state.current_stage=nextStage(state.current_stage,intent);
 if(wantsResource){state.pending_resource_id=String(resource.id);state.resources_offered=uniq([...(state.resources_offered||[]),resource.id])}
 await db.from("instagram_conversation_state").upsert({...state,updated_at:new Date().toISOString()},{onConflict:"account_id,contact_id,automation_id"});

 let attachmentConfirmed=false,resourceMessageId="";

 // AUDIO-FIRST: choose and send the stage audio before any resource/text response.
 // For an explicit resource request this prioritizes resource_offer/topic_answer audio,
 // then the backend delivers the resource as a separate message.
 const voice=intent==="close"?null:chooseStageVoice(a,state,intent,isFirstTouch);
 let voiceSent=false;
 if(voice?.url){
  try{const url=await signed(String(voice.url),86400);if(url){const j=await metaSend(event.account,event.contactId,{message:{attachment:{type:"audio",payload:{url}}}});voiceSent=true;state.last_audio_id=String(voice.id||"");state.voice_assets_sent=uniq([...(state.voice_assets_sent||[]),voice.id]);await db.from("vyral_inbox_messages").insert({user_id:event.account.user_id,account_id:event.account.id,platform:"instagram",contact_id:event.contactId,message_id:String(j.message_id||crypto.randomUUID()),body:`[Audio enviado: ${String(voice.transcript||voice.name||voice.id||"audio")}]`,direction:"out",sender_type:"ai",automation_id:automationId,attachment_type:"audio",attachment_meta:{voiceId:voice.id||null,stage:stageOfVoice(voice)}})} }catch{}
 }

 // Resource delivery is always a distinct message and happens after the relevant audio.
 if(wantsResource&&resource){
  try{
   if(resource.kind==="url"){const j=await metaSend(event.account,event.contactId,{message:{text:String(resource.external_url||"")}});resourceMessageId=String(j.message_id||"")}
   else{const url=await signed(String(resource.storage_path||""));if(!url)throw new Error("resource_url_missing");const j=await metaSend(event.account,event.contactId,{message:{attachment:{type:attachmentType(resource),payload:{url}}}});resourceMessageId=String(j.message_id||"")}
   attachmentConfirmed=true;state.resources_sent=uniq([...(state.resources_sent||[]),resource.id]);state.pending_resource_id=null;state.current_stage="resource_sent";
   await db.from("vyral_inbox_messages").insert({user_id:event.account.user_id,account_id:event.account.id,platform:"instagram",contact_id:event.contactId,message_id:resourceMessageId,body:resource.kind==="url"?String(resource.external_url||""):`[Recurso enviado: ${resource.name||resource.id}]`,direction:"out",sender_type:"ai",automation_id:automationId,attachment_type:resource.kind==="url"?null:attachmentType(resource)});
  }catch{attachmentConfirmed=false;state.pending_resource_id=String(resource.id);state.current_stage="resource_ready"}
 }

 let textMessageId="",reply="";
 if(attachmentConfirmed){
  // Human confirmation is deliberately separate from the link/resource.
  // Keep it neutral so it cannot repeat post/audio marketing claims or reopen discovery.
  reply="Ahí te lo dejé arriba. Entrá tranquilo y cualquier duda me avisás.";
 }else if(!voiceSent){
  reply=await generateText(a,event,state,intent,false,resource,resources,profile);
 }
 if(reply){const recentQ=await db.from("vyral_inbox_messages").select("body").eq("account_id",event.account.id).eq("contact_id",event.contactId).eq("direction","out").order("created_at",{ascending:false}).limit(8);const recent=(recentQ.data||[]).map((x:any)=>norm(x.body));const candidate=norm(reply);const duplicate=recent.some((x:string)=>x===candidate||(candidate.length>24&&x.length>24&&(x.includes(candidate)||candidate.includes(x))));if(!duplicate){const j=await metaSend(event.account,event.contactId,{message:{text:reply}});textMessageId=String(j.message_id||"");await db.from("vyral_inbox_messages").insert({user_id:event.account.user_id,account_id:event.account.id,platform:"instagram",contact_id:event.contactId,message_id:textMessageId||crypto.randomUUID(),body:reply,direction:"out",sender_type:"ai",automation_id:automationId})}}
 await db.from("instagram_conversation_state").upsert({...state,updated_at:new Date().toISOString()},{onConflict:"account_id,contact_id,automation_id"});
 return{ok:true,intent,stage:state.current_stage,voiceSent,voiceId:voice?.id||null,attachmentConfirmed,resourceId:resource?.id||null,pendingResourceId:state.pending_resource_id||null,messageId:textMessageId||resourceMessageId||null};
}
