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
function tokens(v:any){return norm(v).split(/[^a-z0-9]+/).filter((x:string)=>x.length>2)}
function semanticOverlap(a:any,b:any){const A=new Set(tokens(a)),B=new Set(tokens(b));let n=0;for(const x of A)if(B.has(x))n++;return n}
function classifyIntent(text:string,resources:any[]=[]){
 const t=norm(text);
 if(/\b(chau|adios|nos vemos|hasta luego|gracias,? chau|listo,? gracias)\b/.test(t))return"close";
 if(/no me (la|lo) (mandaste|enviaste|pasaste)|no (la|lo) veo|no aparece|no me aparece|no llego|no me llego|reenvi|otra vez|de nuevo/.test(t))return"claim_missing_resource";
 const asksDelivery=/(pasame|mandame|enviame|compartime|dame|quiero|necesito|donde|como (puedo|hago)|acceso|link|enlace|archivo|material|recurso)/.test(t);
 const resourceMatch=resources.some((r:any)=>semanticOverlap(t,`${r?.name||""} ${r?.purpose||""} ${r?.send_when||""}`)>0);
 if(resourceMatch&&asksDelivery)return"resource_request";
 if(/precio|comprar|contratar|pagar|plan|presupuesto|cotizacion/.test(t))return"qualification";
 if(/gracias|listo|genial|perfecto|dale/.test(t)&&t.split(/\s+/).length<6)return"ack";
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
async function deliverResource(db:any,event:InstagramConversationEvent,automationId:string,state:any,r:any){
 const id=String(r?.id||"");if(!id)return{sent:false,messageId:"",error:"resource_id_missing"};
 state.resources_offered=uniq([...(state.resources_offered||[]),id]);state.pending_resource_id=id;state.current_stage="resource_ready";
 try{
  let j:any;
  if(r.kind==="url"){const value=String(r.external_url||"").trim();if(!value)throw new Error("resource_external_url_missing");j=await metaSend(event.account,event.contactId,{message:{text:value}})}
  else{const url=await signed(String(r.storage_path||""));if(!url)throw new Error("resource_signed_url_missing");j=await metaSend(event.account,event.contactId,{message:{attachment:{type:attachmentType(r),payload:{url}}}})}
  const messageId=String(j.message_id||"");if(!messageId)throw new Error("resource_meta_message_id_missing");
  state.resources_sent=uniq([...(state.resources_sent||[]),id]);state.pending_resource_id=null;state.current_stage="resource_sent";
  await db.from("vyral_inbox_messages").insert({user_id:event.account.user_id,account_id:event.account.id,platform:"instagram",contact_id:event.contactId,message_id:messageId,body:r.kind==="url"?String(r.external_url||""):`[Recurso enviado: ${r.name||id}]`,direction:"out",sender_type:"ai",automation_id:automationId,attachment_type:r.kind==="url"?null:attachmentType(r)});
  return{sent:true,messageId,error:""};
 }catch(err:any){
  state.pending_resource_id=id;state.current_stage="resource_ready";
  console.error("[VYRAL Instagram] resource delivery failed",{resourceId:id,resourceName:r?.name,kind:r?.kind,error:String(err?.message||err)});
  return{sent:false,messageId:"",error:String(err?.message||err)};
 }
}
function resourceScore(r:any,text:string,history=""){const meta=`${r?.name||""} ${r?.purpose||""} ${r?.send_when||""}`,current=semanticOverlap(text,meta),context=semanticOverlap(history,meta);return current*4+Math.min(context,3)}
function chooseResource(pool:any[],text:string,pending?:string|null,history=""){if(pending){const p=pool.find(r=>String(r.id)===String(pending));if(p)return p}let best:any=null,bestScore=0,second=0;for(const r of pool){const s=resourceScore(r,text,history);if(s>bestScore){second=bestScore;bestScore=s;best=r}else if(s>second)second=s}return bestScore>=4&&bestScore>second?best:null}
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
 const key=process.env.VYRAL_CREATOR_PRODUCTION;if(!key)return{text:"",sendResourceId:null as string|null,deliveryReason:"none"};
 const catalog=(resources||[]).map((r:any)=>({id:String(r.id),name:r.name,purpose:r.purpose,send_when:r.send_when,kind:r.kind,already_sent:Boolean(state.resources_sent?.includes(String(r.id))),already_offered:Boolean(state.resources_offered?.includes(String(r.id)))}));
 const prompt=`Sos el cerebro conversacional multirrubro de VYRAL para Instagram DM. Razoná por significado, no por coincidencia literal.
Etapa: ${state.current_stage}. Intención: ${intent}. Origen: ${state.origin}.
Contexto/publicación: ${JSON.stringify(state.context_payload||{})} ${String(a.contentLabel||"")}
Historial: ${event.history||"Sin historial"}
Mensaje nuevo: ${event.text}
BUSINESS BRAIN: ${JSON.stringify(profile||{})}
RECURSOS REALES: ${JSON.stringify(catalog)}
Recurso relacionado: ${resource?JSON.stringify({id:String(resource.id),name:resource.name,purpose:resource.purpose,send_when:resource.send_when}):"ninguno"}
attachment_confirmed=${attachmentConfirmed}
REGLAS: respondé breve, humana y coherentemente usando sólo estas fuentes. Razoná qué necesita la persona AHORA y relacioná esa necesidad con name, purpose y send_when de los recursos aunque no los nombre literalmente. TRATÁ EL HISTORIAL COMO MEMORIA SEMÁNTICA: identificá qué hechos, beneficios, características, horarios, explicaciones, recursos y propuestas YA fueron comunicados y no los presentes otra vez como novedad. Respondé con información incremental. NO ESPEJES EL LENGUAJE DEL USUARIO: no copies ni devuelvas su saludo, apertura, cierre, afirmación o muletilla inmediata (por ejemplo equivalentes a "cómo va", "tal cual", "genial", "amigo"). Contestá al significado. Detectá también INTENCIÓN LATENTE: no esperes siempre un pedido literal. Si el usuario muestra interés concreto, destaca, valora, duda o compara un aspecto y un recurso real aporta información nueva directamente útil sobre esa señal según purpose/send_when, podés entregarlo proactivamente. No lo hagas por elogios genéricos ni mera relación temática: exigí señal concreta y utilidad incremental clara. Un recurso ya enviado PUEDE volver a ser útil si el mensaje actual crea una NECESIDAD NUEVA y distinta que ese recurso resuelve o demuestra; por ejemplo evidencia, validación, comparación, instrucciones o documentación, según lo que purpose/send_when diga realmente. No lo reenvíes sólo porque sigue relacionado con el tema. Si seleccionás un recurso, delivery_reason debe explicar la causa con uno de estos valores: proactive_value si la entrega nace de una intención latente fuerte y aporta utilidad nueva; first_delivery si aún no se entregó y corresponde ahora; new_need si ya se entregó pero el mensaje actual introduce una necesidad nueva que justifica mostrarlo otra vez; explicit_request si el usuario lo pide; retry_missing si dice que no llegó/no aparece; none si no debe enviarse. Si prometés o insinuás que vas a mandar/dejar/compartir algo ahora, send_resource_id es obligatorio y delivery_reason no puede ser none. Nunca inventes ni sustituyas recursos. No escribas URLs en text. Si attachment_confirmed=true, no vuelvas a seleccionar ese recurso en esa misma respuesta. Evitá repetición semántica, no sólo textual. Máximo una pregunta y sólo en opening/discovery. Terminá todas las oraciones.
Respondé SOLO JSON válido: {"text":"respuesta final","send_resource_id":null,"delivery_reason":"none"}.`;
 async function request(input:string,maxTokens=650){
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input,max_output_tokens:maxTokens}),signal:AbortSignal.timeout(15000)}),j=await r.json().catch(()=>({}));
  if(!r.ok)return{ok:false,raw:"",incomplete:false};let raw=String(j.output_text||"");if(!raw)for(const x of j.output||[])for(const z of x.content||[])if(z.type==="output_text")raw+=z.text||"";
  return{ok:true,raw:raw.trim(),incomplete:Boolean(j.status==="incomplete"||j.incomplete_details||j.output?.some?.((x:any)=>x.status==="incomplete"))};
 }
 const parse=(raw:string)=>{try{let x=raw.trim();if(x.startsWith("~~~json"))x=x.slice(7);if(x.endsWith("~~~"))x=x.slice(0,-3);const p=JSON.parse(x.trim());return{text:String(p.text||"").trim(),sendResourceId:p.send_resource_id==null?null:String(p.send_resource_id),deliveryReason:["proactive_value","first_delivery","new_need","explicit_request","retry_missing","none"].includes(String(p.delivery_reason))?String(p.delivery_reason):"none"}}catch{return{text:"",sendResourceId:null as string|null,deliveryReason:"none"}}};
 const complete=(x:string)=>Boolean(x&&/[.!?…]$/.test(x.trim()));
 let res=await request(prompt),generated=parse(res.raw);
 if(!res.ok||res.incomplete||!complete(generated.text)){res=await request(prompt+"\\nLa salida anterior fue inválida o incompleta. Generá nuevamente el JSON completo desde cero.",800);generated=parse(res.raw)}
 if(!res.ok||res.incomplete||!complete(generated.text))return{text:"",sendResourceId:null as string|null,deliveryReason:"none"};
 if(generated.sendResourceId&&!resources.some((r:any)=>String(r.id)===generated.sendResourceId))generated.sendResourceId=null;
 return generated;
}

