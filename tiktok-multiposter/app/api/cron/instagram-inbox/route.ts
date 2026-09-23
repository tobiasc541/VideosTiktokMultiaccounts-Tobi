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
  const r=await fetch(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,{method:"POST",headers:{Authorization:`Bearer ${account.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({recipient:{id:to},message:{text}}),cache:"no-store"});
  const j=await r.json().catch(()=>({}));if(!r.ok||j.error)throw new Error(j.error?.message||`Instagram HTTP ${r.status}`);return j;
}
function automationAccess(meta:any){const plan=String(meta?.plan||"");const end=meta?.subscription_current_period_end||meta?.current_period_end;return ["inicio","pro","escala","ai"].includes(plan)&&(!end||new Date(String(end)).getTime()>Date.now())&&!meta?.vyral_automations_paused}
async function aiReply(a:any,text:string,history:string=""){
  const key=process.env.VYRAL_CREATOR_PRODUCTION;if(!key)return String(a.dmMessage||"Gracias por escribir. ¿En qué te puedo ayudar?");
  const prompt=`Sos el agente de Instagram de este negocio. Continuá la conversación por DM de forma breve, natural y útil. Conversación reciente REAL (Usuario y Agente): ${history||"Sin historial adicional"}. No repitas ofertas, promesas ni preguntas ya hechas. Adaptate a lo último que pidió el cliente. Si pide WhatsApp y está configurado, dáselo. Si pide audio, no prometas enviarlo: el sistema adjunta un audio grabado por separado. Mensaje nuevo: ${text}. Contexto: ${String(a.contentLabel||"")}. Objetivo: ${String(a.conversationGoal||"lead")}. Tono: ${String(a.aiTone||"natural")}. País: ${String(a.aiCountry||"")}. WhatsApp configurado: ${String(a.whatsappTarget||"No configurado")}. CTA: ${String(a.ctaText||"")}. Reglas: ${String(a.aiInstructions||"")}. Recordá lo ya dicho y no repitas respuestas ni instrucciones. Si pide que vuelvas a enviar el recurso, confirmalo brevemente y no le pidas que vuelva a comentar. No inventes precios, condiciones ni datos. Hacé como máximo una pregunta. Respondé SOLO el texto a enviar.`;
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,max_output_tokens:250}),signal:AbortSignal.timeout(12000)}),j=await r.json().catch(()=>({}));
  if(!r.ok)return String(a.dmMessage||"Gracias por escribir. ¿En qué te puedo ayudar?");
  let out=String(j.output_text||"");if(!out)for(const x of j.output||[])for(const z of x.content||[])if(z.type==="output_text")out+=z.text||"";
  return out.trim().slice(0,1800);
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
        const mu=new URL(`${GRAPH}/${VER}/${encodeURIComponent(cid)}`);mu.searchParams.set("fields","messages{id,created_time,from,to,message}");
        const mj=await graph(mu.toString(),account.access_token);
        const m=(mj.messages?.data||[]).slice(0,10).find((x:any)=>String(x.from?.id||"")===person&&String(x.message||"").trim());
        if(!m)continue;
        const mid=String(m.id||""),body=String(m.message||"").trim(),synthetic=`dm:${mid}`;
        const exists=await db.from("instagram_automation_runs").select("id").eq("comment_id",synthetic).maybeSingle();if(exists.data)continue;
        const prior=(recent.data||[]).find((x:any)=>String(x.commenter_id)===person);
        const a=rules.find((x:any)=>x.id===prior?.automation_id)||rules[0];if(!a)continue;
        const hist=await db.from("vyral_inbox_messages").select("body,direction,created_at").eq("account_id",account.id).eq("contact_id",person).order("created_at",{ascending:false}).limit(16);
        const history=(hist.data||[]).slice().reverse().map((x:any)=>`${x.direction==="in"?"Usuario":"Agente"}: ${String(x.body||"")}`).join("\n").slice(-7000);
        const ins=await db.from("instagram_automation_runs").insert({user_id:account.user_id,account_id:account.id,automation_id:a.id,comment_id:synthetic,commenter_id:person,comment_text:body,status:"matched",detail:{source:"instagram_conversations_poll",continueConversation:true}}).select("id").maybeSingle();
        if(ins.error)continue;
        try{
          let reply="";try{reply=await aiReply(a,body,history)}catch{reply=String(a.dmMessage||"Gracias por escribir. ¿En qué te puedo ayudar?")}
          const asksResource=/\b(reenvi|reenví|manda|mandá|envia|enviá|guia|guía|pdf|archivo|link|recurso|catalogo|catálogo|ficha)\b/i.test(body);
          const priorAgentMessages=(hist.data||[]).filter((x:any)=>x.direction==="out").length;
          const voice=chooseVoice(a,body)||((a.voiceEnabled&&priorAgentMessages<=1&&Array.isArray(a.voiceAssets))?a.voiceAssets.find((v:any)=>v?.url):null);
          if(reply){
            const sent=await send(account,person,reply);
            if(voice){const audioUrl=await signedMedia(db,String(voice.url));if(audioUrl){try{await Promise.race([sendAttachment(account,person,"audio",audioUrl),new Promise((_,reject)=>setTimeout(()=>reject(new Error("audio_timeout")),8000))])}catch{ /* audio failure must never block the text conversation */ }}}
            if(asksResource&&a.resourceUrl){const resourceUrl=await signedMedia(db,String(a.resourceUrl),604800);if(resourceUrl)await sendAttachment(account,person,resourceType(String(a.resourceName||a.resourceUrl)),resourceUrl)}
            await db.from("instagram_automation_runs").update({status:"sent",private_message_id:String(sent.message_id||"")||null,updated_at:new Date().toISOString(),detail:{source:"instagram_conversations_poll",continueConversation:true,resourceResent:Boolean(asksResource&&a.resourceUrl),voiceSent:voice?.id||null}}).eq("id",ins.data?.id);
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
