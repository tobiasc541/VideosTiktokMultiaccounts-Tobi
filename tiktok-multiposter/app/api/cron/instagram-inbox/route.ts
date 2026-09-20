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
async function send(account:any,to:string,text:string){
  const r=await fetch(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,{method:"POST",headers:{Authorization:`Bearer ${account.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({recipient:{id:to},message:{text}}),cache:"no-store"});
  const j=await r.json().catch(()=>({}));if(!r.ok||j.error)throw new Error(j.error?.message||`Instagram HTTP ${r.status}`);return j;
}
function automationAccess(meta:any){const plan=String(meta?.plan||"");const end=meta?.subscription_current_period_end||meta?.current_period_end;return ["inicio","pro","escala"].includes(plan)&&(!end||new Date(String(end)).getTime()>Date.now())&&!meta?.vyral_automations_paused}
async function aiReply(a:any,text:string,history:string=""){
  const key=process.env.OPENAI_API_KEY;if(!key)return String(a.dmMessage||"Gracias por escribir. ¿En qué te puedo ayudar?");
  const prompt=`Sos el agente de Instagram de este negocio. Continuá la conversación por DM de forma breve, natural y útil. Conversación reciente: ${history||"Sin historial adicional"}. Mensaje nuevo: ${text}. Contexto: ${String(a.contentLabel||"")}. Objetivo: ${String(a.conversationGoal||"lead")}. Tono: ${String(a.aiTone||"natural")}. País: ${String(a.aiCountry||"")}. Reglas: ${String(a.aiInstructions||"")}. Recordá lo ya dicho y no repitas respuestas ni instrucciones. Si pide que vuelvas a enviar el recurso, confirmalo brevemente y no le pidas que vuelva a comentar. No inventes precios, condiciones ni datos. Hacé como máximo una pregunta. Respondé SOLO el texto a enviar.`;
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,max_output_tokens:250})}),j=await r.json().catch(()=>({}));
  if(!r.ok)return String(a.dmMessage||"Gracias por escribir. ¿En qué te puedo ayudar?");
  let out=String(j.output_text||"");if(!out)for(const x of j.output||[])for(const z of x.content||[])if(z.type==="output_text")out+=z.text||"";
  return out.trim().slice(0,1800);
}
export async function GET(req:Request){
  const secret=process.env.CRON_SECRET;if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"No autorizado"},{status:401});
  const db=supabaseAdmin(),accounts=await db.from("meta_instagram_accounts").select("id,user_id,instagram_user_id,access_token");
  const results:any[]=[];
  for(const account of accounts.data||[]){
    const recent=await db.from("instagram_automation_runs").select("automation_id,commenter_id,created_at").eq("account_id",account.id).eq("status","sent").not("commenter_id","is",null).order("created_at",{ascending:false}).limit(30);
    const people=[...new Set((recent.data||[]).map((x:any)=>String(x.commenter_id||"")).filter(Boolean))];
    const user=await db.auth.admin.getUserById(account.user_id),meta=user.data?.user?.user_metadata||{};if(!automationAccess(meta)){results.push({account:account.id,status:"paused_or_inactive_plan"});continue}const rules=(meta.vyral_automations||[]).filter((a:any)=>a.enabled&&a.platforms?.includes("instagram")&&a.continueConversation!==false&&a.dmEnabled!==false);
    for(const person of people){
      try{
        const cu=new URL(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/conversations`);cu.searchParams.set("user_id",person);
        const conv=await graph(cu.toString(),account.access_token),cid=String(conv.data?.[0]?.id||"");if(!cid)continue;
        const mu=new URL(`${GRAPH}/${VER}/${encodeURIComponent(cid)}`);mu.searchParams.set("fields","messages{id,created_time,from,to,message}");
        const mj=await graph(mu.toString(),account.access_token),messages=(mj.messages?.data||[]).slice(0,10);
        const m=messages.find((x:any)=>String(x.from?.id||"")===person&&String(x.message||"").trim());if(m){
          const mid=String(m.id||""),body=String(m.message||"").trim(),synthetic=`dm:${mid}`;const exists=await db.from("instagram_automation_runs").select("id").eq("comment_id",synthetic).maybeSingle();if(!exists.data){
          const prior=(recent.data||[]).find((x:any)=>String(x.commenter_id)===person),a=rules.find((x:any)=>x.id===prior?.automation_id)||rules[0];if(a){const hist=await db.from("instagram_automation_runs").select("comment_text,created_at").eq("account_id",account.id).eq("commenter_id",person).order("created_at",{ascending:false}).limit(8);const history=(hist.data||[]).slice().reverse().map((x:any)=>`Usuario: ${String(x.comment_text||"")}`).join("\n").slice(-4000);
          const ins=await db.from("instagram_automation_runs").insert({user_id:account.user_id,account_id:account.id,automation_id:a.id,comment_id:synthetic,commenter_id:person,comment_text:body,status:"matched",detail:{source:"instagram_conversations_poll",continueConversation:true}}).select("id").maybeSingle();
          if(!ins.error)try{let reply=await aiReply(a,body,history);const asksResource=/\\b(reenvi|reenví|manda|mandá|envia|enviá|guia|guía|pdf|archivo|link|recurso)\\b/i.test(body);if(asksResource&&a.resourceUrl){let url=String(a.resourceUrl);if(url.startsWith("automation-resource/")){const s=await db.storage.from("scheduled-media").createSignedUrl(url,604800);url=String(s.data?.signedUrl||"")}if(url)reply=`${reply}\\n\\n${a.resourceName||"Recurso"}: ${url}`.trim()}if(reply){const sent=await send(account,person,reply);await db.from("instagram_automation_runs").update({status:"sent",private_message_id:String(sent.message_id||"")||null,updated_at:new Date().toISOString(),detail:{source:"instagram_conversations_poll",continueConversation:true,resourceResent:Boolean(asksResource&&a.resourceUrl)}}).eq("id",ins.data?.id);results.push({account:account.id,person,status:"sent"})}}
          catch(e:any){await db.from("instagram_automation_runs").update({status:"error",error:String(e?.message||e).slice(0,1000),updated_at:new Date().toISOString()}).eq("id",ins.data?.id)}}}}
        }
      }catch(e:any){results.push({account:account.id,person,status:"poll_error",error:String(e?.message||e).slice(0,300)})}
    }
  }
  return NextResponse.json({ok:true,results});
}
