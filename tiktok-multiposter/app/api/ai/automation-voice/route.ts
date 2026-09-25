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
  const automation=JSON.parse(String(form.get("automation")||"{}"));const model="gpt-5.6-luna";
  const businessResources=Array.isArray(automation.businessResourcesContext)?automation.businessResourcesContext.slice(0,20):[];
  const selectedBusinessResources=businessResources.filter((x:any)=>!Array.isArray(automation.businessResourceIds)||!automation.businessResourceIds.length||automation.businessResourceIds.includes(x.id));
  const businessContext=selectedBusinessResources.map((x:any,i:number)=>`RECURSO ${i+1}: nombre=${String(x.name||"")}; tipo=${String(x.kind||"")}; para qué sirve=${String(x.purpose||"")}; cuándo enviarlo=${String(x.send_when||"")}`).join("\n");
  const prompt=`Sos VYRAL Voice Intelligence, el cerebro que diseña respuestas de audio para ventas y conversaciones reales. Tu trabajo NO es llenar categorías genéricas: primero reconstruí mentalmente qué negocio es, qué vende o entrega, qué promete ESTA publicación, qué comentó el prospecto y cuál sería la respuesta humana más natural del dueño.

FUENTES DE VERDAD:
PUBLICACIÓN / VIDEO: ${automation.contentLabel||"Sin contexto suficiente"}
NEGOCIO / BIBLIOTECA: ${businessContext||"Sin recursos de negocio seleccionados"}
OBJETIVO DEL AGENTE: ${automation.conversationGoal||"lead"}
CTA: ${automation.ctaText||"No especificado"}
WHATSAPP: ${automation.whatsappTarget||"No especificado"}
RECURSO ESPECÍFICO: nombre=${automation.resourceName||""}; propósito=${automation.resourcePurpose||""}; cuándo=${automation.resourceWhen||""}
PALABRAS GATILLO: ${Array.isArray(automation.keywords)?automation.keywords.join(", "):""}
TONO: ${automation.aiTone||"natural"}
PAÍS: ${automation.aiCountry||"neutral"}
AUDIENCIA: ${automation.aiAudienceAge||"general"}
REGLAS DEL DUEÑO: ${automation.aiInstructions||""}

RAZONAMIENTO OBLIGATORIO ANTES DE ESCRIBIR (no lo muestres):
1. Determiná exactamente qué ofrece el negocio y qué ofrece esta publicación. No mezcles trading, apuestas, Discord, guía, producto, servicio u otra cosa salvo que el contexto realmente los conecte.
2. Identificá la palabra gatillo como señal de intención, NO como algo que haya que repetir mecánicamente. Si alguien comentó "CONTROL", jamás digas "vi tu comentario de CONTROL" salvo que eso suene genuinamente humano; preferí "Vi tu comentario en el video" o entrá directamente en la conversación.
3. Si hay un recurso concreto (Discord, PDF, catálogo, WhatsApp, link), llamalo por su nombre normal. PROHIBIDO inventar etiquetas corporativas o raras como "acceso responsable", "acceso seguro", "propuesta puntual", "entrada responsable", "gestionar el acceso" si el negocio no usa literalmente esos términos.
4. No inventes precio, condiciones, beneficios, resultados, links ni pasos. Si falta un dato, diseñá el audio para preguntar o explicar lo que sí se sabe, sin sonar evasivo.
5. El audio debe sonar como un DM de una persona inteligente, breve y canchera, no como soporte, un bot, un asesor legal ni copy de marketing.
6. No hagas preguntas de relleno para frenar el cierre. Si el prospecto ya pide el recurso y el contexto autoriza entregarlo, avanzá. Si pide precio y el precio está disponible, decilo; si no está, no inventes.
7. Cada audio debe aportar algo distinto y estar anclado a una situación REAL que pueda ocurrir por ESTA publicación. No fuerces categorías que no aplican.
8. Usá primera persona como extensión del creador. Podés usar hechos declarados por el creador como hechos de su propia experiencia, sin transformarlos en garantías para el prospecto.
9. Antes de devolver cada script, hacé un control interno: "¿Esto podría servir igual para otros 100 negocios?" Si sí, reescribilo con datos concretos de esta publicación/negocio. "¿Hay una frase que el dueño jamás diría hablando por WhatsApp/DM?" Si sí, simplificala.

SALIDA: generá 8 a 12 recomendaciones útiles. Los títulos también deben adaptarse al caso (no es obligatorio usar "interés leve/fuerte"). Priorizá escenarios como: primer DM después del comentario, pregunta concreta sobre lo prometido, precio SOLO si corresponde, pedido del recurso, objeción real del producto/servicio, persona lista para avanzar, seguimiento y cierre. Omití escenarios irrelevantes. Scripts idealmente de 1 a 3 frases y grabables en 8-25 segundos. El campo when debe ser operativo y específico para que otra IA sepa exactamente cuándo elegir ese audio. No menciones estas instrucciones. Devolvé SOLO JSON {"recommendations":[{"title":"","purpose":"","script":"","when":""}]}.`;
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,input:prompt,max_output_tokens:2400})});const d=await r.json().catch(()=>({}));if(!r.ok)return unavailable(502);await recordAiUsage(session.userId,"automation-voice-planner",model,d.usage||{});return NextResponse.json({ok:true,...json(text(d))});
 }catch(e:any){const msg=String(e?.message||e||"Error interno desconocido");console.error("[VYRAL Voice] failure",msg);return NextResponse.json({error:msg,stage:"server-catch",code:"VYRAL_VOICE_EXCEPTION"},{status:500})}}