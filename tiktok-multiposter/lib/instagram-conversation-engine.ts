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
 // Operational delivery/access requests outrank discovery: once the person asks how to access/join/get something, execute rather than educate again.
 if(/\b(como|donde)\s+(me\s+)?(uno|entro|accedo|ingreso|consigo|obtengo)|\b(me\s+)?(puedo|quiero)\s+(unir|entrar|acceder|ingresar)|\b(pasame|mandame|enviame|compartime|dame)\b/.test(t))return"resource_request";
 // A farewell only closes the conversation when it is actually the whole turn.
 // If the same message continues with a question/request (e.g. "nos vemos... y por último, ¿tenés pruebas?"), keep reasoning.
 const farewell=/\b(chau|adios|nos vemos|hasta luego|gracias,? chau|listo,? gracias)\b/.test(t);
 const hasQuestionOrContinuation=/\?|\b(y por ultimo|pero|consulta|pregunta|tenes|tienes|podes|puedes|quisiera|quiero|necesito|como|donde|cual|que)\b/.test(t);
 if(farewell&&!hasQuestionOrContinuation)return"close";
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
function chooseStageVoice(a:any,state:any,intent:string,isFirstTouch=false,currentMessage="",resourceDeliveryConfirmed=false){
 if(!a?.voiceEnabled)return null;
 const all=(Array.isArray(a.voiceAssets)?a.voiceAssets:[]).filter((v:any)=>v?.url);
 const sent=new Set((state.voice_assets_sent||[]).map(String));
 const first=isFirstTouch&&sent.size===0;
 const role=first?"opening":intent==="proof_request"?"proof":state.current_stage==="follow_up"?"follow_up":state.current_stage;
 if(role==="resource_ready"||role==="resource_offer")return null;
 if(role==="resource_sent"&&!resourceDeliveryConfirmed)return null;
 const candidates=all.filter((v:any)=>stageOfVoice(v)===role&&allowedOrigin(v,state.origin)&&(!sent.has(String(v.id))||v.is_reusable===true));
 // Opening is the only deterministic prerecorded voice. After opening, silence is safer than a semantically wrong recording.
 if(first)return candidates[0]||null;
 if(!candidates.length)return null;
 const message=String(currentMessage||"").trim();
 if(!message)return null;
 let best:any=null,bestScore=0;
 for(const v of candidates){
  const voiceMeaning=`${v.when||""} ${v.purpose||""} ${v.transcript||""} ${v.name||""}`;
  const score=semanticOverlap(message,voiceMeaning);
  if(score>bestScore){best=v;bestScore=score}
 }
 // Never use candidates[0] as a fallback. A prerecorded voice must be grounded in the current user turn.
 return bestScore>=2?best:null;
}
async function loadResources(userId:string,a:any){
 if(a.resourceMode==="specific"&&a.resourceUrl)return[{id:"specific",name:a.resourceName||"recurso",kind:/^https?:/i.test(a.resourceUrl)?"url":"file",external_url:/^https?:/i.test(a.resourceUrl)?a.resourceUrl:null,storage_path:/^https?:/i.test(a.resourceUrl)?null:a.resourceUrl,purpose:a.resourcePurpose||"",send_when:a.resourceWhen||""}];
 const q=await supabaseAdmin().from("vyral_business_resources").select("id,name,kind,storage_path,external_url,mime_type,purpose,send_when").eq("user_id",userId).eq("enabled",true);
 return(q.data||[]).filter((r:any)=>!Array.isArray(a.businessResourceIds)||!a.businessResourceIds.length||a.businessResourceIds.includes(r.id));
}
async function generateText(a:any,event:InstagramConversationEvent,state:any,intent:string,attachmentConfirmed:boolean,resource:any,resources:any[],profile:any){
 const key=process.env.VYRAL_CREATOR_PRODUCTION;if(!key)return{text:"",sendResourceId:null as string|null,deliveryReason:"none"};
 // The model may write copy, but deterministic consent gates own resource delivery.
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
CONTRATO DE PRESENTACIÓN DEL RECURSO: si attachment_confirmed=true y existe Recurso relacionado, text DEBE contextualizar explícitamente el recurso que acaba de entregarse. Integrá naturalmente, sin plantilla rígida: (A) qué es usando name/purpose, (B) por qué se entrega AHORA conectado con la necesidad concreta del último mensaje, y (C) qué parte, dato o utilidad relevante debería mirar o aprovechar según purpose/send_when. Después respondé la duda del usuario sólo con información nueva que aporte. Nunca dejes un adjunto sin explicación y nunca inventes contenido fuera del recurso. En retry_missing abreviá la explicación porque ya fue presentada antes.
REGLAS: respondé breve, humana y coherentemente usando sólo estas fuentes. PENSÁ EL TURNO EN ESTE ORDEN: (1) qué necesidad expresó realmente, (2) qué información ya conoce, (3) si existe un recurso real que resuelve esa necesidad, (4) si el siguiente paso natural es explicar, ofrecer o entregar. DISTINGUÍ CONVERSACIÓN DE ACCIÓN: una pregunta sobre cómo acceder, unirse, entrar, obtener, recibir o encontrar un recurso es intención operacional de entrega; no vuelvas a discovery, no hagas otra pregunta y no uses un audio educativo como sustituto. Si el usuario pide acceso de forma explícita y existe un recurso inequívoco, seleccioná su id con explicit_request. TRANSICIÓN NATURAL — MÁQUINA DE ESTADOS OBLIGATORIA: ANTES de redactar text, decidí si algún recurso real es el siguiente paso útil para la necesidad actual. Si no lo es, respondé normalmente. Si sí lo es, elegí exactamente uno de estos estados y obedecelo: (1) INVITAR: el recurso es útil pero todavía no existe consentimiento/pedido suficiente. Explicá sólo el valor NUEVO que aporta y la última oración DEBE ser una invitación contextual explícita a recibir/acceder/unirse/ver/usar ese recurso. No cierres con otra pregunta de discovery y no des instrucciones que presupongan que la persona ya tiene acceso. (2) ENTREGAR: el usuario aceptó una invitación previa, pregunta cómo acceder/unirse/obtenerlo, pide que se lo pases, dice que quiere verlo/recibirlo o expresa consentimiento equivalente. En este estado send_resource_id DEBE ser el id exacto y delivery_reason=explicit_request; no pidas otro OK ni hagas discovery antes. (3) ENTREGA PROACTIVA: sólo cuando la intención latente fuerte justifica mostrar evidencia/material ahora según purpose/send_when; usá proactive_value. PROHIBIDO mencionar un recurso como solución concreta y dejarlo sin invitación o entrega. REGLA DE PRIMERA PRESENTACIÓN: para cada recurso consultá already_offered y already_sent. Si ambos son false, asumí que la persona NO SABE qué es ese recurso ni conoce su nombre. Está prohibido nombrarlo de golpe como referencia conocida (por ejemplo "en X", "revisá X", "como viste en X"). Si aporta valor, introducilo primero con contexto humano derivado exclusivamente de name/purpose/send_when: explicá qué es y por qué conecta con la necesidad actual. Luego podés (a) invitar a recibirlo si conviene consentimiento, o (b) entregarlo proactivamente si el propio recurso resuelve/demuestra de forma clara la duda actual. Si already_offered=true o already_sent=true, ya podés referirte a él naturalmente sin volver a presentarlo, pero sin repetir beneficios ya explicados. Después de una entrega confirmada, no recites nuevamente sus beneficios, instrucciones ni contenido ya explicado: una continuación humana puede pedir que avise cuando acceda/lo vea o qué le pareció, siempre que sea natural y no repita información. No inventes beneficios: derivá todo de BUSINESS BRAIN, contexto y purpose/send_when. PERSONALIZACIÓN HUMANA: si el nombre/contacto está disponible en el contexto o historial, podés usar su primer nombre ocasionalmente en momentos relevantes; nunca en todos los turnos ni como muletilla. Razoná qué necesita la persona AHORA y relacioná esa necesidad con name, purpose y send_when de los recursos aunque no los nombre literalmente. TRATÁ EL HISTORIAL COMO MEMORIA SEMÁNTICA ESTRICTA: antes de redactar, construí mentalmente un conjunto de hechos ya comunicados (beneficios, instrucciones, pasos, horarios, criterios, características, explicaciones, recursos y propuestas). Todo concepto cuyo significado ya fue transmitido queda BLOQUEADO para repetición, aunque puedas parafrasearlo con palabras distintas. Sólo podés reutilizarlo si el usuario lo pregunta explícitamente, muestra que no lo entendió, lo contradice, dice que no lo recibió/no lo ve, o si una referencia mínima es indispensable para responder una necesidad NUEVA. En ese último caso referencialo en pocas palabras y aportá información nueva; no vuelvas a desarrollarlo. Un agradecimiento, despedida, confirmación o comentario de cierre NO habilita recapitulaciones ni consejos repetidos. Respondé siempre con información incremental. NO ESPEJES EL LENGUAJE DEL USUARIO: no copies ni devuelvas su saludo, apertura, cierre, afirmación o muletilla inmediata (por ejemplo equivalentes a "cómo va", "tal cual", "genial", "amigo"). Contestá al significado. Detectá también INTENCIÓN LATENTE: no esperes siempre un pedido literal. Si el usuario muestra interés concreto, destaca, valora, duda o compara un aspecto y un recurso real aporta información nueva directamente útil sobre esa señal según purpose/send_when, podés entregarlo proactivamente. No lo hagas por elogios genéricos ni mera relación temática: exigí señal concreta y utilidad incremental clara. Un recurso ya enviado NO se repite por continuidad temática, agradecimientos, confirmaciones ni acknowledgements. Pero si el TURNO ACTUAL vuelve a pedir operativamente acceso, ubicación, recepción o entrega de ese recurso, seleccioná su id con explicit_request: una petición actual explícita prevalece sobre already_sent. Si dice que no llegó/no aparece, usá retry_missing. Si seleccionás un recurso, delivery_reason debe explicar la causa con uno de estos valores: proactive_value si la entrega nace de una intención latente fuerte y aporta utilidad nueva; first_delivery si aún no se entregó y corresponde ahora; new_need si ya se entregó pero el mensaje actual introduce una necesidad nueva que justifica mostrarlo otra vez; explicit_request si el usuario lo pide; retry_missing si dice que no llegó/no aparece; none si no debe enviarse. Si prometés o insinuás que vas a mandar/dejar/compartir algo ahora, send_resource_id es obligatorio y delivery_reason no puede ser none. Nunca inventes ni sustituyas recursos. No escribas URLs en text. Si attachment_confirmed=true, no vuelvas a seleccionar ese recurso en esa misma respuesta. Evitá repetición semántica, no sólo textual. CONTRATO DE CTA: si text menciona por primera vez o vuelve a presentar un recurso real como lugar, herramienta, material, comunidad, prueba o solución útil para la necesidad actual y ese recurso todavía no fue entregado en esta activación, NO podés terminar en una pregunta de diagnóstico. Debés cerrar con UNA invitación explícita y contextual a recibirlo/acceder/unirse/verlo/usarlo. La invitación debe dejar claro el siguiente paso y no debe afirmar que ya tiene acceso. Si el usuario acepta esa invitación en el turno siguiente, ENTREGAR inmediatamente. PRESUPUESTO DE PREGUNTAS: discovery existe sólo para conseguir información que cambie materialmente la próxima respuesta. Como máximo hacé una pregunta de diagnóstico por activación después del opening. Una vez que el usuario ya explicó su problema o respondió una pregunta de diagnóstico, considerá discovery satisfecho: desde ahí priorizá respuesta, solución, recurso/CTA o cierre. Está prohibido encadenar preguntas para profundizar indefinidamente, reformular la misma duda o terminar cada turno con una pregunta por hábito. Sólo se permite otra pregunta si falta un dato imprescindible para cumplir un pedido nuevo. Terminá todas las oraciones.
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

async function validateReplyBeforeSend(event:InstagramConversationEvent,state:any,resources:any[],profile:any,reply:string){
 const text=String(reply||"").trim(),key=process.env.VYRAL_CREATOR_PRODUCTION;if(!text||!key)return text;
 const db=supabaseAdmin(),started=String(state.context_payload?.session_started_at||"");
 let q=db.from("vyral_inbox_messages").select("body,attachment_type,attachment_meta,created_at").eq("account_id",event.account.id).eq("contact_id",event.contactId).eq("automation_id",String(event.automation?.id||"")).eq("direction","out");
 if(started)q=q.gte("created_at",started);
 const evidenceQ=await q.order("created_at",{ascending:true}).limit(60);
 const evidence=(evidenceQ.data||[]).map((x:any)=>({body:String(x.body||""),attachment_type:x.attachment_type||null,attachment_meta:x.attachment_meta||{},created_at:x.created_at}));
 const sentIds=(state.resources_sent||[]).map(String);
 const sentResources=(resources||[]).filter((r:any)=>sentIds.includes(String(r.id))).map((r:any)=>({id:String(r.id),name:r.name,kind:r.kind,purpose:r.purpose}));
 const prompt=`Sos el verificador final de una respuesta de Instagram DM. No converses con el usuario: auditá y, si hace falta, corregí la RESPUESTA PROPUESTA antes de enviarla.
RESPUESTA PROPUESTA: ${text}
ÚLTIMO MENSAJE DEL USUARIO: ${String(event.text||"")}
EVIDENCIA REAL DE ESTA ACTIVACIÓN: ${JSON.stringify(evidence)}
RECURSOS CONFIRMADOS COMO ENVIADOS EN ESTA ACTIVACIÓN: ${JSON.stringify(sentResources)}
BUSINESS BRAIN: ${JSON.stringify(profile||{})}
REGLA CENTRAL: toda afirmación sobre hechos o acciones pasadas del agente debe estar demostrada por la evidencia de ESTA activación. Frases equivalentes a "ya te lo mandé", "te lo dejé arriba", "como te mostré", "ya te pasé", "lo compartí antes", "viste el archivo/audio/link" son falsas si la evidencia no demuestra esa acción concreta. No uses recuerdos de activaciones anteriores ni supongas que un recurso ofrecido fue enviado.
También verificá que no contradiga el historial, no invente acciones, recursos, cifras o contenido, y que responda al último mensaje sin repetir innecesariamente.
LÍMITE DE AUTORIDAD: este verificador NO puede crear una acción nueva. No agregues ofertas, invitaciones, promesas de envío, afirmaciones de que vas a mandar/adjuntar/compartir algo, ni menciones nuevas de recursos que no estuvieran ya en RESPUESTA PROPUESTA. Tu trabajo es únicamente corregir hechos, contradicciones y repetición manteniendo exactamente la intención operativa original. La decisión de entregar recursos pertenece al planificador/ejecutor posterior.
AUDITORÍA DE INTERROGATORIO: mirá EVIDENCIA REAL y el último mensaje. Si el usuario ya explicó su problema o ya contestó una pregunta diagnóstica, eliminá nuevas preguntas de discovery salvo que falte un dato imprescindible para un pedido nuevo. No conviertas cada respuesta en otra pregunta.
Si está respaldada y cumple estas reglas, devolvela sin cambios. Si falla alguna, reescribí sólo lo necesario para que sea verdadera, natural y útil. No agregues URLs ni afirmes que algo ya fue enviado sin evidencia.
Respondé SOLO JSON válido: {"valid":true,"text":"respuesta final"}.`;
 try{
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,max_output_tokens:650}),signal:AbortSignal.timeout(15000)}),j=await r.json().catch(()=>({}));
  if(!r.ok)return text;let raw=String(j.output_text||"");if(!raw)for(const x of j.output||[])for(const z of x.content||[])if(z.type==="output_text")raw+=z.text||"";
  let cleaned=raw.trim();if(cleaned.startsWith("~~~json"))cleaned=cleaned.slice(7);if(cleaned.endsWith("~~~"))cleaned=cleaned.slice(0,-3);
  const parsed=JSON.parse(cleaned.trim()),checked=String(parsed.text||"").trim();
  return checked&&/[.!?…]$/.test(checked)?checked:text;
 }catch{return text}
}

