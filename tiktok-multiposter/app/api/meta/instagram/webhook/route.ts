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
async function aiDecision(a:any,text:string){if(a.triggerMode!=="ai_intent")return{match:deterministicMatch(a,text),dm:""};const key=process.env.VYRAL_CREATOR_PRODUCTION;if(!key)return{match:deterministicMatch(a,text),dm:""};const prompt=`Decidí si este comentario activa este agente de Instagram y redactá UNA respuesta privada breve si corresponde. Comentario: ${text}. Palabras/intenciones: ${JSON.stringify(a.keywords||[])}. Contexto: ${String(a.contentLabel||"")}. Objetivo: ${String(a.conversationGoal||"lead")}. Tono: ${String(a.aiTone||"natural")}. País: ${String(a.aiCountry||"")}. Reglas: ${String(a.aiInstructions||"")}. Base DM: ${String(a.dmMessage||"")}. No inventes precios ni datos. Respondé SOLO JSON {"match":true,"dm":"..."}. Si no corresponde, match=false.`;const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,max_output_tokens:350})}),j=await r.json().catch(()=>({}));if(!r.ok)return{match:deterministicMatch(a,text),dm:""};let out=String(j.output_text||"");if(!out)for(const x of j.output||[])for(const z of x.content||[])if(z.type==="output_text")out+=z.text||"";try{const x=JSON.parse(out.slice(out.indexOf("{"),out.lastIndexOf("}")+1));return{match:Boolean(x.match),dm:String(x.dm||"")}}catch{return{match:deterministicMatch(a,text),dm:""}}
}
async function ig(url:string,token:string,body?:any){const r=await fetch(url,{method:"POST",headers:{Authorization:`Bearer ${token}`,...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined,cache:"no-store"}),j=await r.json().catch(()=>({}));if(!r.ok||j.error)throw Error(j.error?.message||`Instagram HTTP ${r.status}`);return j}
async function signedMedia(db:any,path:string,seconds=86400){if(!path)return"";if(/^https:\/\//i.test(path))return path;const s=await db.storage.from("scheduled-media").createSignedUrl(path,seconds);return String(s.data?.signedUrl||"")}
function resourceType(name:string,mime:string=""){const n=String(name||"").toLowerCase(),m=String(mime||"").toLowerCase();if(m.startsWith("image/")||/\.(png|jpe?g|gif|webp)(?:$|\?)/.test(n))return"image";if(m.startsWith("video/")||/\.(mp4|mov)(?:$|\?)/.test(n))return"video";if(m.startsWith("audio/")||/\.(mp3|m4a|aac|ogg|webm)(?:$|\?)/.test(n))return"audio";return"file"}
async function sendAttachment(account:any,recipient:any,type:string,url:string){return ig(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,account.access_token,{recipient,message:{attachment:{type,payload:{url}}}})}
async function processMessage(db:any,account:any,m:any){
 const senderId=String(m?.sender?.id||""),recipientId=String(m?.recipient?.id||""),mid=String(m?.message?.mid||""),text=String(m?.message?.text||"").trim();
 if(!senderId||!mid||!text||m?.message?.is_echo)return;
 const selfIds=new Set([String(account.instagram_user_id||""),String(account.webhook_user_id||""),recipientId].filter(Boolean));if(selfIds.has(senderId))return;
 const u=await db.auth.admin.getUserById(account.user_id),meta=u.data?.user?.user_metadata||{};if(!automationAccess(meta))return;
 const rules=(meta.vyral_automations||[]).filter((a:any)=>a.enabled&&a.platforms?.includes("instagram")&&a.continueConversation!==false&&a.dmEnabled!==false);if(!rules.length)return;
 const prevs=await db.from("instagram_automation_runs").select("automation_id,media_id").eq("account_id",account.id).eq("commenter_id",senderId).order("created_at",{ascending:false}).limit(8);
 const prev=(prevs.data||[]).find((x:any)=>x.automation_id),a=rules.find((x:any)=>x.id===prev?.automation_id)||rules[0];
 const openingState=await db.from("instagram_conversation_state").select("context_payload").eq("account_id",account.id).eq("contact_id",senderId).eq("automation_id",String(a.id||"")).maybeSingle();
 const openingContext=openingState.data?.context_payload||{};
 if(openingContext?.opening_in_progress===true)return;
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
 const u=await db.auth.admin.getUserById(account.user_id),meta=u.data?.user?.user_metadata||{};if(!automationAccess(meta))return;const rules=(meta.vyral_automations||[]).filter((a:any)=>a.enabled&&a.platforms?.includes("instagram")&&(!Array.isArray(a.targetMediaIds)||!a.targetMediaIds.length||a.targetMediaIds.includes(mediaId))).sort((a:any,b:any)=>String(b.createdAt||"").localeCompare(String(a.createdAt||"")));for(const a of rules){let decision=await aiDecision(a,text);const normalized=text.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").trim().toLowerCase();const context=String(a.contentLabel||"").normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").toLowerCase();const explicitCta=[...(a.keywords||[]).map((x:any)=>String(x)),...Array.from(context.matchAll(/(?:comenta|comentá|escribi|escribí|manda|mandá)\\s+([a-z0-9_-]{2,30})/gi)).map((m:any)=>m[1])].map((x:string)=>x.normalize("NFD").replace(/[\\u0300-\\u036f]/g,"").trim().toLowerCase()).filter(Boolean);if(explicitCta.includes(normalized))decision={match:true,dm:""};if(!decision.match)continue;
 const ins=await db.from("instagram_automation_runs").insert({user_id:account.user_id,account_id:account.id,automation_id:a.id,comment_id:commentId,media_id:mediaId||null,commenter_id:fromId||null,commenter_username:username||null,comment_text:text,status:"processing",detail:{triggerMode:a.triggerMode}}).select("id").maybeSingle();if(ins.error){if(String(ins.error.code)==="23505")return;throw ins.error}const runId=ins.data?.id;
 try{let publicId="",messageId="";if(a.publicReplyEnabled){const publicReply=publicReplyForComment(a,text,username,commentId);if(publicReply){try{const j=await ig(`${GRAPH}/${VER}/${encodeURIComponent(commentId)}/replies?message=${encodeURIComponent(publicReply)}`,account.access_token);publicId=String(j.id||"")}catch(e){console.error("[VYRAL Instagram] public reply failed",e)}}}
 const voiceAssets=Array.isArray(a.voiceAssets)?a.voiceAssets:[];const firstVoice=voiceAssets.find((v:any)=>{if(!v?.url)return false;const stage=norm(v.stage),allowed=Array.isArray(v.allowed_origins)?v.allowed_origins.map((x:any)=>norm(x)):[];if(allowed.length&&!allowed.includes("post_comment"))return false;if(stage==="opening")return true;const semantic=norm(`${v.name||""} ${v.when||""} ${v.purpose||""}`);return /primer|inicio|opening|bienven|saludo|abrir conversaci[oó]n|comenta(?:r|rio|ste| la publicaci[oó]n)?|coment[oó]|responde(?:r| a una historia)?|historia relacionada/.test(semantic)});const shortName=instagramFirstName(username);/* Comment-triggered automations are opening-audio driven. Never fall back to an AI/base sales DM here: that reintroduced the old "vi tu comentario / querés el link" opener. */if(a.dmEnabled&&!firstVoice?.url){await db.from("instagram_automation_runs").update({status:"error",error:"opening_voice_missing",updated_at:new Date().toISOString(),detail:{triggerMode:a.triggerMode,reason:"opening_voice_required"}}).eq("id",runId);console.error("[VYRAL Instagram] matched comment has no OPENING voice asset",a.id);return}const dm=firstVoice?.url?shortName:"";
 if(a.dmEnabled&&(dm||firstVoice)){
   // Reserve the opening state BEFORE the first outbound message. Any concurrent
   // messaging webhook sees opening_in_progress and cannot invoke the AI engine.
   if(firstVoice?.url&&fromId){
     await db.from("instagram_conversation_state").upsert({
       user_id:account.user_id,account_id:account.id,automation_id:String(a.id||""),contact_id:fromId,
       current_stage:"opening",origin:"post_comment",
       context_payload:{post_title:String(a.contentLabel||""),media_id:mediaId,target_topic:String(a.contentLabel||""),opening_in_progress:true,opening_sent:false},
       last_audio_id:null,voice_assets_sent:[],resources_offered:[],resources_sent:[],pending_resource_id:null,last_intent:"opening",updated_at:new Date().toISOString()
     },{onConflict:"account_id,contact_id,automation_id"});
   }
   if(dm){const j=await ig(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,account.access_token,{recipient:{comment_id:commentId},message:{text:dm}});messageId=String(j.message_id||"")}
   // Send the owner-configured opening audio immediately when Meta exposes a DM-addressable commenter id.
   if(firstVoice?.url&&fromId){const audioUrl=await signedMedia(db,String(firstVoice.url));if(audioUrl){try{const aj:any=await Promise.race([sendAttachment(account,{id:fromId},"audio",audioUrl),new Promise((_,reject)=>setTimeout(()=>reject(new Error("audio_timeout")),8000))]);if(!messageId)messageId=String(aj?.message_id||"");await db.from("instagram_conversation_state").upsert({user_id:account.user_id,account_id:account.id,automation_id:String(a.id||""),contact_id:fromId,current_stage:"discovery",origin:"post_comment",context_payload:{post_title:String(a.contentLabel||""),media_id:mediaId,target_topic:String(a.contentLabel||""),opening_in_progress:false,opening_sent:true},last_audio_id:String(firstVoice.id||""),voice_assets_sent:firstVoice.id?[String(firstVoice.id)]:[],resources_offered:[],resources_sent:[],pending_resource_id:null,last_intent:"opening",updated_at:new Date().toISOString()},{onConflict:"account_id,contact_id,automation_id"});await db.from("vyral_inbox_messages").insert({user_id:account.user_id,account_id:account.id,platform:"instagram",contact_id:fromId,contact_username:username||null,message_id:String(aj?.message_id||`audio:${commentId}`),body:`[Audio enviado: ${String(firstVoice.transcript||firstVoice.name||"opening")}]`,direction:"out",sender_type:"ai",automation_id:a.id,attachment_type:"audio",attachment_meta:{voiceId:firstVoice.id||null,stage:"opening"}})}catch(e){console.error("[VYRAL Instagram] opening audio failed",e);await db.from("instagram_conversation_state").update({context_payload:{post_title:String(a.contentLabel||""),media_id:mediaId,target_topic:String(a.contentLabel||""),opening_in_progress:false,opening_sent:false},updated_at:new Date().toISOString()}).eq("account_id",account.id).eq("contact_id",fromId).eq("automation_id",String(a.id||""))}}}
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
