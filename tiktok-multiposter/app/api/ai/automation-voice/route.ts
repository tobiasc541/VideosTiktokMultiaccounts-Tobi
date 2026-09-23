import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/auth";
import { recordAiUsage } from "../../../../lib/ai-usage";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import crypto from "crypto";
const MEDIA_BUCKET="scheduled-media";
const BUILD_MARKER="vyral-envdiag-20260918-0200";
const diag=()=>({build:BUILD_MARKER,assemblyKeyPresent:Boolean(process.env.ASSEMBLYAI_API_KEY),openaiKeyPresent:Boolean(process.env.OPENAI_API_KEY),vercelEnv:process.env.VERCEL_ENV||"unknown",gitSha:process.env.VERCEL_GIT_COMMIT_SHA||"unknown",vercelUrl:process.env.VERCEL_URL||"unknown"});
export const maxDuration=60;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
function text(data:any){if(typeof data?.output_text==="string")return data.output_text;for(const i of data?.output||[])for(const c of i?.content||[])if(c?.type==="output_text"&&c?.text)return c.text;return ""}
function json(s:string){const a=s.indexOf("{"),b=s.lastIndexOf("}");if(a<0||b<a)throw new Error("invalid_response");return JSON.parse(s.slice(a,b+1))}
const unavailable=(status=503)=>NextResponse.json({error:"VYRAL Voice Studio no está disponible en este momento.",code:"VYRAL_VOICE_UNAVAILABLE"},{status});
export async function GET(){return NextResponse.json({ok:true,...diag()},{headers:{"Cache-Control":"no-store, max-age=0"}})}
export async function POST(req:Request){const session=await getCustomerSession();if(!session)return NextResponse.json({error:"No autorizado"},{status:401});const key=process.env.VYRAL_CREATOR_PRODUCTION;if(!key)return unavailable();
 try{const contentType=req.headers.get("content-type")||"";
  if(contentType.includes("application/json")){
    const body=await req.json(),mode=String(body.mode||"");
    if(mode==="assembly-prepare"){
      const fileName=String(body.fileName||"video.mov"),fileSize=Number(body.fileSize||0);
      if(!fileSize)return NextResponse.json({error:"Video inválido.",stage:"input"},{status:400});
      const ext=(fileName.split(".").pop()||"mov").replace(/[^a-z0-9]/gi,"").toLowerCase();
      const path=`${session.userId}/ai/${crypto.randomUUID()}.${ext}`,client=supabaseAdmin();
      const signed=await client.storage.from(MEDIA_BUCKET).createSignedUploadUrl(path);
      if(signed.error||!signed.data)return NextResponse.json({error:signed.error?.message||"No se pudo preparar la carga.",stage:"storage-prepare"},{status:500});
      return NextResponse.json({ok:true,path,signedUrl:signed.data.signedUrl,token:signed.data.token});
    }
    if(mode==="openai-transcribe-stored"){
      const path=String(body.path||"");
      if(!path.startsWith(`${session.userId}/ai/`))return NextResponse.json({error:"Ruta inválida.",stage:"input"},{status:403});
      const client=supabaseAdmin(),signed=await client.storage.from(MEDIA_BUCKET).createSignedUrl(path,600);
      if(signed.error||!signed.data?.signedUrl)return NextResponse.json({error:signed.error?.message||"No se pudo abrir el video temporal.",stage:"storage-read"},{status:500});
      try{
        const media=await fetch(signed.data.signedUrl);
        if(!media.ok)return NextResponse.json({error:`No se pudo descargar el video temporal (HTTP ${media.status}).`,stage:"storage-download"},{status:502});
        const blob=await media.blob();
        if(blob.size>24*1024*1024)return NextResponse.json({error:"El video supera 24 MB para transcripción directa. Comprimilo o usá un clip más corto.",stage:"media-too-large",bytes:blob.size},{status:413});
        const fd=new FormData();
        const original=path.split("/").pop()||"video.mp4",ext=(original.split(".").pop()||"mp4").toLowerCase();
        const safeName=["mp3","mp4","mpeg","mpga","m4a","wav","webm"].includes(ext)?original:"vyral-video.mp4";
        fd.append("file",new File([blob],safeName,{type:blob.type||"video/mp4"}));
        fd.append("model","gpt-4o-mini-transcribe");
        fd.append("response_format","json");
        const tr=await fetch("https://api.openai.com/v1/audio/transcriptions",{method:"POST",headers:{Authorization:`Bearer ${key}`},body:fd});
        const tj=await tr.json().catch(()=>({}));
        if(!tr.ok)return NextResponse.json({error:String(tj?.error?.message||tj?.error||`OpenAI transcription HTTP ${tr.status}`),stage:"openai-transcription",providerStatus:tr.status},{status:502});
        const transcript=String(tj?.text||"").trim();
        if(!transcript)return NextResponse.json({error:"OpenAI no detectó voz en este video.",stage:"no-speech"},{status:422});
        await client.storage.from(MEDIA_BUCKET).remove([path]);
        return NextResponse.json({ok:true,transcript,provider:"openai"});
      }catch(e:any){return NextResponse.json({error:String(e?.message||e),stage:"openai-pipeline"},{status:500})}
    }

    return NextResponse.json({error:"Modo JSON inválido.",stage:"mode"},{status:400});
  }
  const form=await req.formData();const mode=String(form.get("mode")||"transcribe");
  if(mode==="transcribe"||mode==="transcribe-video"){const file=form.get(mode==="transcribe-video"?"video":"audio");if(!(file instanceof File))return NextResponse.json({error:mode==="transcribe-video"?"Falta el video":"Falta el audio"},{status:400});const fd=new FormData();fd.append("file",file,file.name||"vyral-media.webm");fd.append("model","gpt-4o-mini-transcribe");const r=await fetch("https://api.openai.com/v1/audio/transcriptions",{method:"POST",headers:{Authorization:`Bearer ${key}`},body:fd});const d=await r.json().catch(()=>({}));if(!r.ok){console.error("[VYRAL Voice] transcription",d?.error);return NextResponse.json({error:mode==="transcribe-video"?"No pudimos transcribir el audio de este video. Podés editar el contexto manualmente.":"No pudimos transcribir el audio."},{status:502})};return NextResponse.json({ok:true,transcript:String(d.text||"").trim()})}
  if(mode==="understand-video"){const transcript=String(form.get("transcript")||"").trim().slice(0,14000);if(!transcript)return NextResponse.json({ok:true,context:""});const model="gpt-5.6-luna";const prompt=`Sos VYRAL Intelligence. Convertí una transcripción literal de un video en CONTEXTO OPERATIVO para un agente comercial que responderá comentarios y mensajes sobre ESA publicación. No resumas palabra por palabra. Entendé la intención del creador. Extraé únicamente lo útil y comprobable: qué ofrece o explica, producto/servicio, beneficio o problema, precios si se mencionan, CTA, palabra gatillo exacta que debe comentar la persona, recurso prometido (PDF/guía/catálogo/etc.), destino como WhatsApp, condiciones y cualquier promesa explícita. No inventes datos. Escribí en español natural, 3 a 8 líneas, listo para que el dueño pueda editarlo. Si hay CTA del estilo "comentá DM/pollo/etc. y te mando X", dejalo explícito como regla del agente. TRANSCRIPCIÓN: ${transcript}`;const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,input:prompt,max_output_tokens:700})});const d=await r.json().catch(()=>({}));if(!r.ok)return unavailable(502);await recordAiUsage(session.userId,"automation-video-understanding",model,d.usage||{});return NextResponse.json({ok:true,context:text(d).trim()})}
  const automation=JSON.parse(String(form.get("automation")||"{}"));const model="gpt-5.6-luna";const prompt=`Sos VYRAL Voice Planner. Creá una biblioteca conversacional de audios humanos ESPECÍFICOS para ESTA publicación. CONTEXTO COMPLETO DEL VIDEO=${automation.contentLabel||"Sin contexto"}; objetivo=${automation.conversationGoal||"lead"}; CTA=${automation.ctaText||""}; WhatsApp=${automation.whatsappTarget||""}; tono=${automation.aiTone||"natural"}; país=${automation.aiCountry||"neutral"}; edad/estilo=${automation.aiAudienceAge||"general"}; reglas=${automation.aiInstructions||""}; recurso=${automation.resourceName||""}. TRATÁ EL CONTEXTO COMO LA VOZ Y LA POSICIÓN DEL CREADOR: el agente habla en primera persona como extensión del creador. Si el creador afirma un resultado, experiencia, oferta o logro (por ejemplo "gané USD 30.000 el último mes"), asumilo como dato declarado por el creador y comunicalo con seguridad, sin distanciarte con frases como "según afirma", "según dice el video", "la promesa que aparece", "si es verdad", "no puedo asegurarlo" o similares. No cuestiones ni audites al creador. Tampoco conviertas una experiencia pasada en garantía de resultados futuros: podés afirmar lo que el creador dice que logró, pero no prometer que el cliente obtendrá el mismo resultado. Respetá ofertas, palabras gatillo, promesas y CTA sin inventar datos nuevos. Proponé entre 8 y 12 audios cortos, naturales y distintos para cubrir una conversación real: bienvenida, pedido de precio, pedido de más información, interés leve, interés fuerte, duda/objeción, pedido de WhatsApp, pedido del recurso/promesa del video, confirmación, seguimiento y cierre cuando correspondan. Cada recomendación debe explicar claramente CUÁNDO usarla para que el agente pueda seleccionarla semánticamente. No hagas variantes redundantes. Adaptá vocabulario al país y edad sin caricaturizar. Devolvé SOLO JSON {"recommendations":[{"title":"","purpose":"","script":"","when":""}]}.`;
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,input:prompt,max_output_tokens:2400})});const d=await r.json().catch(()=>({}));if(!r.ok)return unavailable(502);await recordAiUsage(session.userId,"automation-voice-planner",model,d.usage||{});return NextResponse.json({ok:true,...json(text(d))});
 }catch(e:any){const msg=String(e?.message||e||"Error interno desconocido");console.error("[VYRAL Voice] failure",msg);return NextResponse.json({error:msg,stage:"server-catch",code:"VYRAL_VOICE_EXCEPTION"},{status:500})}}