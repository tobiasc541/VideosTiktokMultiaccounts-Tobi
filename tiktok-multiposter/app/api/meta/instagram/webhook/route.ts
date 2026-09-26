import crypto from "crypto";
import {NextResponse} from "next/server";
import {env} from "../../../../../lib/env";
import {supabaseAdmin} from "../../../../../lib/supabase-admin";
import {processInstagramConversationEvent} from "../../../../../lib/instagram-conversation-engine";
export const maxDuration=60;
const GRAPH="https://graph.instagram.com",VER=process.env.META_GRAPH_API_VERSION||"v24.0";
function norm(s:any){return String(s||"").trim().toLowerCase()}
function automationAccess(meta:any){const plan=String(meta?.plan||"");const end=meta?.subscription_current_period_end||meta?.current_period_end;return ["inicio","pro","escala","ai"].includes(plan)&&(!end||new Date(String(end)).getTime()>Date.now())&&!meta?.vyral_automations_paused}
function instagramFirstName(username:any,name:any=""){const raw=String(name||username||"").trim().replace(/^@/,"");if(!raw)return"";let token=raw.split(/[._\-\s]+/).map((x:string)=>x.replace(/\d+/g,"").trim()).find((x:string)=>/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,24}$/.test(x))||"";if(!token)return"";token=token.charAt(0).toUpperCase()+token.slice(1).toLowerCase();const n=token.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();const nick:Record<string,string>={tobias:"Tobi",francisco:"Fran",franco:"Fran",alejandro:"Ale",alejandra:"Ale",agustin:"Agus",agustina:"Agus",santiago:"Santi",sebastian:"Seba",federico:"Fede",valentina:"Vale",matias:"Mati",nicolas:"Nico",luciano:"Lucho",maximiliano:"Maxi",facundo:"Facu",camila:"Cami",carolina:"Caro",catalina:"Cata",victoria:"Vicky",martina:"Marti",rodrigo:"Rodri",ignacio:"Nacho",guillermo:"Guille",gabriel:"Gabi",gabriela:"Gabi",daniela:"Dani",daniel:"Dani",manuel:"Manu",manuela:"Manu"};return nick[n]||token}
function personalizeFirstDm(text:string,username:string){const name=instagramFirstName(username);if(!name)return text;const clean=String(text||"").trim();if(!clean)return name;return clean.toLowerCase().startsWith(name.toLowerCase())?clean:`${name}, ${clean.charAt(0).toLowerCase()+clean.slice(1)}`}
function publicReplyForComment(a:any,text:string,username:string,commentId:string){
 const configured=String(a.publicReply||"").trim();
 const pool=[
  "Te mandé por privado 🙌","Ahí te escribí por DM 🙌","Te lo mandé al privado 👌","Listo, te escribí por privado","Ahí va por DM 🤝","Te llegó por privado 🙌","Ya te escribí por DM","Te mandé mensaje 👌","Fijate el privado 🙌","Ahí te mandé todo","Listo, va por privado 🤝","Te escribí recién 🙌","Ya te lo pasé por DM","Te mandé la info por privado 👌","Ahí te dejé un mensaje","Listo, revisá el DM 🙌","Va por privado 👌","Te acabo de escribir","Ahí lo tenés por DM 🙌","Te mandé un mensajito por privado","Dale, ahí te escribí 👌","De una, te mandé DM","Perfecto, ahí va por privado 🙌","Buenísimo, te escribí por DM","Sí 🙌 ahí te mandé mensaje","Ahí te contacto por privado","Te dejé todo por DM 👌","Revisá el privado que te escribí 🙌","Ahí te mandé la data","Listo 🙌 te llegó por DM","Dale, fijate los mensajes 👌","Te escribí por ahí 🙌","Ya va por privado","Ahí te lo compartí por DM","Te mandé la info recién 🙌","Hecho, revisá tu privado 👌","Ahí tenés mi mensaje","Listo, te hablé por DM 🙌","Te respondí por privado 👌","Ahí te llegó el mensaje","Dale 🙌 te lo mandé por privado","Te pasé todo por DM","Ya te mandé mensaje 🙌","Ahí te escribo por privado 👌","Listorti, va por DM 🙌","De una 🙌 revisá el privado","Te mandé eso por DM 👌","Ahí va, te escribí","Perfecto 🙌 te mandé privado","Te dejé la info en DM"
 ];
 // If the owner deliberately wrote a custom public reply, keep it in the rotation instead of discarding it.
 if(configured&&configured!=="¡Te escribí por privado! 👋"&&!pool.includes(configured))pool.push(configured);
 // Stable per comment: retries never produce a second variant for the same comment.
 const h=crypto.createHash("sha256").update(String(commentId||text||username||Date.now())).digest();
 return pool[h.readUInt32BE(0)%pool.length];
}
function deterministicMatch(a:any,text:string){const t=norm(text),ks=(a.keywords||[]).map(norm).filter(Boolean),ex=(a.excludeKeywords||[]).map(norm).filter(Boolean);if(ex.some((x:string)=>t.includes(x)))return false;if(a.triggerMode==="exact")return ks.some((x:string)=>t===x);if(a.triggerMode==="contains")return ks.some((x:string)=>t.includes(x));return ks.some((x:string)=>t.includes(x))}
async function aiDecision(a:any,text:string){if(a.triggerMode!=="ai_intent")return{match:deterministicMatch(a,text),dm:String(a.dmMessage||"")};const key=process.env.VYRAL_CREATOR_PRODUCTION;if(!key)return{match:deterministicMatch(a,text),dm:String(a.dmMessage||"")};const prompt=`Decidí si este comentario activa este agente de Instagram y redactá UNA respuesta privada breve si corresponde. Comentario: ${text}. Palabras/intenciones: ${JSON.stringify(a.keywords||[])}. Contexto: ${String(a.contentLabel||"")}. Objetivo: ${String(a.conversationGoal||"lead")}. Tono: ${String(a.aiTone||"natural")}. País: ${String(a.aiCountry||"")}. Reglas: ${String(a.aiInstructions||"")}. Base DM: ${String(a.dmMessage||"")}. No inventes precios ni datos. Respondé SOLO JSON {"match":true,"dm":"..."}. Si no corresponde, match=false.`;const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,max_output_tokens:350})}),j=await r.json().catch(()=>({}));if(!r.ok)return{match:deterministicMatch(a,text),dm:String(a.dmMessage||"")};let out=String(j.output_text||"");if(!out)for(const x of j.output||[])for(const z of x.content||[])if(z.type==="output_text")out+=z.text||"";try{const x=JSON.parse(out.slice(out.indexOf("{"),out.lastIndexOf("}")+1));return{match:Boolean(x.match),dm:String(x.dm||a.dmMessage||"")}}catch{return{match:deterministicMatch(a,text),dm:String(a.dmMessage||"")}}
}
async function ig(url:string,token:string,body?:any){const r=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${token}`,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,cache:"no-store"}),j=await r.json().catch(()=>({}));if(!r.ok||j.error)throw Error(j.error?.message||`Instagram HTTP ${r.status}`);return j}
async function signedMedia(db:any,path:string,seconds=86400){if(!path)return"";if(/^https:\/\//i.test(path))return path;const s=await db.storage.from("scheduled-media").createSignedUrl(path,seconds);return String(s.data?.signedUrl||"")}
function resourceType(name:string,mime:string=""){const n=String(name||"").toLowerCase(),m=String(mime||"").toLowerCase();if(m.startsWith("image/")||/\.(png|jpe?g|gif|webp)(?:$|\?)/.test(n))return"image";if(m.startsWith("video/")||/\.(mp4|mov)(?:$|\?)/.test(n))return"video";if(m.startsWith("audio/")||/\.(mp3|m4a|aac|ogg|webm)(?:$|\?)/.test(n))return"audio";return"file"}
async function sendAttachment(account:any,recipient:any,type:string,url:string){return ig(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,account.access_token,{recipient,message:{attachment:{type,payload:{url}}}})}
function chooseVoice(a:any,text:string,first=false){const vs=Array.isArray(a.voiceAssets)?a.voiceAssets.filter((v:any)=>v?.url):[];if(!a.voiceEnabled||!vs.length)return null;if(first)return vs[0];const t=norm(text);if(/\b(audio|voz|escuchar|mandame un audio|mándame un audio)\b/i.test(t))return vs.find((v:any)=>/audio|inicio|present|bienven|inform|venta|compr/i.test(`${v.name} ${v.purpose} ${v.when} ${v.transcript}`))||vs[0];let best:any=null,score=0;for(const v of vs){const words=norm(`${v.purpose} ${v.when} ${v.transcript}`).split(/\W+/).filter((x:string)=>x.length>4);const s=words.filter((w:string)=>t.includes(w)).length;if(s>score){score=s;best=v}}return score>0?best:null}
function voiceResourceIntent(v:any){const s=norm(`${v?.name||""} ${v?.purpose||""} ${v?.when||""} ${v?.transcript||""}`);if(!s)return false;return /\b(te lo paso|te lo mando|te lo envio|te lo envío|te dejo|te comparto|aca tenes|acá tenés|por aca|por acá|ahi va|ahí va|mando el|paso el|envio el|envío el|mando la|paso la|envio la|envío la)\b/i.test(s)&&/\b(link|discord|pdf|guia|guía|archivo|recurso|material|catalogo|catálogo|acceso|whatsapp|wsp|resultado|resultados|prueba|backtest)\b/i.test(s)}
function pickResourceForVoice(pool:any[],v:any){if(!Array.isArray(pool)||!pool.length||!v)return null;const s=norm(`${v.name||""} ${v.purpose||""} ${v.when||""} ${v.transcript||""}`),tokens=s.split(/\W+/).filter((x:string)=>x.length>3);let best:any=null,score=-1;for(const r of pool){const hay=norm(`${r.name||""} ${r.kind||""} ${r.purpose||""} ${r.send_when||""}`);let n=tokens.filter((w:string)=>hay.includes(w)).length;if(/discord/.test(s)&&/discord/.test(hay))n+=20;if(/whatsapp|wsp/.test(s)&&/whatsapp|wsp/.test(hay))n+=20;if(/pdf|guia|guía|archivo|material/.test(s)&&/pdf|guia|guía|archivo|material|file/.test(hay))n+=10;if(/resultado|prueba|backtest|win rate/.test(s)&&/resultado|prueba|backtest|win rate/.test(hay))n+=15;if(n>score){score=n;best=r}}return score>0?best:(pool.length===1?pool[0]:null)}
function pickResourceForText(pool:any[],text:string){if(!Array.isArray(pool)||!pool.length)return null;const s=norm(text),tokens=s.split(/\W+/).filter((x:string)=>x.length>3);let best:any=null,score=0;for(const r of pool){const hay=norm(`${r.name||""} ${r.kind||""} ${r.mime_type||""} ${r.purpose||""} ${r.send_when||""}`);let n=tokens.filter((w:string)=>hay.includes(w)).length;if(/prueba|resultado|evidencia|backtest|win rate|winrate/.test(s)&&/prueba|resultado|evidencia|backtest|win rate|winrate/.test(hay))n+=20;if(/discord|comunidad|servidor|acceso/.test(s)&&/discord|comunidad|servidor|acceso/.test(hay))n+=15;if(/catalogo|catálogo|precio|lista/.test(s)&&/catalogo|catálogo|precio|lista/.test(hay))n+=12;if(n>score){score=n;best=r}}return score>0?best:null}
async function conversationReply(a:any,text:string,history:string="",firstName:string=""){
 const key=process.env.VYRAL_CREATOR_PRODUCTION;
 if(!key)return{messages:[String(a.dmMessage||"Gracias por escribir. ¿En qué te puedo ayudar?")],sendResource:false};
 let resourcePool:any[]=[];
 if(a.resourceMode!=="specific"){const q=await supabaseAdmin().from("vyral_business_resources").select("id,name,kind,storage_path,external_url,mime_type,purpose,send_when").eq("user_id",a.__userId).eq("enabled",true);resourcePool=(q.data||[]).filter((r:any)=>!Array.isArray(a.businessResourceIds)||!a.businessResourceIds.length||a.businessResourceIds.includes(r.id))}
 if(a.resourceMode==="specific"&&a.resourceUrl)resourcePool=[{id:"specific",name:String(a.resourceName||"recurso"),kind:/^https?:/i.test(String(a.resourceUrl))?"url":"file",storage_path:/^https?:/i.test(String(a.resourceUrl))?null:String(a.resourceUrl),external_url:/^https?:/i.test(String(a.resourceUrl))?String(a.resourceUrl):null,purpose:String(a.resourcePurpose||""),send_when:String(a.resourceWhen||"")}];
 const evidence=resourcePool.map((r:any)=>({id:r.id,name:r.name,type:r.kind,description:r.purpose,when:r.send_when}));
 const prompt=`Sos el cerebro conversacional de VYRAL para Instagram. Tu trabajo es mantener una conversación REAL, cercana y contextual, no ejecutar un embudo rígido.
NOMBRE CORTO DEL CONTACTO=${firstName||"desconocido"}. Usalo ocasionalmente, nunca en todos los mensajes.
MODO=${String(a.conversationMode||"human")}. OBJETIVO=${String(a.conversationGoal||"lead")}. TONO=${String(a.aiTone||"natural")}. PAÍS=${String(a.aiCountry||"")}. CONTEXTO/OFERTA=${String(a.contentLabel||"")}. CTA=${String(a.ctaText||"")}. WhatsApp=${String(a.whatsappTarget||"No configurado")}. REGLAS DEL DUEÑO=${String(a.aiInstructions||"")}.
PRUEBA/RECURSO DISPONIBLE=${JSON.stringify(evidence)}.
HISTORIAL REAL:
${history||"Sin historial previo"}
MENSAJE NUEVO:
${text}

REGLAS OBLIGATORIAS:
- Respondé exactamente a lo último que dijo la persona y recordá lo anterior. No repitas preguntas ya respondidas.
- Primero conexión y comprensión; después objetivo. No presiones ni saltes a vender/entregar salvo que el usuario lo pida o sea el momento natural.
- Hacé como máximo UNA pregunta nueva por turno.
- No hagas una pregunta sólo para mantener viva la charla. Una pregunta tiene que ser necesaria para responder, completar el objetivo o confirmar una acción que el usuario quería hacer.
- Si el objetivo principal ya se cumplió (link/recurso/acceso entregado) y el usuario confirma que lo recibió, agradece, responde con poco interés o no plantea una duda nueva, cerrá naturalmente SIN pregunta. Si dice "chau", "gracias chau", "listo gracias", "nos vemos" o equivalente, despedite y TERMINÁ: no abras otro tema.
- No vuelvas a explicar beneficios, contenido o características que ya explicaste en los últimos mensajes. Si ya dijiste qué contiene un Discord/recurso, no lo repitas al confirmar que entró.
- Podés dividir la respuesta en 1 a 4 burbujas cortas para sonar natural. Variá longitud según el momento; no cortes una misma oración artificialmente.
- No uses siempre el nombre. No saludes de nuevo en cada turno. No digas que sos IA.
- No inventes precios, ingresos, resultados, testimonios, urgencia, experiencia personal ni características. El historial puede contener respuestas anteriores equivocadas del agente: NO las trates como hechos ni continúes una derivación, una falta de evidencia o una negativa anterior si los datos actuales las contradicen.
- PRINCIPIO DE INTENCIÓN: no confundas una aceptación genérica ("dale", "perfecto", "enviame", "pasame", "mandame") con un pedido de cualquier recurso disponible. Esas frases dependen del turno inmediatamente anterior: si el agente/audio venía ofreciendo Discord, acceso o link, la aceptación se refiere a ESE link/acceso; si venía ofreciendo una imagen/prueba/video, se refiere a ESE archivo. Nunca cambies de tema hacia otro recurso sólo porque existe en PRUEBA/RECURSO DISPONIBLE.
- Los recursos son herramientas para cumplir una intención, NO temas para iniciar por tu cuenta. No menciones una prueba, backtest, imagen, video, PDF, catálogo u otro recurso si el usuario no preguntó por ese tema y el turno anterior no lo ofreció.
- Si el usuario pide "enviame/pasame/mandame" y el historial deja claro qué se ofreció, respondé sobre ese objeto exacto y seleccioná únicamente ese recurso.
- Si existe una prueba/recurso y el mensaje coincide con su campo when/description, ESO ES EVIDENCIA REAL DEL NEGOCIO: usala. Marcá sendResource=true, elegí resourceId y explicá brevemente qué demuestra. Si el usuario pide verla, que se la pases, pregunta por pruebas/resultados/evidencia o insiste con "¿no me la pasás vos?", la prioridad es ENTREGAR el recurso coincidente ahora. Nunca digas que no hay pruebas si PRUEBA/RECURSO DISPONIBLE contiene una coincidente. Nunca atribuyas a un archivo algo que su descripción no afirma.
- Si MODO=instant y el usuario pide el recurso/link, entregalo sin fricción.
- Si el objetivo es vender, calificá de forma progresiva: situación -> objetivo -> obstáculo -> encaje -> propuesta -> cierre. No interrogues; una pregunta por turno. En MODO=human, cuando el prospecto expresa una necesidad como "busco una estrategia sólida", NO respondas sólo con aprobación: hacé una pregunta concreta sobre qué usa hoy, qué resultado tiene, qué le cuesta o qué busca mejorar.
- No repitas links, recursos, CTA, saludos, emojis ni frases ya enviadas en el historial salvo que el usuario los pida de nuevo. Si el Discord ya fue enviado, no vuelvas a mencionarlo porque sí. Una charla casual como "buenas, cómo va" se responde casualmente y se continúa desde el contexto; jamás saltes a "ya quedó derivado" ni a una objeción vieja. Sólo hablá de derivar al equipo si el usuario pide explícitamente una persona/humano/asesor.
- Si el objetivo es entregar recurso/Discord, también podés conversar antes cuando MODO=human y ofrecerlo naturalmente.
- Detectá en HISTORIAL REAL si el objetivo principal ya fue cumplido (por ejemplo recurso/link/acceso ya entregado). Después de cumplirlo, hacé como máximo 1 o 2 preguntas de seguimiento útiles en TOTAL; luego respondé sin forzar otra pregunta. Si el usuario sólo agradece o cierra, cerrá cálidamente sin abrir otro interrogatorio.
- Si vas a marcar sendResource=true, NO escribas la URL ni digas que ya fue enviada dentro de messages. El backend enviará el recurso una sola vez inmediatamente después. Podés introducirlo con una frase breve como "Sí, te la paso acá" y explicar qué es, pero no simules que ya se mandó.
- Si el usuario pide solamente un link ya conocido, mantené messages mínimo: no repitas saludo, pitch ni CTA. El backend manda el link una sola vez.
Devolvé SOLO JSON válido: {"messages":["..."],"sendResource":false,"resourceId":"","stage":"new|curious|qualified|hot|converted|support","reason":""}.`;
 const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,max_output_tokens:550}),signal:AbortSignal.timeout(12000)}),j=await r.json().catch(()=>({}));
 if(!r.ok)return{messages:[String(a.dmMessage||"Gracias por escribir. ¿En qué te puedo ayudar?")],sendResource:false};
 let out=String(j.output_text||"");if(!out)for(const x of j.output||[])for(const z of x.content||[])if(z.type==="output_text")out+=z.text||"";
 try{const parsed=JSON.parse(out.slice(out.indexOf("{"),out.lastIndexOf("}")+1));const messages=(Array.isArray(parsed.messages)?parsed.messages:[]).map((x:any)=>String(x||"").trim()).filter(Boolean).slice(0,4);return{messages:messages.length?messages:[String(a.dmMessage||"Gracias por escribir. ¿En qué te puedo ayudar?")],sendResource:Boolean(parsed.sendResource),resourceId:String(parsed.resourceId||""),resourcePool,stage:String(parsed.stage||"curious")}}catch{return{messages:[out.trim().slice(0,1800)||String(a.dmMessage||"Gracias por escribir. ¿En qué te puedo ayudar?")],sendResource:false}}
}
async function processMessage(db:any,account:any,m:any){
 const senderId=String(m?.sender?.id||""),recipientId=String(m?.recipient?.id||""),mid=String(m?.message?.mid||""),text=String(m?.message?.text||"").trim();
 if(!senderId||!mid||!text||m?.message?.is_echo)return;
 const selfIds=new Set([String(account.instagram_user_id||""),String(account.webhook_user_id||""),recipientId].filter(Boolean));if(selfIds.has(senderId))return;
 const u=await db.auth.admin.getUserById(account.user_id),meta=u.data?.user?.user_metadata||{};if(!automationAccess(meta))return;
 const rules=(meta.vyral_automations||[]).filter((a:any)=>a.enabled&&a.platforms?.includes("instagram")&&a.continueConversation!==false&&a.dmEnabled!==false);if(!rules.length)return;
 const prevs=await db.from("instagram_automation_runs").select("automation_id,media_id").eq("account_id",account.id).eq("commenter_id",senderId).order("created_at",{ascending:false}).limit(8);
 const prev=(prevs.data||[]).find((x:any)=>x.automation_id),a=rules.find((x:any)=>x.id===prev?.automation_id)||rules[0];
 const inbox=await db.from("vyral_inbox_messages").select("message_id,body,direction").eq("account_id",account.id).eq("contact_id",senderId).order("created_at",{ascending:false}).limit(30);
 const history=(inbox.data||[]).filter((x:any)=>String(x.message_id||"")!==mid).slice().reverse().map((x:any)=>`${x.direction==="in"?"Usuario":"Agente"}: ${String(x.body||"")}`).join("\n").slice(-12000);
 const syntheticId=`dm:${mid}`,claim=await db.from("instagram_automation_runs").insert({user_id:account.user_id,account_id:account.id,automation_id:a.id,comment_id:syntheticId,commenter_id:senderId,comment_text:text,status:"matched",detail:{source:"instagram_dm",engine:"state_v2"}}).select("id").maybeSingle();
 if(claim.error){if(String(claim.error.code)==="23505")return;throw claim.error}
 try{
  await db.from("vyral_inbox_messages").upsert({user_id:account.user_id,account_id:account.id,platform:"instagram",contact_id:senderId,message_id:mid,body:text,direction:"in",sender_type:"contact",automation_id:a.id},{onConflict:"platform,message_id"});
  const result=await processInstagramConversationEvent({account,automation:a,contactId:senderId,messageId:mid,text,origin:prev?.media_id?"post_comment":"direct_dm",contextPayload:{post_title:String(a.contentLabel||""),target_topic:String(a.contentLabel||""),media_id:String(prev?.media_id||"")},history,source:"webhook"});
  await db.from("instagram_automation_runs").update({status:"sent",private_message_id:result.messageId||null,updated_at:new Date().toISOString(),detail:{source:"instagram_dm",engine:"state_v2",...result}}).eq("id",claim.data?.id);
 }catch(e:any){await db.from("instagram_automation_runs").update({status:"error",error:String(e?.message||e).slice(0,1000),updated_at:new Date().toISOString()}).eq("id",claim.data?.id)}
}
async function processComment(db:any,account:any,value:any){const commentId=String(value?.id||""),text=String(value?.text||""),fromId=String(value?.from?.id||""),username=String(value?.from?.username||""),mediaId=String(value?.media?.id||"");if(!commentId||!text||fromId===String(account.instagram_user_id))return;
 const alreadyHandled=await db.from("instagram_automation_runs").select("id").eq("account_id",account.id).eq("comment_id",commentId).limit(1).maybeSingle();if(alreadyHandled.data)return;
 const u=await db.auth.admin.getUserById(account.user_id),meta=u.data?.user?.user_metadata||{};if(!automationAccess(meta))return;const rules=(meta.vyral_automations||[]).filter((a:any)=>a.enabled&&a.platforms?.includes("instagram")&&(!Array.isArray(a.targetMediaIds)||!a.targetMediaIds.length||a.targetMediaIds.includes(mediaId))).sort((a:any,b:any)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));for(const a of rules){let decision=await aiDecision(a,text);const normalized=text.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").trim().toLowerCase();const context=String(a.contentLabel||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();const explicitCta=[...(a.keywords||[]).map((x:any)=>String(x)),...Array.from(context.matchAll(/(?:comenta|comentá|escribi|escribí|manda|mandá)\\s+([a-z0-9_-]{2,30})/gi)).map((m:any)=>m[1])].map((x:string)=>x.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").trim().toLowerCase()).filter(Boolean);if(explicitCta.includes(normalized))decision={match:true,dm:String(decision.dm||a.dmMessage||"")};if(!decision.match)continue;
 const ins=await db.from("instagram_automation_runs").insert({user_id:account.user_id,account_id:account.id,automation_id:a.id,comment_id:commentId,media_id:mediaId||null,commenter_id:fromId||null,commenter_username:username||null,comment_text:text,status:"processing",detail:{triggerMode:a.triggerMode}}).select("id").maybeSingle();if(ins.error){if(String(ins.error.code)==="23505")return;throw ins.error}const runId=ins.data?.id;
 try{let publicId="",messageId="";if(a.publicReplyEnabled){const publicReply=publicReplyForComment(a,text,username,commentId);if(publicReply){try{const j=await ig(`${GRAPH}/${VER}/${encodeURIComponent(commentId)}/replies?message=${encodeURIComponent(publicReply)}`,account.access_token);publicId=String(j.id||"")}catch(e){console.error("[VYRAL Instagram] public reply failed",e)}}}
 const firstVoice=(Array.isArray(a.voiceAssets)?a.voiceAssets:[]).find((v:any)=>v?.url&&(String(v.stage||"").toLowerCase()==="opening"||/primer|inicio|opening|bienven|saludo/i.test(`${v.name||""} ${v.purpose||""}`))&&(!Array.isArray(v.allowed_origins)||!v.allowed_origins.length||v.allowed_origins.includes("post_comment"))),shortName=instagramFirstName(username);let dm="";if(firstVoice?.url){dm=shortName}else{dm=String(decision.dm||a.dmMessage||"").trim();if(a.personalizeName!==false)dm=personalizeFirstDm(dm,username)};
 if(a.dmEnabled&&(dm||firstVoice)){
   if(dm){const j=await ig(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,account.access_token,{recipient:{comment_id:commentId},message:{text:dm}});messageId=String(j.message_id||"")}
   // Send the owner-configured opening audio immediately when Meta exposes a DM-addressable commenter id.
   if(firstVoice?.url&&fromId){const audioUrl=await signedMedia(db,String(firstVoice.url));if(audioUrl){try{const aj:any=await Promise.race([sendAttachment(account,{id:fromId},"audio",audioUrl),new Promise((_,reject)=>setTimeout(()=>reject(new Error("audio_timeout")),8000))]);if(!messageId)messageId=String(aj?.message_id||"");await db.from("instagram_conversation_state").upsert({user_id:account.user_id,account_id:account.id,automation_id:String(a.id||""),contact_id:fromId,current_stage:"discovery",origin:"post_comment",context_payload:{post_title:String(a.contentLabel||""),media_id:mediaId,target_topic:String(a.contentLabel||"")},last_audio_id:String(firstVoice.id||""),voice_assets_sent:firstVoice.id?[String(firstVoice.id)]:[],resources_offered:[],resources_sent:[],pending_resource_id:null,last_intent:"opening",updated_at:new Date().toISOString()},{onConflict:"account_id,contact_id,automation_id"});await db.from("vyral_inbox_messages").insert({user_id:account.user_id,account_id:account.id,platform:"instagram",contact_id:fromId,contact_username:username||null,message_id:String(aj?.message_id||`audio:${commentId}`),body:`[Audio enviado: ${String(firstVoice.transcript||firstVoice.name||"opening")}]`,direction:"out",sender_type:"ai",automation_id:a.id,attachment_type:"audio",attachment_meta:{voiceId:firstVoice.id||null,stage:"opening"}})}catch(e){console.error("[VYRAL Instagram] opening audio failed",e)/* State is not marked sent so a later private-thread event can retry. */}}}
  }
 await db.from("instagram_automation_runs").update({status:"completed",public_reply_id:publicId||null,private_message_id:messageId||null,updated_at:new Date().toISOString(),detail:{triggerMode:a.triggerMode,resource:Boolean(a.resourceUrl)}}).eq("id",runId)}catch(e:any){await db.from("instagram_automation_runs").update({status:"error",error:String(e?.message||e).slice(0,1000),updated_at:new Date().toISOString()}).eq("id",runId)}return}}
export async function GET(req:Request){const u=new URL(req.url),mode=u.searchParams.get("hub.mode"),token=u.searchParams.get("hub.verify_token"),challenge=u.searchParams.get("hub.challenge");if(mode==="subscribe"&&token===env("META_WEBHOOK_VERIFY_TOKEN")&&challenge)return new NextResponse(challenge,{status:200,headers:{"Content-Type":"text/plain"}});return new NextResponse("Forbidden",{status:403})}
export async function POST(req:Request){
 const raw=await req.text();
 const sig=req.headers.get("x-hub-signature-256")||"";
 const expected="sha256="+crypto.createHmac("sha256",env("META_INSTAGRAM_APP_SECRET")).update(raw).digest("hex");
 if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected))){
  return new NextResponse("Invalid signature",{status:401});
 }
 let payload:any;
 try{payload=JSON.parse(raw)}catch{return new NextResponse("Bad request",{status:400})}
 const db=supabaseAdmin();
 await db.from("meta_webhook_events").insert({platform:"instagram",event_type:String(payload.object||"instagram"),payload});

 for(const entry of payload.entry||[]){
  const accountId=String(entry.id||"");
  if(!accountId)continue;

  const direct=await db.from("meta_instagram_accounts")
   .select("id,user_id,instagram_user_id,webhook_user_id,access_token")
   .or(`instagram_user_id.eq.${accountId},webhook_user_id.eq.${accountId}`)
   .maybeSingle();
  let account=direct.data;

  // Resolve VYRAL-published media from the publication ledger before any API fallback.
  // Both video and carousel publishing persist the final Instagram media id and account id here.
  if(!account){
   const mediaId=String((entry.changes||[]).find((x:any)=>x.field==="comments")?.value?.media?.id||"");
   if(mediaId){
    const pub=await db.from("scheduled_publications")
     .select("targets")
     .eq("status","published")
     .eq("platform_results->instagram->>mediaId",mediaId)
     .order("scheduled_at",{ascending:false})
     .limit(1)
     .maybeSingle();
    const target=Array.isArray(pub.data?.targets)?pub.data.targets.find((x:any)=>x?.platform==="instagram"&&x?.accountId):null;
    if(target?.accountId){
     const owned=await db.from("meta_instagram_accounts")
      .select("id,user_id,instagram_user_id,webhook_user_id,access_token")
      .eq("id",String(target.accountId))
      .maybeSingle();
     account=owned.data||null;
    }
   }
  }

  // Instagram Login and webhook events can expose different account-id namespaces.
  // Resolve comment events by proving which connected token owns the event media.
  if(!account){
   const mediaId=String((entry.changes||[]).find((x:any)=>x.field==="comments")?.value?.media?.id||"");
   if(mediaId){
    const all=await db.from("meta_instagram_accounts").select("id,user_id,instagram_user_id,webhook_user_id,access_token");
    for(const candidate of all.data||[]){
     try{
      const u=new URL(`${GRAPH}/${VER}/${encodeURIComponent(mediaId)}`);
      u.searchParams.set("fields","id");
      u.searchParams.set("access_token",candidate.access_token);
      const r=await fetch(u,{cache:"no-store"});
      const j=await r.json().catch(()=>({}));
      if(r.ok&&!j.error&&String(j.id)===mediaId){account=candidate;break}
     }catch{}
    }
   }
  }

  if(!account&&Array.isArray(entry.messaging)&&entry.messaging.length){
   const ids=[...new Set(entry.messaging.flatMap((m:any)=>[
    String(m?.recipient?.id||""),String(m?.sender?.id||"")
   ]).filter((x:string)=>/^\\d+$/.test(x)))];
   if(ids.length){
    const csv=ids.join(",");
    const matched=await db.from("meta_instagram_accounts")
      .select("id,user_id,instagram_user_id,webhook_user_id,access_token")
      .or(`instagram_user_id.in.(${csv}),webhook_user_id.in.(${csv})`).limit(2);
    account=(matched.data||[])[0]||null;
   }
  }

  if(!account)continue;
  for(const ch of entry.changes||[]){
   if(ch.field==="comments")await processComment(db,account,ch.value);
  }
  for(const m of entry.messaging||[]){
   await processMessage(db,account,m);
  }
 }
 return NextResponse.json({ok:true});
}
