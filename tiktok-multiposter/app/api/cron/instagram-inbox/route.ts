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
async function aiReply(a:any,text:string,history:string=""){
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
4. Si la pregunta es MUY ESPECÍFICA del negocio y la respuesta no está explícitamente en el contexto —por ejemplo precio exacto, stock, envío particular, presupuesto, condición comercial, disponibilidad, detalle técnico propio o caso personalizado— NO adivines ni des una respuesta genérica. Si hay WhatsApp, pasalo directamente y pedile que haga ESA pregunta allí. No sigas interrogando por Instagram.
5. Si la respuesta sí está en el contexto, respondela acá; no derives innecesariamente.
6. Si usaste internet, distinguí lo público/general de lo específico del negocio y no presentes una fuente externa como si fuera información oficial del negocio.
7. Si pide WhatsApp, entregalo inmediatamente. Si pide audio, explicá brevemente que por ahora la atención automática es por texto.
8. Máximo una pregunta por respuesta. Preferí 1 a 3 frases cortas. Natural, útil y adaptado al país configurado.
9. Nunca inventes. Si no sabés y tampoco corresponde buscarlo en internet, derivá a WhatsApp cuando esté configurado.
10. Respondé SOLO el mensaje final que recibirá el usuario, sin JSON, sin análisis y sin encabezados.`;
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,tools:[{type:"web_search",search_context_size:"low"}],tool_choice:"auto",max_output_tokens:350}),signal:AbortSignal.timeout(20000)}),j=await r.json().catch(()=>({}));
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
        const mu=new URL(`${GRAPH}/${VER}/${encodeURIComponent(cid)}`);mu.searchParams.set("fields","messages{id,created_time,from,to,message}");
        const mj=await graph(mu.toString(),account.access_token);
        const m=(mj.messages?.data||[]).slice(0,10).find((x:any)=>String(x.from?.id||"")===person&&String(x.message||"").trim());
        if(!m)continue;
        const mid=String(m.id||""),body=String(m.message||"").trim(),synthetic=`dm:${mid}`;
        const exists=await db.from("instagram_automation_runs").select("id").eq("comment_id",synthetic).maybeSingle();if(exists.data)continue;
        const prior=(recent.data||[]).find((x:any)=>String(x.commenter_id)===person);
        const a=rules.find((x:any)=>x.id===prior?.automation_id)||rules[0];if(!a)continue;
        const origin=await db.from("instagram_automation_runs").select("media_id,commenter_username").eq("account_id",account.id).eq("automation_id",a.id).eq("commenter_id",person).not("media_id","is",null).order("created_at",{ascending:false}).limit(1).maybeSingle();
        const mediaId=String(origin.data?.media_id||""),username=String(origin.data?.commenter_username||"")||null;
        const hist=await db.from("vyral_inbox_messages").select("body,direction,created_at").eq("account_id",account.id).eq("contact_id",person).order("created_at",{ascending:false}).limit(16);
        const history=(hist.data||[]).slice().reverse().map((x:any)=>`${x.direction==="in"?"Usuario":"Agente"}: ${String(x.body||"")}`).join("\n").slice(-7000);
        const ins=await db.from("instagram_automation_runs").insert({user_id:account.user_id,account_id:account.id,automation_id:a.id,comment_id:synthetic,commenter_id:person,comment_text:body,status:"matched",detail:{source:"instagram_conversations_poll",continueConversation:true}}).select("id").maybeSingle();
        if(ins.error)continue;
        try{
          let reply="";try{reply=await aiReply(a,body,history)}catch{reply=String(a.dmMessage||"Gracias por escribir. ¿En qué te puedo ayudar?")}
          const asksResource=/\b(reenvi|reenví|manda|mandá|envia|enviá|guia|guía|pdf|archivo|link|recurso|catalogo|catálogo|ficha)\b/i.test(body);
          const priorAgentMessages=(hist.data||[]).filter((x:any)=>x.direction==="out").length;
          const voice=chooseVoice(a,body)||((a.voiceEnabled&&priorAgentMessages<=1&&Array.isArray(a.voiceAssets))?a.voiceAssets.find((v:any)=>v?.url):null);
          if(!reply)reply="Sí, te leo. Contame qué necesitás y seguimos por acá.";
          await db.from("vyral_inbox_messages").upsert({user_id:account.user_id,account_id:account.id,contact_id:person,contact_username:username,message_id:mid,body,direction:"in",sender_type:"contact",automation_id:a.id},{onConflict:"message_id",ignoreDuplicates:true});
          {
            const sent=await send(account,person,reply);
            await db.from("vyral_inbox_messages").upsert({user_id:account.user_id,account_id:account.id,contact_id:person,contact_username:username,message_id:String(sent.message_id||crypto.randomUUID()),body:reply,direction:"out",sender_type:"ai",automation_id:a.id},{onConflict:"message_id",ignoreDuplicates:true});
            const score=/precio|compr|contrat|quiero|interesa|whatsapp|wsp|presupuesto/i.test(body)?80:/info|sirve|como|cómo|consulta|necesito/i.test(body)?60:35;
            const reason=score>=75?"Alta intención detectada por VYRAL":score>=60?"Interés detectado por VYRAL":"Conversación activa";
            const existing=await db.from("vyral_handoffs").select("id,stage,lead_score").eq("user_id",account.user_id).eq("account_id",account.id).eq("contact_id",person).eq("automation_id",a.id).limit(1).maybeSingle();
            if(existing.data)await db.from("vyral_handoffs").update({contact_username:username||undefined,last_message:body,lead_score:Math.max(Number(existing.data.lead_score)||0,score),reason,unread:true,status:"open",updated_at:new Date().toISOString()}).eq("id",existing.data.id);
            else await db.from("vyral_handoffs").insert({user_id:account.user_id,account_id:account.id,contact_id:person,contact_username:username,automation_id:a.id,last_message:body,lead_score:score,reason,unread:true,status:"open",stage:score>=75?"qualified":"new",priority:score>=75?"high":"normal"});
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