export async function processInstagramConversationEvent(event:InstagramConversationEvent){
 const db=supabaseAdmin(),a=event.automation,automationId=String(a.id||"");
 const key={account_id:event.account.id,contact_id:event.contactId,automation_id:automationId};
 const found=await db.from("instagram_conversation_state").select("*").match(key).maybeSingle();
 const isFirstTouch=!found.data;
 let state:any=found.data||{...key,user_id:event.account.user_id,thread_id:event.threadId||null,current_stage:"opening",origin:event.origin||"direct_dm",context_payload:event.contextPayload||{},last_question_asked:null,last_audio_id:null,voice_assets_sent:[],resources_offered:[],resources_sent:[],pending_resource_id:null,last_intent:null};
 const resources=await loadResources(event.account.user_id,a);
 const intent=classifyIntent(event.text,resources);
 const profileQ=await db.from("vyral_bussines_profile").select("*").eq("user_id",String(event.account.user_id)).maybeSingle();const profile=profileQ.data||{};
 const previousStage=state.current_stage as ConversationStage;
 let resource:any=null;
 if(intent==="claim_missing_resource"){
  if(state.pending_resource_id)resource=resources.find((r:any)=>String(r.id)===String(state.pending_resource_id))||null;
  if(!resource&&state.resources_offered?.length){const lastOffered=String(state.resources_offered[state.resources_offered.length-1]);resource=resources.find((r:any)=>String(r.id)===lastOffered)||null}
 }else resource=chooseResource(resources,event.text,state.pending_resource_id,event.history||"");
 const wantsResource=["resource_request","claim_missing_resource"].includes(intent)&&Boolean(resource);
 state.last_intent=intent;
 state.current_stage=nextStage(state.current_stage,intent);
 if(wantsResource){state.pending_resource_id=String(resource.id);state.resources_offered=uniq([...(state.resources_offered||[]),resource.id])}
 await db.from("instagram_conversation_state").upsert({...state,updated_at:new Date().toISOString()},{onConflict:"account_id,contact_id,automation_id"});

 let attachmentConfirmed=false,resourceMessageId="",textMessageId="",reply="",brainResource:any=null;

 // PLAN FIRST: resource/action planning must run regardless of whether presentation uses audio or text.
 // Explicit missing-resource retries are locked to the pending/last-offered resource above and never re-routed.
 const plan=await generateText(a,event,state,intent,false,resource,resources,profile);
 if(!wantsResource&&plan.sendResourceId){
  const candidate=resources.find((r:any)=>String(r.id)===String(plan.sendResourceId))||null;
  const validReason=["proactive_value","first_delivery","new_need","explicit_request","retry_missing"].includes(String(plan.deliveryReason));
  if(candidate&&validReason){brainResource=candidate;state.pending_resource_id=String(candidate.id);state.resources_offered=uniq([...(state.resources_offered||[]),String(candidate.id)]);state.current_stage="resource_ready"}
 }
 const actionResource=wantsResource?resource:brainResource;

 // Presentation is independent from planning. A voice can never suppress a planned resource action.
 const voice=intent==="close"||intent==="claim_missing_resource"?null:chooseStageVoice(a,state,intent,isFirstTouch);
 let voiceSent=false;
 if(voice?.url){
  try{const url=await signed(String(voice.url),86400);if(url){const j=await metaSend(event.account,event.contactId,{message:{attachment:{type:"audio",payload:{url}}}});voiceSent=true;state.last_audio_id=String(voice.id||"");state.voice_assets_sent=uniq([...(state.voice_assets_sent||[]),voice.id]);await db.from("vyral_inbox_messages").insert({user_id:event.account.user_id,account_id:event.account.id,platform:"instagram",contact_id:event.contactId,message_id:String(j.message_id||crypto.randomUUID()),body:`[Audio enviado: ${String(voice.transcript||voice.name||voice.id||"audio")}]`,direction:"out",sender_type:"ai",automation_id:automationId,attachment_type:"audio",attachment_meta:{voiceId:voice.id||null,stage:stageOfVoice(voice)}})} }catch{}
 }

 // One executor owns delivery. The exact planned resource id is preserved through delivery/retry.
 if(actionResource){
  const delivery=await deliverResource(db,event,automationId,state,actionResource);
  attachmentConfirmed=delivery.sent;resourceMessageId=delivery.messageId;
 }

 // Text is presentation only. If audio already answered, do not add competing generated copy.
 // If a resource was delivered without audio, regenerate only to acknowledge the confirmed action.
 if(!voiceSent){
  if(attachmentConfirmed){const confirmed=await generateText(a,event,state,intent,true,actionResource,resources,profile);reply=confirmed.text}
  else reply=plan.text;
 }
 if(reply){
  const recentQ=await db.from("vyral_inbox_messages").select("body").eq("account_id",event.account.id).eq("contact_id",event.contactId).eq("direction","out").order("created_at",{ascending:false}).limit(8),recent=(recentQ.data||[]).map((x:any)=>norm(x.body)),candidate=norm(reply);
  const duplicate=recent.some((x:string)=>x===candidate||(candidate.length>24&&x.length>24&&(x.includes(candidate)||candidate.includes(x))));
  if(!duplicate){const j=await metaSend(event.account,event.contactId,{message:{text:reply}});textMessageId=String(j.message_id||"");await db.from("vyral_inbox_messages").insert({user_id:event.account.user_id,account_id:event.account.id,platform:"instagram",contact_id:event.contactId,message_id:textMessageId||crypto.randomUUID(),body:reply,direction:"out",sender_type:"ai",automation_id:automationId})}
 }
 await db.from("instagram_conversation_state").upsert({...state,updated_at:new Date().toISOString()},{onConflict:"account_id,contact_id,automation_id"});
 return{ok:true,intent,stage:state.current_stage,voiceSent,voiceId:voice?.id||null,attachmentConfirmed,resourceId:actionResource?.id||null,pendingResourceId:state.pending_resource_id||null,messageId:textMessageId||resourceMessageId||null};
}