export async function processInstagramConversationEvent(event:InstagramConversationEvent){
 const db=supabaseAdmin(),a=event.automation,automationId=String(a.id||"");
 const key={account_id:event.account.id,contact_id:event.contactId,automation_id:automationId};
 const found=await db.from("instagram_conversation_state").select("*").match(key).maybeSingle();
 // A real comment activation is reset by processComment before its opening DM/audio is sent.
 // Follow-up DMs keep origin="post_comment" as session provenance, so origin MUST NOT be used as a reset signal.
 const newActivation=!found.data;
 const freshState={...key,user_id:event.account.user_id,thread_id:event.threadId||null,current_stage:"opening",origin:event.origin||"direct_dm",context_payload:{...(event.contextPayload||{}),session_started_at:new Date().toISOString(),activation_message_id:String(event.messageId||"")},last_question_asked:null,last_audio_id:null,voice_assets_sent:[],resources_offered:[],resources_sent:[],pending_resource_id:null,last_intent:null};
 const isFirstTouch=!found.data;
 let state:any=found.data||freshState;
 // Only a genuinely missing state starts without history. Existing post-comment sessions must preserve their current activation.
 const sessionEvent:InstagramConversationEvent=newActivation?{...event,history:""}:event;
 const resources=await loadResources(event.account.user_id,a);
 const intent=classifyIntent(sessionEvent.text,resources);
 const profileQ=await db.from("vyral_bussines_profile").select("*").eq("user_id",String(event.account.user_id)).maybeSingle();const profile=profileQ.data||{};
 const previousStage=state.current_stage as ConversationStage;
 let resource:any=null;
 if(intent==="claim_missing_resource"){
  if(state.pending_resource_id)resource=resources.find((r:any)=>String(r.id)===String(state.pending_resource_id))||null;
  if(!resource&&state.resources_offered?.length){const lastOffered=String(state.resources_offered[state.resources_offered.length-1]);resource=resources.find((r:any)=>String(r.id)===lastOffered)||null}
 }else resource=chooseResource(resources,sessionEvent.text,state.pending_resource_id,sessionEvent.history||"");
 const wantsResource=["resource_request","claim_missing_resource"].includes(intent)&&Boolean(resource);
 state.last_intent=intent;
 state.current_stage=nextStage(state.current_stage,intent);
 if(wantsResource){state.pending_resource_id=String(resource.id);state.resources_offered=uniq([...(state.resources_offered||[]),resource.id])}
 await db.from("instagram_conversation_state").upsert({...state,updated_at:new Date().toISOString()},{onConflict:"account_id,contact_id,automation_id"});

 let attachmentConfirmed=false,resourceMessageId="",textMessageId="",reply="",brainResource:any=null;

 // PLAN FIRST: resource/action planning must run regardless of whether presentation uses audio or text.
 // Explicit missing-resource retries are locked to the pending/last-offered resource above and never re-routed.
 let plan=await generateText(a,sessionEvent,state,intent,false,resource,resources,profile);

 // SEMANTIC VALIDATION HAPPENS BEFORE ACTION COMMIT.
 // No component after the action audit is allowed to create a new promise/invitation.
 if(plan.text)plan.text=await validateReplyBeforeSend(sessionEvent,state,resources,profile,plan.text);

 // ATOMIC PROMISE GATE: conversational copy may never promise a resource unless the same
 // plan carries the exact real resource id that the executor can deliver in this turn.
 // This is semantic (AI-audited), not a phrase/regex patch, so it works across industries.
 const atomicKey=process.env.VYRAL_CREATOR_PRODUCTION;
 if(!wantsResource&&plan.text&&atomicKey){
  const atomicCatalog=(resources||[]).map((r:any)=>({id:String(r.id),name:r.name,purpose:r.purpose,send_when:r.send_when,kind:r.kind,already_sent:Boolean(state.resources_sent?.map(String).includes(String(r.id)))}));
  const atomicPrompt=`Auditá una respuesta de Instagram DM antes de ejecutarla.
MENSAJE DEL USUARIO: ${String(sessionEvent.text||"")}
RESPUESTA PLANEADA: ${String(plan.text||"")}
ACCIÓN PLANEADA send_resource_id: ${plan.sendResourceId?String(plan.sendResourceId):"null"}
RECURSOS REALES DISPONIBLES: ${JSON.stringify(atomicCatalog)}
Tu única tarea es detectar coherencia entre lenguaje y acción.
Si la respuesta afirma, promete o implica que AHORA se entrega, adjunta, pasa, comparte, manda o deja disponible un recurso, must_send_resource_id debe ser el ID exacto de ese recurso real.
Si el usuario pidió claramente recibir/ver una prueba, archivo, enlace, imagen, guía u otro recurso y existe uno que satisface ese pedido, tratá la entrega como acción requerida aunque el texto sea ambiguo.
Si no corresponde entregar nada ahora, must_send_resource_id=null y el texto no puede prometer una entrega.
No inventes IDs ni recursos. No decidas por palabras aisladas: razoná por el significado completo.
Respondé SOLO JSON válido: {"text":"texto coherente","must_send_resource_id":null}.`;
  try{
   const ar=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${atomicKey}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:atomicPrompt,max_output_tokens:500}),signal:AbortSignal.timeout(15000)});
   const aj=await ar.json().catch(()=>({}));
   if(ar.ok){
    let raw=String(aj.output_text||"");if(!raw)for(const x of aj.output||[])for(const z of x.content||[])if(z.type==="output_text")raw+=z.text||"";
    let cleaned=raw.trim();if(cleaned.startsWith("~~~json"))cleaned=cleaned.slice(7);if(cleaned.endsWith("~~~"))cleaned=cleaned.slice(0,-3);
    const audited=JSON.parse(cleaned.trim()),auditId=audited.must_send_resource_id==null?null:String(audited.must_send_resource_id);
    const exact=auditId?(resources||[]).find((r:any)=>String(r.id)===auditId):null;
    if(String(audited.text||"").trim())plan.text=String(audited.text).trim();
    if(exact)plan.sendResourceId=String(exact.id);
   }
  }catch(err:any){console.error("[VYRAL Instagram] atomic promise audit failed",{error:String(err?.message||err)})}
 }
 if(!wantsResource&&plan.sendResourceId){
  // sendResourceId is already constrained to an exact ID from the real resource catalog.
  // Do NOT require a second model label (deliveryReason) to authorize the same action:
  // that old double-gate could silently cancel a valid promised/requested delivery.
  const candidate=resources.find((r:any)=>String(r.id)===String(plan.sendResourceId))||null;
  if(candidate){
   brainResource=candidate;
   state.pending_resource_id=String(candidate.id);
   state.resources_offered=uniq([...(state.resources_offered||[]),String(candidate.id)]);
   state.current_stage="resource_ready";
  }
 }
 // DELIVERY POLICY (executor-owned):
 // - Passive continuation/acknowledgement never resends an already delivered resource.
 // - A CURRENT operational request for the resource is authoritative and must execute,
 //   even if an older activation/state says it was sent before.
 // - A missing-resource claim also executes immediately.
 // Webhook message-id idempotency upstream prevents the same inbound event from executing twice.
 const plannedResource=wantsResource?resource:brainResource;
 const plannedId=String(plannedResource?.id||"");
 const alreadyDelivered=Boolean(plannedId&&state.resources_sent?.map(String).includes(plannedId));
 const currentTurnRequiresDelivery=Boolean(plannedResource&&(intent==="resource_request"||intent==="claim_missing_resource"));
 const actionResource=plannedResource&&(currentTurnRequiresDelivery||!alreadyDelivered)?plannedResource:null;
 if(plannedResource&&alreadyDelivered&&!currentTurnRequiresDelivery){
  state.pending_resource_id=null;
  if(state.current_stage==="resource_ready")state.current_stage="resource_sent";
 }

 // Presentation is independent from planning. A voice can never suppress a planned resource action.
 const voice=intent==="close"||intent==="claim_missing_resource"||intent==="resource_request"?null:chooseStageVoice(a,state,intent,isFirstTouch,sessionEvent.text);
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
  if(attachmentConfirmed){const confirmed=await generateText(a,sessionEvent,state,intent,true,actionResource,resources,profile);reply=confirmed.text}
  else reply=plan.text;
 }
 if(reply){
  // ACTION COMMIT BOUNDARY: from here on, copy is immutable with respect to resource actions.
  // Any promise capable of causing delivery was already audited before the executor.
  let recentQuery=db.from("vyral_inbox_messages").select("body").eq("account_id",event.account.id).eq("contact_id",event.contactId).eq("direction","out");
  const sessionStartedAt=String(state.context_payload?.session_started_at||"");if(sessionStartedAt)recentQuery=recentQuery.gte("created_at",sessionStartedAt);
  const recentQ=await recentQuery.order("created_at",{ascending:false}).limit(8),recent=(recentQ.data||[]).map((x:any)=>norm(x.body)),candidate=norm(reply);
  const duplicate=recent.some((x:string)=>x===candidate||(candidate.length>24&&x.length>24&&(x.includes(candidate)||candidate.includes(x))));
  if(!duplicate){const j=await metaSend(event.account,event.contactId,{message:{text:reply}});textMessageId=String(j.message_id||"");await db.from("vyral_inbox_messages").insert({user_id:event.account.user_id,account_id:event.account.id,platform:"instagram",contact_id:event.contactId,message_id:textMessageId||crypto.randomUUID(),body:reply,direction:"out",sender_type:"ai",automation_id:automationId})}
 }
 await db.from("instagram_conversation_state").upsert({...state,updated_at:new Date().toISOString()},{onConflict:"account_id,contact_id,automation_id"});
 return{ok:true,intent,stage:state.current_stage,voiceSent,voiceId:voice?.id||null,attachmentConfirmed,resourceId:actionResource?.id||null,pendingResourceId:state.pending_resource_id||null,messageId:textMessageId||resourceMessageId||null};
}
