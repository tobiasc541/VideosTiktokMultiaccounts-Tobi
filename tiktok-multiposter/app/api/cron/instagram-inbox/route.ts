import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const maxDuration = 60;
const GRAPH = "https://graph.instagram.com";
const VER = process.env.META_GRAPH_API_VERSION || "v24.0";

async function graph(url:string, token:string){
  const u=new URL(url);u.searchParams.set("access_token",token);
  const r=await fetch(u,{cache:"no-store"}),j=await r.json().catch(()=>({}));
  if(!r.ok||j.error)throw new Error(j.error?.message||`Instagram HTTP ${r.status}`);
  return j;
}
async function signedMedia(db:any,path:string,seconds=86400){if(!path)return"";if(/^https:\/\//i.test(path))return path;const s=await db.storage.from("scheduled-media").createSignedUrl(path,seconds);return String(s.data?.signedUrl||"")}
function resourceType(name:string){const n=String(name||"").toLowerCase();if(/\.(png|jpe?g|gif|webp)$/.test(n))return"image";if(/\.(mp4|mov)$/.test(n))return"video";if(/\.(mp3|m4a|aac|ogg|webm)$/.test(n))return"audio";return"file"}
async function sendAttachment(account:any,to:string,type:string,url:string){const r=await fetch(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,{method:"POST",headers:{Authorization:`Bearer ${account.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({recipient:{id:to},message:{attachment:{type:type==="audio"?"file":type,payload:{url}}}}),cache:"no-store"});const j=await r.json().catch(()=>({}));if(!r.ok||j.error)throw new Error(j.error?.message||`Instagram HTTP ${r.status}`);return j}
function chooseVoice(a:any,text:string){const vs=Array.isArray(a.voiceAssets)?a.voiceAssets.filter((v:any)=>v?.url):[];if(!a.voiceEnabled||!vs.length)return null;const t=String(text||"").toLowerCase();if(/\b(audio|voz|escuchar)\b/i.test(t))return vs.find((v:any)=>/audio|inicio|present|bienven|inform|venta|compr/i.test(`${v.name} ${v.purpose} ${v.when} ${v.transcript}`))||vs[0];let best:any=null,score=0;for(const v of vs){const words=String(`${v.purpose} ${v.when} ${v.transcript}`).toLowerCase().split(/\W+/).filter((x:string)=>x.length>4);const s=words.filter((w:string)=>t.includes(w)).length;if(s>score){score=s;best=v}}return score>0?best:null}
async function send(account:any,to:string,text:string){
  const r=await fetch(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,{method:"POST",headers:{Authorization:`Bearer ${account.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({recipient:{id:to},message:{text}}),cache:"no-store",signal:AbortSignal.timeout(12000)});
  const j=await r.json().catch(()=>({}));if(!r.ok||j.error)throw new Error(j.error?.message||`Instagram HTTP ${r.status}`);return j;
}
function automationAccess(meta:any){const plan=String(meta?.plan||"");const end=meta?.subscription_current_period_end||meta?.current_period_end;return ["inicio","pro","escala","ai"].includes(plan)&&(!end||new Date(String(end)).getTime()>Date.now())&&!meta?.vyral_automations_paused}
function mediaOf(m:any){const raw=Array.isArray(m?.attachments)?m.attachments:(m?.attachments?.data||[]);const a=raw?.[0]||m?.attachment||null;const url=String(a?.payload?.url||a?.payload?.media_url||a?.image_data?.url||a?.video_data?.url||a?.audio_data?.url||a?.file_url||a?.url||"");const declared=String(a?.type||"").toLowerCase();const type=declared.includes("image")||a?.image_data?"image":declared.includes("video")||a?.video_data?"video":declared.includes("audio")||a?.audio_data?"audio":/\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)?"image":url?"file":"";return {type,url,raw:a};}
async function aiReply(a:any,text:string,history:string="",images:string[]=[]){
  const key=process.env.VYRAL_CREATOR_PRODUCTION;if(!key)return String(a.dmMessage||"Gracias por escribir. ¿En qué te puedo ayudar?");
  const whatsapp=String(a.whatsappTarget||"").trim();
  const prompt=`Sos VYRAL Intelligence, el agente de Instagram de este negocio. Tu prioridad es comprender el MENSAJE NUEVO dentro de la conversación completa y avanzar sin sonar repetitivo.

CONVERSACIÓN RECIENTE REAL:
${history||"Sin historial adicional"}

MENSAJE NUEVO:
${text}

INFORMACIÓN DEL NEGOCIO/PUBLICACIÓN:
Contexto: ${String(a.contentLabel||"Sin contexto configurado")}
Objetivo: ${String(a.conversationGoal||"lead")}
Tono: ${String(a.aiTone||"natural")}
País: ${String(a.aiCountry||"")}
WhatsApp: ${whatsapp||"NO CONFIGURADO"}
CTA: ${String(a.ctaText||"")}
Reglas: ${String(a.aiInstructions||"")}

REGLAS DE INTELIGENCIA:
1. Antes de responder, revisá el historial. No repitas una pregunta, CTA, explicación, saludo, oferta ni instrucción que el agente ya haya enviado. No vuelvas a pedir que comente una palabra si ya la comentó.
2. Respondé específicamente a lo último que dijo la persona. Si ya contestó una pregunta anterior, avanzá al siguiente paso; no reinicies la conversación.
3. Podés usar búsqueda web SOLO cuando falte un dato PÚBLICO y verificable que razonablemente pueda conocerse por internet (información general, conceptos, datos públicos). No uses internet para inventar precios propios, stock, condiciones internas, promociones, disponibilidad, políticas privadas ni datos particulares del negocio.
4. Si la pregunta es MUY ESPECÍFICA del negocio y la respuesta no está explícitamente en el contexto, NO adivines. Explicá que podés derivarlo a una persona del equipo dentro de este mismo chat. No mandes a WhatsApp salvo que el usuario pida específicamente WhatsApp.
5. Si la respuesta sí está en el contexto, respondela acá; no derives innecesariamente.
6. Si usaste internet, distinguí lo público/general de lo específico del negocio y no presentes una fuente externa como si fuera información oficial del negocio.
7. Si pide hablar con una persona, confirmá brevemente que ya lo derivás a una persona del equipo en este mismo chat. Si pide WhatsApp específicamente, entregalo. Si pide audio, explicá brevemente que la atención automática es por texto.
8. Máximo una pregunta por respuesta. Preferí 1 a 3 frases cortas. Natural, útil y adaptado al país configurado.
9. Nunca inventes. Si no sabés y tampoco corresponde buscarlo en internet, derivá a WhatsApp cuando esté configurado.
10. Respondé SOLO el mensaje final que recibirá el usuario, sin JSON, sin análisis y sin encabezados.`;
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:[{role:"user",content:[{type:"input_text",text:prompt},...images.slice(0,4).map(image_url=>({type:"input_image",image_url}))]}],tools:[{type:"web_search",search_context_size:"low"}],tool_choice:"auto",max_output_tokens:350}),signal:AbortSignal.timeout(20000)}),j=await r.json().catch(()=>({}));
  if(!r.ok)return whatsapp?`Para no darte un dato incorrecto, escribinos por WhatsApp y hacé esa consulta ahí: ${whatsapp}`:String(a.dmMessage||"Gracias por escribir. ¿En qué te puedo ayudar?");
  let out=String(j.output_text||"");if(!out)for(const x of j.output||[])for(const z of x.content||[])if(z.type==="output_text")out+=z.text||"";
  const clean=out.trim().slice(0,1800);
  return clean||(whatsapp?`Esa consulta conviene verla directamente por WhatsApp para darte el dato exacto: ${whatsapp}`:"Sí, te leo. Decime qué necesitás y sigo desde ahí.");
}
export async function GET(req:Request){
  const secret=process.env.CRON_SECRET;
  if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`) return NextResponse.json({error:"No autorizado"},{status:401});
  const db=supabaseAdmin();
  const accounts=await db.from("meta_instagram_accounts").select("id,user_id,instagram_user_id,access_token");
  const results:any[]=[];
  for(const account of accounts.data||[]){
    const recent=await db.from("instagram_automation_runs").select("automation_id,commenter_id,created_at").eq("account_id",account.id).eq("status","sent").not("commenter_id","is",null).order("created_at",{ascending:false}).limit(30);
    const people=[...new Set((recent.data||[]).map((x:any)=>String(x.commenter_id||"")).filter(Boolean))];
    const user=await db.auth.admin.getUserById(account.user_id);
    const meta=user.data?.user?.user_metadata||{};
    if(!automationAccess(meta)){results.push({account:account.id,status:"paused_or_inactive_plan"});continue}
    const rules=(meta.vyral_automations||[]).filter((a:any)=>a.enabled&&a.platforms?.includes("instagram")&&a.continueConversation!==false&&a.dmEnabled!==false);
    for(const person of people){
      try{
        const cu=new URL(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/conversations`);cu.searchParams.set("user_id",person);
        const conv=await graph(cu.toString(),account.access_token),cid=String(conv.data?.[0]?.id||"");if(!cid)continue;
        const mu=new URL(`${GRAPH}/${VER}/${encodeURIComponent(cid)}`);mu.searchParams.set("fields","messages{id,created_time,from,to,message,attachments}");
        const mj=await graph(mu.toString(),account.access_token);
        const recentMessages=(mj.messages?.data||[]).slice(0,24);
        const burst:any[]=[];for(const x of recentMessages){if(String(x.from?.id||"")!==person)break;const media=mediaOf(x);if(String(x.message||"").trim()||media.url)burst.push(x)}
        if(!burst.length)continue;
        burst.reverse();
        const m=burst[burst.length-1],mid=String(m.id||""),synthetic=`dm:${mid}`;
        const body=burst.map((x:any)=>String(x.message||"").trim()).filter(Boolean).join("\n");
        const burstMedia=burst.map(mediaOf).filter((x:any)=>x.url);
        const imageUrls=burstMedia.filter((x:any)=>x.type==="image").map((x:any)=>x.url);
        const userInput=body|| (imageUrls.length?"[El usuario envió una imagen]":"[El usuario envió un archivo]");
        const exists=await db.from("instagram_automation_runs").select("id").eq("comment_id",synthetic).maybeSingle();if(exists.data)continue;
        const prior=(recent.data||[]).find((x:any)=>String(x.commenter_id)===person);
        const a=rules.find((x:any)=>x.id===prior?.automation_id)||rules[0];if(!a)continue;
        const origin=await db.from("instagram_automation_runs").select("media_id,commenter_username").eq("account_id",account.id).eq("automation_id",a.id).eq("commenter_id",person).not("media_id","is",null).order("created_at",{ascending:false}).limit(1).maybeSingle();
        const mediaId=String(origin.data?.media_id||""),username=String(origin.data?.commenter_username||"")||null;
        const hist=await db.from("vyral_inbox_messages").select("body,direction,created_at").eq("account_id",account.id).eq("contact_id",person).eq("automation_id",a.id).order("created_at",{ascending:false}).limit(24);
        const liveHistory=(mj.messages?.data||[]).slice(0,24).reverse().filter((x:any)=>String(x.message||"").trim()).map((x:any)=>`${String(x.from?.id||"")===person?"Usuario":"Agente"}: ${String(x.message||"").trim()}`).join("\n");
        const storedHistory=(hist.data||[]).slice().reverse().map((x:any)=>`${x.direction==="in"?"Usuario":"Agente"}: ${String(x.body||"")}`).join("\n");
        const history=(liveHistory||storedHistory).slice(-10000);
        const ins=await db.from("instagram_automation_runs").insert({user_id:account.user_id,account_id:account.id,automation_id:a.id,comment_id:synthetic,commenter_id:person,comment_text:body,status:"matched",detail:{source:"instagram_conversations_poll",continueConversation:true}}).select("id").maybeSingle();
        if(ins.error)continue;
        try{
          const asksHuman=/\b(humano|persona|asesor|vendedor|representante|equipo|agente real|hablar con alguien)\b/i.test(userInput)&&!/\b(whatsapp|wsp)\b/i.test(userInput);
          const currentHandoff=await db.from("vyral_handoffs").select("id,ai_paused,needs_human").eq("user_id",account.user_id).eq("account_id",account.id).eq("contact_id",person).eq("automation_id",a.id).limit(1).maybeSingle();
          let reply="";
          if(asksHuman)reply="Perfecto. Ya te derivo con una persona del equipo por este mismo chat. En cuanto esté disponible te responde por acá.";
          else if(!currentHandoff.data?.ai_paused){try{reply=await aiReply(a,userInput,history,imageUrls)}catch{reply=String(a.dmMessage||"Gracias por escribir. ¿En qué te puedo ayudar?")}}
          const asksResource=/\b(reenvi|reenví|manda|mandá|envia|enviá|guia|guía|pdf|archivo|link|recurso|catalogo|catálogo|ficha)\b/i.test(body);
          const priorAgentMessages=(hist.data||[]).filter((x:any)=>x.direction==="out").length;
          const voice=chooseVoice(a,body)||((a.voiceEnabled&&priorAgentMessages<=1&&Array.isArray(a.voiceAssets))?a.voiceAssets.find((v:any)=>v?.url):null);
          if(!reply)reply="Sí, te leo. Contame qué necesitás y seguimos por acá.";
          for(const x of burst){const media=mediaOf(x),xbody=String(x.message||"").trim()||(media.type==="image"?"[Imagen]":"[Archivo adjunto]");await db.from("vyral_inbox_messages").upsert({user_id:account.user_id,account_id:account.id,contact_id:person,contact_username:username,message_id:String(x.id||crypto.randomUUID()),body:xbody,direction:"in",sender_type:"contact",automation_id:a.id,attachment_type:media.type||null,attachment_url:media.url||null,attachment_meta:media.raw||{}},{onConflict:"platform,message_id",ignoreDuplicates:true});}
          if(currentHandoff.data?.ai_paused&&!asksHuman){
            await db.from("vyral_handoffs").update({last_message:userInput,unread:true,updated_at:new Date().toISOString()}).eq("id",currentHandoff.data.id);
            await db.from("instagram_automation_runs").update({status:"sent",updated_at:new Date().toISOString(),detail:{source:"instagram_conversations_poll",humanHandoff:true,aiPaused:true}}).eq("id",ins.data?.id);
            results.push({account:account.id,person,status:"waiting_human"});continue;
          }
          {
            const sent=await send(account,person,reply);
            await db.from("vyral_inbox_messages").upsert({user_id:account.user_id,account_id:account.id,contact_id:person,contact_username:username,message_id:String(sent.message_id||crypto.randomUUID()),body:reply,direction:"out",sender_type:"ai",automation_id:a.id},{onConflict:"platform,message_id",ignoreDuplicates:true});
            const transcript=history+"\nUsuario: "+userInput+"\nAgente: "+reply;
            const buying=/\b(precio|cu[aá]nto|compr|contrat|presupuesto|pagar|pago|plan|quiero|me interesa)\b/i.test(transcript);
            const whatsappIntent=/\b(whatsapp|wsp|humano|persona|asesor|vendedor|equipo)\b/i.test(transcript);
            const engaged=/\b(info|sirve|c[oó]mo|consulta|necesito|quiero saber|interesa|contame|explic)\b/i.test(transcript);
            const goal=/\b(compr[eé]|contrat[eé]|ya pagu[eé]|listo.{0,20}pago|cerramos|confirmo)\b/i.test(body);
            const score=goal?100:buying&&whatsappIntent?90:buying?80:whatsappIntent?75:engaged?60:35;
            const stage=goal?"won":score>=75?"qualified":score>=60?"contacted":"new";
            const priority=score>=90?"urgent":score>=75?"high":"normal";
            const reason=goal?"Objetivo comercial detectado":whatsappIntent?"Pidió atención humana o WhatsApp":buying?"Intención de compra detectada":engaged?"Interés detectado por VYRAL":"Conversación activa";
            const existing=await db.from("vyral_handoffs").select("id,stage,lead_score,priority").eq("user_id",account.user_id).eq("account_id",account.id).eq("contact_id",person).eq("automation_id",a.id).limit(1).maybeSingle();
            const crmPatch={contact_username:username||undefined,last_message:userInput,lead_score:Math.max(Number(existing.data?.lead_score)||0,score),reason:asksHuman?"Pidió hablar con una persona":reason,unread:true,status:"open",stage:existing.data?.stage==="won"?"won":stage,priority:asksHuman?"urgent":(Number(existing.data?.lead_score)>=90?"urgent":priority),needs_human:asksHuman||undefined,ai_paused:asksHuman||undefined,human_requested_at:asksHuman?new Date().toISOString():undefined,updated_at:new Date().toISOString()};
            if(existing.data)await db.from("vyral_handoffs").update(crmPatch).eq("id",existing.data.id);
            else await db.from("vyral_handoffs").insert({user_id:account.user_id,account_id:account.id,contact_id:person,automation_id:a.id,...crmPatch});
            const autoEvents=[engaged&&"interested",whatsappIntent&&"whatsapp",buying&&"payment_intent",goal&&"goal_completed",asksHuman&&"human_requested"].filter(Boolean) as string[];
            for(const eventType of autoEvents){const priorEvent=await db.from("vyral_crm_events").select("id").eq("user_id",account.user_id).eq("account_id",account.id).eq("contact_id",person).eq("automation_id",a.id).eq("event_type",eventType).limit(1).maybeSingle();if(!priorEvent.data)await db.from("vyral_crm_events").insert({user_id:account.user_id,account_id:account.id,contact_id:person,automation_id:a.id,event_type:eventType,source:"ai"});}
            // Audio delivery is intentionally decoupled from the reply hot path.
            // Instagram's official Send API does not document arbitrary audio/file attachments.
            // Keep DM continuation reliable while audio transport is validated separately.
            if(asksResource&&a.resourceUrl){const resourceUrl=await signedMedia(db,String(a.resourceUrl),604800);if(resourceUrl)await sendAttachment(account,person,resourceType(String(a.resourceName||a.resourceUrl)),resourceUrl)}
            await db.from("instagram_automation_runs").update({status:"sent",private_message_id:String(sent.message_id||"")||null,updated_at:new Date().toISOString(),detail:{source:"instagram_conversations_poll",continueConversation:true,resourceResent:Boolean(asksResource&&a.resourceUrl),voiceSelected:voice?.id||null,voiceSent:null}}).eq("id",ins.data?.id);
            results.push({account:account.id,person,status:"sent"});
          }
        }catch(e:any){
          await db.from("instagram_automation_runs").update({status:"error",error:String(e?.message||e).slice(0,1000),updated_at:new Date().toISOString()}).eq("id",ins.data?.id);
        }
      }catch(e:any){
        results.push({account:account.id,person,status:"poll_error",error:String(e?.message||e).slice(0,300)});
      }
    }
  }
  return NextResponse.json({ok:true,results});
}
