import crypto from "crypto";
import {NextResponse} from "next/server";
import {env} from "../../../../../lib/env";
import {supabaseAdmin} from "../../../../../lib/supabase-admin";
export const maxDuration=60;
const GRAPH="https://graph.instagram.com",VER=process.env.META_GRAPH_API_VERSION||"v24.0";
function norm(s:any){return String(s||"").trim().toLowerCase()}
function automationAccess(meta:any){const plan=String(meta?.plan||"");const end=meta?.subscription_current_period_end||meta?.current_period_end;return ["inicio","pro","escala","ai"].includes(plan)&&(!end||new Date(String(end)).getTime()>Date.now())&&!meta?.vyral_automations_paused}
function deterministicMatch(a:any,text:string){const t=norm(text),ks=(a.keywords||[]).map(norm).filter(Boolean),ex=(a.excludeKeywords||[]).map(norm).filter(Boolean);if(ex.some((x:string)=>t.includes(x)))return false;if(a.triggerMode==="exact")return ks.some((x:string)=>t===x);if(a.triggerMode==="contains")return ks.some((x:string)=>t.includes(x));return ks.some((x:string)=>t.includes(x))}
async function aiDecision(a:any,text:string){if(a.triggerMode!=="ai_intent")return{match:deterministicMatch(a,text),dm:String(a.dmMessage||"")};const key=process.env.VYRAL_OPENAI_ADMIN_KEY||process.env.OPENAI_API_KEY;if(!key)return{match:deterministicMatch(a,text),dm:String(a.dmMessage||"")};const prompt=`Decidí si este comentario activa este agente de Instagram y redactá UNA respuesta privada breve si corresponde. Comentario: ${text}. Palabras/intenciones: ${JSON.stringify(a.keywords||[])}. Contexto: ${String(a.contentLabel||"")}. Objetivo: ${String(a.conversationGoal||"lead")}. Tono: ${String(a.aiTone||"natural")}. País: ${String(a.aiCountry||"")}. Reglas: ${String(a.aiInstructions||"")}. Base DM: ${String(a.dmMessage||"")}. No inventes precios ni datos. Respondé SOLO JSON {"match":true,"dm":"..."}. Si no corresponde, match=false.`;const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,max_output_tokens:350})}),j=await r.json().catch(()=>({}));if(!r.ok)return{match:deterministicMatch(a,text),dm:String(a.dmMessage||"")};let out=String(j.output_text||"");if(!out)for(const x of j.output||[])for(const z of x.content||[])if(z.type==="output_text")out+=z.text||"";try{const x=JSON.parse(out.slice(out.indexOf("{"),out.lastIndexOf("}")+1));return{match:Boolean(x.match),dm:String(x.dm||a.dmMessage||"")}}catch{return{match:deterministicMatch(a,text),dm:String(a.dmMessage||"")}}
}
async function ig(url:string,token:string,body?:any){const r=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${token}`,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,cache:"no-store"}),j=await r.json().catch(()=>({}));if(!r.ok||j.error)throw Error(j.error?.message||`Instagram HTTP ${r.status}`);return j}
async function conversationReply(a:any,text:string,history:string=""){const key=process.env.OPENAI_API_KEY;if(!key)return String(a.dmMessage||"Gracias por escribir. ¿En qué te puedo ayudar?");const prompt=`Sos el agente de Instagram de este negocio. Continuá la conversación por DM de forma breve, natural y útil. Conversación reciente: ${history||"Sin historial adicional"}. Mensaje nuevo del usuario: ${text}. Contexto del contenido/oferta: ${String(a.contentLabel||"")}. Objetivo: ${String(a.conversationGoal||"lead")}. Tono: ${String(a.aiTone||"natural")}. País: ${String(a.aiCountry||"")}. Reglas: ${String(a.aiInstructions||"")}. Recordá lo ya dicho y no repitas instrucciones ni respuestas. Si el usuario pide que vuelvas a enviar un recurso ya ofrecido, confirmalo brevemente sin decirle que vuelva a comentar. No inventes precios, condiciones ni datos que no estén en el contexto. Hacé como máximo una pregunta por respuesta. No digas que sos una IA. Respondé SOLO el texto que se debe enviar.`;const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,max_output_tokens:250})}),j=await r.json().catch(()=>({}));if(!r.ok)return String(a.dmMessage||"Gracias por escribir. ¿En qué te puedo ayudar?");let out=String(j.output_text||"");if(!out)for(const x of j.output||[])for(const z of x.content||[])if(z.type==="output_text")out+=z.text||"";return out.trim().slice(0,1800)||String(a.dmMessage||"Gracias por escribir. ¿En qué te puedo ayudar?")}
async function processMessage(db:any,account:any,m:any){
 const senderId=String(m?.sender?.id||""),recipientId=String(m?.recipient?.id||""),mid=String(m?.message?.mid||""),text=String(m?.message?.text||"").trim();
 if(!senderId||!mid||!text||m?.message?.is_echo)return;
 const selfIds=new Set([String(account.instagram_user_id||""),recipientId]);if(selfIds.has(senderId))return;
 // Every real inbound DM belongs in Inbox. Automation is optional and runs afterwards.
 let contactUsername:string|null=null;
 try{const u=new URL(`${GRAPH}/${VER}/${encodeURIComponent(senderId)}`);u.searchParams.set("fields","username,name");u.searchParams.set("access_token",account.access_token);const r=await fetch(u,{cache:"no-store"}),j=await r.json().catch(()=>({}));if(r.ok&&!j.error)contactUsername=String(j.username||j.name||"").trim()||null}catch{}
 const msg=await db.from("vyral_inbox_messages").upsert({user_id:account.user_id,account_id:account.id,platform:"instagram",contact_id:senderId,contact_username:contactUsername,message_id:mid,body:text,direction:"in",sender_type:"contact"},{onConflict:"platform,message_id"}).select("id").maybeSingle();
 if(msg.error)throw msg.error;
 const existing=await db.from("vyral_handoffs").select("id,lead_score,automation_id,stage,priority,status").eq("user_id",account.user_id).eq("platform","instagram").eq("contact_id",senderId).maybeSingle();
 const baseScore=Math.max(Number(existing.data?.lead_score||0),25);
 const conv=await db.from("vyral_handoffs").upsert({user_id:account.user_id,account_id:account.id,platform:"instagram",contact_id:senderId,contact_username:contactUsername,automation_id:existing.data?.automation_id||null,status:"open",reason:existing.data?"Conversación de Instagram":"Nuevo mensaje de Instagram",lead_score:baseScore,last_message:text,stage:existing.data?.stage||"new",priority:existing.data?.priority||"normal",unread:true,updated_at:new Date().toISOString()},{onConflict:"user_id,platform,contact_id",ignoreDuplicates:false}).select("id").single();
 if(conv.error)throw conv.error;
 const u=await db.auth.admin.getUserById(account.user_id),meta=u.data?.user?.user_metadata||{};
 if(!automationAccess(meta))return;
 const rules=(meta.vyral_automations||[]).filter((a:any)=>a.enabled&&a.platforms?.includes("instagram")&&a.continueConversation!==false&&a.dmEnabled!==false);
 if(!rules.length)return;
 const prevs=await db.from("instagram_automation_runs").select("automation_id,commenter_id,comment_text,detail,created_at").eq("account_id",account.id).eq("commenter_id",senderId).order("created_at",{ascending:false}).limit(8);
 const prev=(prevs.data||[]).find((x:any)=>x.automation_id);let a=rules.find((x:any)=>x.id===prev?.automation_id)||rules[0];
 const history=(prevs.data||[]).slice().reverse().map((x:any)=>`Usuario: ${String(x.comment_text||"")}`).join("\n").slice(-4000);
 let reply=await conversationReply(a,text,history);if(!reply)return;
 const humanRequest=/\\b(humano|persona real|asesor|vendedor|operador|hablar con alguien|que me contacten|llamame|llámame)\\b/i.test(text),hotSignals=[/\\b(comprar|contratar|pagar|precio|cuanto sale|cuánto sale|quiero arrancar|quiero empezar|link de pago|transferir)\\b/i,/\\b(hoy|ahora|ya mismo|urgente)\\b/i,/\\b(tarjeta|transferencia|mercado pago|usd|dolar|dólar)\\b/i].filter(x=>x.test(text)).length,leadScore=Math.min(100,(humanRequest?90:45)+hotSignals*15);
 if(a.humanHandoff!==false&&(humanRequest||leadScore>=75)){await db.from("vyral_handoffs").update({automation_id:a.id,reason:humanRequest?"Pidió hablar con una persona":"VYRAL AI detectó intención de compra alta",lead_score:leadScore,last_message:text,unread:true,updated_at:new Date().toISOString()}).eq("id",conv.data.id);reply=humanRequest?"Perfecto. Ya avisé al equipo para que una persona continúe esta conversación por acá.":reply}
 const asksResource=/\\b(reenvi|reenví|manda|mandá|envia|enviá|guia|guía|pdf|archivo|link|recurso)\\b/i.test(text);if(asksResource&&a.resourceUrl){let url=String(a.resourceUrl);if(url.startsWith("automation-resource/")){const s=await db.storage.from("scheduled-media").createSignedUrl(url,604800);url=String(s.data?.signedUrl||"")}if(url)reply=`${reply}\n\n${a.resourceName||"Recurso"}: ${url}`.trim()}
 const syntheticId=`dm:${mid}`;const ins=await db.from("instagram_automation_runs").insert({user_id:account.user_id,account_id:account.id,automation_id:a.id,comment_id:syntheticId,commenter_id:senderId,commenter_username:contactUsername,comment_text:text,status:"matched",detail:{source:"instagram_dm",continueConversation:true}}).select("id").maybeSingle();if(ins.error){if(String(ins.error.code)==="23505")return;throw ins.error}
 try{const j=await ig(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,account.access_token,{recipient:{id:senderId},message:{text:reply}});await db.from("vyral_inbox_messages").insert({user_id:account.user_id,account_id:account.id,platform:"instagram",contact_id:senderId,contact_username:contactUsername,message_id:String(j.message_id||crypto.randomUUID()),body:reply,direction:"out",sender_type:humanRequest?"system":"ai",automation_id:a.id});await db.from("vyral_handoffs").update({automation_id:a.id,last_message:reply,updated_at:new Date().toISOString()}).eq("id",conv.data.id);await db.from("instagram_automation_runs").update({status:"sent",private_message_id:String(j.message_id||"")||null,updated_at:new Date().toISOString(),detail:{source:"instagram_dm",continueConversation:true,resourceResent:Boolean(asksResource&&a.resourceUrl)}}).eq("id",ins.data?.id)}catch(e:any){await db.from("instagram_automation_runs").update({status:"error",error:String(e?.message||e).slice(0,1000),updated_at:new Date().toISOString()}).eq("id",ins.data?.id)}
}
async function processComment(db:any,account:any,value:any){const commentId=String(value?.id||""),text=String(value?.text||""),fromId=String(value?.from?.id||""),username=String(value?.from?.username||""),mediaId=String(value?.media?.id||"");if(!commentId||!text||fromId===String(account.instagram_user_id))return;
 const u=await db.auth.admin.getUserById(account.user_id),meta=u.data?.user?.user_metadata||{};if(!automationAccess(meta))return;const rules=(meta.vyral_automations||[]).filter((a:any)=>a.enabled&&a.platforms?.includes("instagram")&&(!Array.isArray(a.targetMediaIds)||!a.targetMediaIds.length||a.targetMediaIds.includes(mediaId))).sort((a:any,b:any)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));for(const a of rules){let decision=await aiDecision(a,text);const normalized=text.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").trim().toLowerCase();const context=String(a.contentLabel||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();const explicitCta=[...(a.keywords||[]).map((x:any)=>String(x)),...Array.from(context.matchAll(/(?:comenta|comentá|escribi|escribí|manda|mandá)\\s+([a-z0-9_-]{2,30})/gi)).map((m:any)=>m[1])].map((x:string)=>x.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").trim().toLowerCase()).filter(Boolean);if(explicitCta.includes(normalized))decision={match:true,dm:String(decision.dm||a.dmMessage||"")};if(!decision.match)continue;
 const ins=await db.from("instagram_automation_runs").insert({user_id:account.user_id,account_id:account.id,automation_id:a.id,comment_id:commentId,media_id:mediaId||null,commenter_id:fromId||null,commenter_username:username||null,comment_text:text,status:"matched",detail:{triggerMode:a.triggerMode}}).select("id").maybeSingle();if(ins.error){if(String(ins.error.code)==="23505")return;throw ins.error}const runId=ins.data?.id;
 try{let publicId="",messageId="";if(a.publicReplyEnabled&&String(a.publicReply||"").trim()){const j=await ig(`${GRAPH}/${VER}/${encodeURIComponent(commentId)}/replies?message=${encodeURIComponent(String(a.publicReply).trim())}`,account.access_token);publicId=String(j.id||"")}
 let dm=String(decision.dm||a.dmMessage||"").trim();if(a.dmLink)dm=`${dm}\n\n${a.dmLink}`.trim();if(a.resourceUrl&&String(a.resourceUrl).startsWith("automation-resource/")){const s=await db.storage.from("scheduled-media").createSignedUrl(String(a.resourceUrl),604800);if(s.data?.signedUrl)dm=`${dm}\n\n${a.resourceName||"Guía"}: ${s.data.signedUrl}`.trim()}else if(a.resourceUrl)dm=`${dm}\n\n${a.resourceUrl}`.trim();
 if(a.dmEnabled&&dm){const j=await ig(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,account.access_token,{recipient:{comment_id:commentId},message:{text:dm}});messageId=String(j.message_id||"")}
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
   .select("id,user_id,instagram_user_id,access_token")
   .eq("instagram_user_id",accountId)
   .maybeSingle();
  let account=direct.data;

  // Instagram Login and webhook events can expose different account-id namespaces.
  // Resolve comment events by proving which connected token owns the event media.
  if(!account){
   const mediaId=String((entry.changes||[]).find((x:any)=>x.field==="comments")?.value?.media?.id||"");
   if(mediaId){
    const all=await db.from("meta_instagram_accounts").select("id,user_id,instagram_user_id,access_token");
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
    String(m?.recipient?.id||""),
    String(m?.sender?.id||"")
   ]).filter(Boolean))];
   if(ids.length){
    const all=await db.from("meta_instagram_accounts").select("id,user_id,instagram_user_id,access_token");
    account=(all.data||[]).find((x:any)=>ids.includes(String(x.instagram_user_id)))||null;
    if(!account&&(all.data||[]).length===1)account=(all.data||[])[0];
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
