import crypto from "crypto";
import {NextResponse} from "next/server";
import {env} from "../../../../../lib/env";
import {supabaseAdmin} from "../../../../../lib/supabase-admin";
export const maxDuration=60;
const GRAPH="https://graph.instagram.com",VER=process.env.META_GRAPH_API_VERSION||"v24.0";
function norm(s:any){return String(s||"").trim().toLowerCase()}
function automationAccess(meta:any){const plan=String(meta?.plan||"");const end=meta?.subscription_current_period_end||meta?.current_period_end;return ["inicio","pro","escala","ai"].includes(plan)&&(!end||new Date(String(end)).getTime()>Date.now())&&!meta?.vyral_automations_paused}
function instagramFirstName(username:any,name:any=""){const raw=String(name||username||"").trim().replace(/^@/,"");if(!raw)return"";let token=raw.split(/[._\-\s]+/).map((x:string)=>x.replace(/\d+/g,"").trim()).find((x:string)=>/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,24}$/.test(x))||"";if(!token)return"";token=token.charAt(0).toUpperCase()+token.slice(1).toLowerCase();const n=token.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();const nick:Record<string,string>={tobias:"Tobi",francisco:"Fran",franco:"Fran",alejandro:"Ale",alejandra:"Ale",agustin:"Agus",agustina:"Agus",santiago:"Santi",sebastian:"Seba",federico:"Fede",valentina:"Vale",matias:"Mati",nicolas:"Nico",luciano:"Lucho",maximiliano:"Maxi",facundo:"Facu",camila:"Cami",carolina:"Caro",catalina:"Cata",victoria:"Vicky",martina:"Marti",rodrigo:"Rodri",ignacio:"Nacho",guillermo:"Guille",gabriel:"Gabi",gabriela:"Gabi",daniela:"Dani",daniel:"Dani",manuel:"Manu",manuela:"Manu"};return nick[n]||token}
function personalizeFirstDm(text:string,username:string){const name=instagramFirstName(username);if(!name)return text;const clean=String(text||"").trim();if(!clean)return name;return clean.toLowerCase().startsWith(name.toLowerCase())?clean:`${name}, ${clean.charAt(0).toLowerCase()+clean.slice(1)}`}
function deterministicMatch(a:any,text:string){const t=norm(text),ks=(a.keywords||[]).map(norm).filter(Boolean),ex=(a.excludeKeywords||[]).map(norm).filter(Boolean);if(ex.some((x:string)=>t.includes(x)))return false;if(a.triggerMode==="exact")return ks.some((x:string)=>t===x);if(a.triggerMode==="contains")return ks.some((x:string)=>t.includes(x));return ks.some((x:string)=>t.includes(x))}
async function aiDecision(a:any,text:string){if(a.triggerMode!=="ai_intent")return{match:deterministicMatch(a,text),dm:String(a.dmMessage||"")};const key=process.env.VYRAL_CREATOR_PRODUCTION;if(!key)return{match:deterministicMatch(a,text),dm:String(a.dmMessage||"")};const prompt=`Decidí si este comentario activa este agente de Instagram y redactá UNA respuesta privada breve si corresponde. Comentario: ${text}. Palabras/intenciones: ${JSON.stringify(a.keywords||[])}. Contexto: ${String(a.contentLabel||"")}. Objetivo: ${String(a.conversationGoal||"lead")}. Tono: ${String(a.aiTone||"natural")}. País: ${String(a.aiCountry||"")}. Reglas: ${String(a.aiInstructions||"")}. Base DM: ${String(a.dmMessage||"")}. No inventes precios ni datos. Respondé SOLO JSON {"match":true,"dm":"..."}. Si no corresponde, match=false.`;const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,max_output_tokens:350})}),j=await r.json().catch(()=>({}));if(!r.ok)return{match:deterministicMatch(a,text),dm:String(a.dmMessage||"")};let out=String(j.output_text||"");if(!out)for(const x of j.output||[])for(const z of x.content||[])if(z.type==="output_text")out+=z.text||"";try{const x=JSON.parse(out.slice(out.indexOf("{"),out.lastIndexOf("}")+1));return{match:Boolean(x.match),dm:String(x.dm||a.dmMessage||"")}}catch{return{match:deterministicMatch(a,text),dm:String(a.dmMessage||"")}}
}
async function ig(url:string,token:string,body?:any){const r=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${token}`,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,cache:"no-store"}),j=await r.json().catch(()=>({}));if(!r.ok||j.error)throw Error(j.error?.message||`Instagram HTTP ${r.status}`);return j}
async function signedMedia(db:any,path:string,seconds=86400){if(!path)return"";if(/^https:\/\//i.test(path))return path;const s=await db.storage.from("scheduled-media").createSignedUrl(path,seconds);return String(s.data?.signedUrl||"")}
function resourceType(name:string){const n=String(name||"").toLowerCase();if(/\.(png|jpe?g|gif|webp)$/.test(n))return"image";if(/\.(mp4|mov)$/.test(n))return"video";if(/\.(mp3|m4a|aac|ogg|webm)$/.test(n))return"audio";return"file"}
async function sendAttachment(account:any,recipient:any,type:string,url:string){return ig(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,account.access_token,{recipient,message:{attachment:{type:type==="audio"?"file":type,payload:{url}}}})}
function chooseVoice(a:any,text:string,first=false){const vs=Array.isArray(a.voiceAssets)?a.voiceAssets.filter((v:any)=>v?.url):[];if(!a.voiceEnabled||!vs.length)return null;if(first)return vs[0];const t=norm(text);if(/\b(audio|voz|escuchar|mandame un audio|mándame un audio)\b/i.test(t))return vs.find((v:any)=>/audio|inicio|present|bienven|inform|venta|compr/i.test(`${v.name} ${v.purpose} ${v.when} ${v.transcript}`))||vs[0];let best:any=null,score=0;for(const v of vs){const words=norm(`${v.purpose} ${v.when} ${v.transcript}`).split(/\W+/).filter((x:string)=>x.length>4);const s=words.filter((w:string)=>t.includes(w)).length;if(s>score){score=s;best=v}}return score>0?best:null}
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
- Podés dividir la respuesta en 1 a 4 burbujas cortas para sonar natural. Variá longitud según el momento; no cortes una misma oración artificialmente.
- No uses siempre el nombre. No saludes de nuevo en cada turno. No digas que sos IA.
- No inventes precios, ingresos, resultados, testimonios, urgencia, experiencia personal ni características.
- Si existe una prueba/recurso, marcá sendResource=true SOLO cuando realmente respalde lo que se está hablando o el usuario lo pida. Nunca atribuyas a un archivo algo que su descripción no afirma.
- Si MODO=instant y el usuario pide el recurso/link, entregalo sin fricción.
- Si el objetivo es vender, calificá de forma progresiva: situación -> objetivo -> obstáculo -> encaje -> propuesta -> cierre. No interrogues; una pregunta por turno.
- Si el objetivo es entregar recurso/Discord, también podés conversar antes cuando MODO=human y ofrecerlo naturalmente.
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
 let contactUsername:string|null=null,contactName:string|null=null;
 try{const u=new URL(`${GRAPH}/${VER}/${encodeURIComponent(senderId)}`);u.searchParams.set("fields","username,name");u.searchParams.set("access_token",account.access_token);const r=await fetch(u,{cache:"no-store"}),j=await r.json().catch(()=>({}));if(r.ok&&!j.error){contactUsername=String(j.username||"").trim()||null;contactName=String(j.name||"").trim()||null}}catch{}
 const display=contactName||contactUsername||"",firstName=instagramFirstName(contactUsername,contactName);
 const msg=await db.from("vyral_inbox_messages").upsert({user_id:account.user_id,account_id:account.id,platform:"instagram",contact_id:senderId,contact_username:display||null,message_id:mid,body:text,direction:"in",sender_type:"contact"},{onConflict:"platform,message_id"}).select("id").maybeSingle();if(msg.error)throw msg.error;
 const existing=await db.from("vyral_handoffs").select("id,lead_score,automation_id,stage,priority,status").eq("user_id",account.user_id).eq("platform","instagram").eq("contact_id",senderId).maybeSingle();
 const conv=await db.from("vyral_handoffs").upsert({user_id:account.user_id,account_id:account.id,platform:"instagram",contact_id:senderId,contact_username:display||null,automation_id:existing.data?.automation_id||null,status:"open",reason:existing.data?"Conversación de Instagram":"Nuevo mensaje de Instagram",lead_score:Math.max(Number(existing.data?.lead_score||0),25),last_message:text,stage:existing.data?.stage||"new",priority:existing.data?.priority||"normal",unread:true,updated_at:new Date().toISOString()},{onConflict:"user_id,platform,contact_id",ignoreDuplicates:false}).select("id").single();if(conv.error)throw conv.error;
 const u=await db.auth.admin.getUserById(account.user_id),meta=u.data?.user?.user_metadata||{};if(!automationAccess(meta))return;
 const rules=(meta.vyral_automations||[]).filter((a:any)=>a.enabled&&a.platforms?.includes("instagram")&&a.continueConversation!==false&&a.dmEnabled!==false);if(!rules.length)return;
 const prevs=await db.from("instagram_automation_runs").select("automation_id,created_at").eq("account_id",account.id).eq("commenter_id",senderId).order("created_at",{ascending:false}).limit(8);
 const prev=(prevs.data||[]).find((x:any)=>x.automation_id),a={...(rules.find((x:any)=>x.id===prev?.automation_id)||rules[0]),__userId:account.user_id};
 const inbox=await db.from("vyral_inbox_messages").select("body,direction,sender_type,created_at").eq("account_id",account.id).eq("contact_id",senderId).order("created_at",{ascending:false}).limit(30);
 const history=(inbox.data||[]).slice().reverse().map((x:any)=>`${x.direction==="in"?"Usuario":"Agente"}: ${String(x.body||"")}`).join("\n").slice(-12000);
 let decision:any;try{decision=await conversationReply(a,text,history,firstName)}catch{decision={messages:[String(a.dmMessage||"Gracias por escribir. ¿En qué te puedo ayudar?")],sendResource:false}}
 let messages=(decision.messages||[]).map((x:any)=>String(x||"").trim()).filter(Boolean).slice(0,4);if(!messages.length)return;
 const humanRequest=/\b(humano|persona real|asesor|vendedor|operador|hablar con alguien|que me contacten|llamame|llámame)\b/i.test(text),hotSignals=[/\b(comprar|contratar|pagar|precio|cuanto sale|cuánto sale|quiero arrancar|quiero empezar|link de pago|transferir)\b/i,/\b(hoy|ahora|ya mismo|urgente)\b/i,/\b(tarjeta|transferencia|mercado pago|usd|dolar|dólar)\b/i].filter(x=>x.test(text)).length,leadScore=Math.min(100,(humanRequest?90:45)+hotSignals*15);
 if(a.humanHandoff!==false&&(humanRequest||leadScore>=75)){await db.from("vyral_handoffs").update({automation_id:a.id,reason:humanRequest?"Pidió hablar con una persona":"VYRAL AI detectó intención de compra alta",lead_score:leadScore,last_message:text,unread:true,updated_at:new Date().toISOString()}).eq("id",conv.data.id);if(humanRequest)messages=["Perfecto. Ya avisé al equipo para que una persona continúe esta conversación por acá."]}
 const asksResource=/\b(reenvi|reenví|manda|mandá|envia|enviá|guia|guía|pdf|archivo|link|recurso|catalogo|catálogo|ficha|prueba|resultado|resultados|evidencia|backtest|win rate)\b/i.test(text);
 const priorAgentMessages=(inbox.data||[]).filter((x:any)=>x.direction==="out").length,voice=chooseVoice(a,text,false)||((a.voiceEnabled&&priorAgentMessages<=1&&Array.isArray(a.voiceAssets))?a.voiceAssets.find((v:any)=>v?.url):null);
 const chosen=(decision.resourcePool||[]).find((r:any)=>String(r.id)===String(decision.resourceId))||((a.conversationMode==="instant"&&asksResource)?(decision.resourcePool||[])[0]:null),shouldResource=Boolean(chosen&&(decision.sendResource||(a.conversationMode==="instant"&&asksResource)));
 const syntheticId=`dm:${mid}`,ins=await db.from("instagram_automation_runs").insert({user_id:account.user_id,account_id:account.id,automation_id:a.id,comment_id:syntheticId,commenter_id:senderId,commenter_username:display||null,comment_text:text,status:"matched",detail:{source:"instagram_dm",continueConversation:true}}).select("id").maybeSingle();if(ins.error){if(String(ins.error.code)==="23505")return;throw ins.error}
 try{
  let last:any=null;
  for(const bubble of messages){last=await ig(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,account.access_token,{recipient:{id:senderId},message:{text:bubble}});await db.from("vyral_inbox_messages").insert({user_id:account.user_id,account_id:account.id,platform:"instagram",contact_id:senderId,contact_username:display||null,message_id:String(last.message_id||crypto.randomUUID()),body:bubble,direction:"out",sender_type:humanRequest?"system":"ai",automation_id:a.id})}
  if(voice){const audioUrl=await signedMedia(db,String(voice.url));if(audioUrl){try{await Promise.race([sendAttachment(account,{id:senderId},"audio",audioUrl),new Promise((_,reject)=>setTimeout(()=>reject(new Error("audio_timeout")),8000))])}catch{}}}
  if(shouldResource&&chosen){const resourceUrl=chosen.kind==="url"?String(chosen.external_url||""):await signedMedia(db,String(chosen.storage_path||""),604800);if(resourceUrl){if(chosen.kind==="url"){const linkText=`${chosen.name||"Te dejo el link"}: ${resourceUrl}`;const lj=await ig(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,account.access_token,{recipient:{id:senderId},message:{text:linkText}});await db.from("vyral_inbox_messages").insert({user_id:account.user_id,account_id:account.id,platform:"instagram",contact_id:senderId,contact_username:display||null,message_id:String(lj.message_id||crypto.randomUUID()),body:linkText,direction:"out",sender_type:"ai",automation_id:a.id})}else await sendAttachment(account,{id:senderId},resourceType(String(chosen.name||chosen.storage_path)),resourceUrl)}}
  await db.from("vyral_handoffs").update({automation_id:a.id,last_message:messages[messages.length-1],stage:decision.stage||existing.data?.stage||"curious",updated_at:new Date().toISOString()}).eq("id",conv.data.id);
  await db.from("instagram_automation_runs").update({status:"sent",private_message_id:String(last?.message_id||"")||null,updated_at:new Date().toISOString(),detail:{source:"instagram_dm",continueConversation:true,resourceSent:shouldResource,voiceSent:voice?.id||null,bubbles:messages.length}}).eq("id",ins.data?.id)
 }catch(e:any){await db.from("instagram_automation_runs").update({status:"error",error:String(e?.message||e).slice(0,1000),updated_at:new Date().toISOString()}).eq("id",ins.data?.id)}
}
async function processComment(db:any,account:any,value:any){const commentId=String(value?.id||""),text=String(value?.text||""),fromId=String(value?.from?.id||""),username=String(value?.from?.username||""),mediaId=String(value?.media?.id||"");if(!commentId||!text||fromId===String(account.instagram_user_id))return;
 const u=await db.auth.admin.getUserById(account.user_id),meta=u.data?.user?.user_metadata||{};if(!automationAccess(meta))return;const rules=(meta.vyral_automations||[]).filter((a:any)=>a.enabled&&a.platforms?.includes("instagram")&&(!Array.isArray(a.targetMediaIds)||!a.targetMediaIds.length||a.targetMediaIds.includes(mediaId))).sort((a:any,b:any)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));for(const a of rules){let decision=await aiDecision(a,text);const normalized=text.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").trim().toLowerCase();const context=String(a.contentLabel||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();const explicitCta=[...(a.keywords||[]).map((x:any)=>String(x)),...Array.from(context.matchAll(/(?:comenta|comentá|escribi|escribí|manda|mandá)\\s+([a-z0-9_-]{2,30})/gi)).map((m:any)=>m[1])].map((x:string)=>x.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").trim().toLowerCase()).filter(Boolean);if(explicitCta.includes(normalized))decision={match:true,dm:String(decision.dm||a.dmMessage||"")};if(!decision.match)continue;
 const ins=await db.from("instagram_automation_runs").insert({user_id:account.user_id,account_id:account.id,automation_id:a.id,comment_id:commentId,media_id:mediaId||null,commenter_id:fromId||null,commenter_username:username||null,comment_text:text,status:"matched",detail:{triggerMode:a.triggerMode}}).select("id").maybeSingle();if(ins.error){if(String(ins.error.code)==="23505")return;throw ins.error}const runId=ins.data?.id;
 try{let publicId="",messageId="";if(a.publicReplyEnabled&&String(a.publicReply||"").trim()){const j=await ig(`${GRAPH}/${VER}/${encodeURIComponent(commentId)}/replies?message=${encodeURIComponent(String(a.publicReply).trim())}`,account.access_token);publicId=String(j.id||"")}
 let dm=String(decision.dm||a.dmMessage||"").trim();const firstVoice=chooseVoice(a,text,true),shortName=instagramFirstName(username);if(firstVoice?.url&&shortName&&a.personalizeName!==false)dm=shortName;else if(a.personalizeName!==false)dm=personalizeFirstDm(dm,username);if(a.conversationMode==="instant"){if(a.dmLink)dm=`${dm}\n\n${a.dmLink}`.trim();if(a.resourceUrl&&String(a.resourceUrl).startsWith("automation-resource/")){const s=await db.storage.from("scheduled-media").createSignedUrl(String(a.resourceUrl),604800);if(s.data?.signedUrl)dm=`${dm}\n\n${a.resourceName||"Guía"}: ${s.data.signedUrl}`.trim()}else if(a.resourceUrl)dm=`${dm}\n\n${a.resourceUrl}`.trim()}
 if(a.dmEnabled&&(dm||firstVoice)){
   if(dm){const j=await ig(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,account.access_token,{recipient:{comment_id:commentId},message:{text:dm}});messageId=String(j.message_id||"")}
   // Send the owner-configured opening audio immediately when Meta exposes a DM-addressable commenter id.\n   if(firstVoice?.url&&fromId){const audioUrl=await signedMedia(db,String(firstVoice.url));if(audioUrl){try{const aj:any=await Promise.race([sendAttachment(account,{id:fromId},"audio",audioUrl),new Promise((_,reject)=>setTimeout(()=>reject(new Error("audio_timeout")),8000))]);if(!messageId)messageId=String(aj?.message_id||"")}catch{/* Meta can reject media before the private thread opens; the text still goes out and DM continuation can retry audio after reply. */}}}
  }
 await db.from("instagram_automation_runs").update({status:"sent",public_reply_id:publicId||null,private_message_id:messageId||null,updated_at:new Date().toISOString(),detail:{triggerMode:a.triggerMode,resource:Boolean(a.resourceUrl)}}).eq("id",runId)}catch(e:any){await db.from("instagram_automation_runs").update({status:"error",error:String(e?.message||e).slice(0,1000),updated_at:new Date().toISOString()}).eq("id",runId)}return}}
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
