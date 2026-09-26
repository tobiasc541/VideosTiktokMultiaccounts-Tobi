import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { processInstagramConversationEvent } from "../../../../lib/instagram-conversation-engine";

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
function resourceType(name:string,mime:string=""){const n=String(name||"").toLowerCase(),m=String(mime||"").toLowerCase();if(m==="image/jpeg"||m==="image/png"||/\.(png|jpe?g)(?:$|\?)/.test(n))return"image";if(m==="video/mp4"||/\.mp4(?:$|\?)/.test(n))return"video";if(m.startsWith("audio/")||/\.(mp3|m4a|aac|ogg|webm)(?:$|\?)/.test(n))return"audio";return"file"}
async function sendAttachment(account:any,to:string,type:string,url:string){const audio=type==="audio";const r=await fetch(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,{method:"POST",headers:{Authorization:`Bearer ${account.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({recipient:{id:to},message:{attachment:{type:audio?"audio":type,payload:audio?{url,is_reusable:true}:{url}}}}),cache:"no-store"});const j=await r.json().catch(()=>({}));if(!r.ok||j.error)throw new Error(j.error?.message||`Instagram HTTP ${r.status}`);return j}
function normVoiceText(s:any){return String(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9ñ]+/g," ").trim()}
function voiceIntent(text:string){const t=normVoiceText(text);const tags=new Set<string>();if(/whatsapp|wsp|otro lugar|otra app|otro medio|por fuera|fuera de instagram|seguir hablando|hablar por otro|contactar/.test(t))tags.add("channel");if(/precio|cuanto|cuesta|valor|oferta|promo|presupuesto/.test(t))tags.add("price");if(/como funciona|como se usa|usar|funciona|enchufe|cable|practica/.test(t))tags.add("usage");if(/hola|buenas|buen dia|buenas tardes|buenas noches/.test(t))tags.add("greeting");if(/guia|manual|pdf|archivo|recurso|enviame|mandame|prueba|pruebas|resultado|resultados|evidencia|backtest|win rate|winrate|estrategia solida/.test(t))tags.add("resource");if(/comprar|quiero|me interesa|pagar|pago|llevar/.test(t))tags.add("buying");return tags}
function voiceTags(v:any){return voiceIntent(`${v.name||""} ${v.purpose||""} ${v.when||""} ${v.transcript||""}`)}
function chooseVoice(a:any,text:string,first=false){const vs=Array.isArray(a.voiceAssets)?a.voiceAssets.filter((v:any)=>v?.url):[];if(!a.voiceEnabled||!vs.length)return null;if(first)return vs[0];const intent=voiceIntent(text);let best:any=null,bestScore=0;for(const v of vs){const vt=voiceTags(v);let score=0;for(const tag of intent)if(vt.has(tag))score+=tag==="channel"?10:tag==="price"?8:tag==="usage"?6:tag==="resource"?6:tag==="buying"?5:2;const words=normVoiceText(`${v.purpose||""} ${v.when||""}`).split(" ").filter((x:string)=>x.length>4);score+=Math.min(3,words.filter((w:string)=>normVoiceText(text).includes(w)).length);if(score>bestScore){bestScore=score;best=v}}return bestScore>=4?best:null}
async function send(account:any,to:string,text:string){
  const r=await fetch(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,{method:"POST",headers:{Authorization:`Bearer ${account.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({recipient:{id:to},message:{text}}),cache:"no-store",signal:AbortSignal.timeout(12000)});
  const j=await r.json().catch(()=>({}));if(!r.ok||j.error)throw new Error(j.error?.message||`Instagram HTTP ${r.status}`);return j;
}
function automationAccess(meta:any){const plan=String(meta?.plan||"");const end=meta?.subscription_current_period_end||meta?.current_period_end;return ["inicio","pro","escala","ai"].includes(plan)&&(!end||new Date(String(end)).getTime()>Date.now())&&!meta?.vyral_automations_paused}
function mediaOf(m:any){const raw=Array.isArray(m?.attachments)?m.attachments:(m?.attachments?.data||[]);const a=raw?.[0]||m?.attachment||null;const url=String(a?.payload?.url||a?.payload?.media_url||a?.image_data?.url||a?.video_data?.url||a?.audio_data?.url||a?.file_url||a?.url||"");const declared=String(a?.type||"").toLowerCase();const type=declared.includes("image")||a?.image_data?"image":declared.includes("video")||a?.video_data?"video":declared.includes("audio")||a?.audio_data?"audio":/\.(png|jpe?g|webp|gif)(\?|$)/i.test(url)?"image":url?"file":"";return {type,url,raw:a};}
async function aiReply(a:any,text:string,history:string="",images:string[]=[],resources:any[]=[]){
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
RECURSOS REALES DISPONIBLES: ${JSON.stringify(resources.map((r:any)=>({id:r.id,name:r.name,type:r.kind,description:r.purpose,when:r.send_when})))}

REGLAS DE INTELIGENCIA:
1. Antes de responder, revisá el historial. No repitas una pregunta, CTA, explicación, saludo, oferta ni instrucción que el agente ya haya enviado. No vuelvas a pedir que comente una palabra si ya la comentó.
2. Respondé específicamente a lo último que dijo la persona. Si ya contestó una pregunta anterior, avanzá al siguiente paso; no reinicies la conversación.
3. Podés usar búsqueda web SOLO cuando falte un dato PÚBLICO y verificable que razonablemente pueda conocerse por internet (información general, conceptos, datos públicos). No uses internet para inventar precios propios, stock, condiciones internas, promociones, disponibilidad, políticas privadas ni datos particulares del negocio.
4. Si la pregunta es MUY ESPECÍFICA del negocio y la respuesta no está explícitamente en el contexto, NO adivines. Explicá que podés derivarlo a una persona del equipo dentro de este mismo chat. No mandes a WhatsApp salvo que el usuario pida específicamente WhatsApp.
5. Si la respuesta sí está en el contexto, respondela acá; no derives innecesariamente.
6. Si usaste internet, distinguí lo público/general de lo específico del negocio y no presentes una fuente externa como si fuera información oficial del negocio.
7. Si pide hablar con una persona, confirmá brevemente que ya lo derivás a una persona del equipo en este mismo chat. Si pide WhatsApp específicamente, entregalo. Si pide audio, explicá brevemente que la atención automática es por texto.
8. Máximo una pregunta por respuesta. Preferí 1 a 3 frases cortas. Natural, útil y adaptado al país configurado.
8A. No hagas preguntas sólo para mantener viva la conversación. Preguntá únicamente si hace falta para resolver lo que pidió, avanzar al objetivo configurado o confirmar una acción que el usuario quería realizar.
8B. Si el objetivo ya se cumplió (link/recurso/acceso entregado) y el usuario confirma recepción, agradece, muestra poco interés o no hace una consulta nueva, cerrá sin otra pregunta. Si dice "chau", "gracias chau", "listo gracias", "nos vemos" o equivalente, despedite y terminá.
8C. No repitas beneficios, contenido, características, CTA o explicaciones ya dichas en mensajes recientes.
9. Nunca inventes. Si no sabés y tampoco corresponde buscarlo en internet, derivá a WhatsApp cuando esté configurado.
10. En modo human, tu trabajo es HACER AVANZAR la conversación. Cuando el prospecto revela una necesidad o interés, reconocelo brevemente y hacé UNA pregunta concreta y natural para entender su situación. No te limites a darle la razón.
11. No repitas un recurso, link, CTA, emoji o explicación que ya aparece en el historial salvo que la persona lo pida de nuevo. Si el Discord ya fue enviado, no vuelvas a mencionarlo porque sí.
12A. PRINCIPIO DE INTENCIÓN: una aceptación genérica como "dale", "perfecto", "enviame", "pasame" o "mandame" se refiere a lo que el agente/audio ofreció inmediatamente antes. Si se ofreció Discord/link/acceso, entregá eso; si se ofreció imagen/prueba/video, entregá ese archivo. Nunca cambies hacia otro recurso sólo porque está disponible.
12B. Los recursos son herramientas para cumplir una intención, NO temas para iniciar por tu cuenta. No menciones backtests, pruebas, imágenes, videos, PDFs, catálogos u otros recursos si el usuario no preguntó por ese tema y el turno anterior no los ofreció.
12. RECURSOS REALES DISPONIBLES son evidencia válida aportada por el negocio. Si la persona pregunta por pruebas/resultados/winrate y existe un recurso cuyo when/description coincide, NO digas que no hay pruebas ni derives a humano: explicá brevemente qué demuestra y el sistema lo enviará después de tu mensaje.
13. Respondé SOLO el mensaje final que recibirá el usuario, sin JSON, sin análisis y sin encabezados.`;
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
          const syntheticId=`dm:${mid}`;
          const claim=await db.from("instagram_automation_runs").insert({user_id:account.user_id,account_id:account.id,automation_id:a.id,comment_id:syntheticId,commenter_id:person,comment_text:body,status:"matched",detail:{source:"instagram_conversations_poll",engine:"state_v2"}}).select("id").maybeSingle();
          if(claim.error)continue;
          for(const x of burst){const media=mediaOf(x),xbody=String(x.message||"").trim()||(media.type==="image"?"[Imagen]":"[Archivo adjunto]");await db.from("vyral_inbox_messages").upsert({user_id:account.user_id,account_id:account.id,platform:"instagram",contact_id:person,contact_username:username,message_id:String(x.id||crypto.randomUUID()),body:xbody,direction:"in",sender_type:"contact",automation_id:a.id,attachment_type:media.type||null,attachment_url:media.url||null,attachment_meta:media.raw||{}},{onConflict:"platform,message_id",ignoreDuplicates:true});}
          try{
            const result=await processInstagramConversationEvent({account,automation:a,contactId:person,threadId:cid,messageId:mid,text:userInput,origin:mediaId?"post_comment":"direct_dm",contextPayload:{post_title:String(a.contentLabel||""),target_topic:String(a.contentLabel||""),media_id:mediaId||null},history,source:"polling"});
            await db.from("instagram_automation_runs").update({status:"sent",private_message_id:result.messageId||null,updated_at:new Date().toISOString(),detail:{source:"instagram_conversations_poll",engine:"state_v2",...result}}).eq("id",claim.data?.id);
            results.push({account:account.id,person,status:"sent",engine:"state_v2"});
          }catch(e:any){
            await db.from("instagram_automation_runs").update({status:"error",error:String(e?.message||e).slice(0,1000),updated_at:new Date().toISOString()}).eq("id",claim.data?.id);
          }
      }catch(e:any){
        results.push({account:account.id,person,status:"poll_error",error:String(e?.message||e).slice(0,300)});
      }
    }
  }
  return NextResponse.json({ok:true,results});
}
