import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/auth";
import { recordAiUsage } from "../../../../lib/ai-usage";

export const maxDuration = 60;
type Message = { role: "user" | "assistant"; text: string };
function extractText(data:any){if(typeof data?.output_text==="string")return data.output_text;for(const item of data?.output||[])for(const c of item?.content||[])if(c?.type==="output_text"&&c?.text)return c.text;return ""}
function cleanJson(text:string){const a=text.indexOf("{");const b=text.lastIndexOf("}");if(a<0||b<a)throw new Error("invalid_agent_response");return JSON.parse(text.slice(a,b+1))}
function publicAiError(status=503){return NextResponse.json({error:"VYRAL Intelligence no está disponible en este momento. Intentá nuevamente en unos minutos.",code:"VYRAL_AI_UNAVAILABLE"},{status})}
export async function POST(req:Request){
 const session=await getCustomerSession();if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
 const key=process.env.OPENAI_API_KEY;if(!key){console.error("[VYRAL Intelligence][admin] OPENAI_API_KEY missing");return publicAiError()}
 try{
  const body=await req.json();const automation=body.automation||{};
  const businessContext=String(body.businessContext||"").slice(0,8000),publicationContext=String(body.publicationContext||"").slice(0,4000),username=String(body.username||"").slice(0,100),incoming=String(body.incoming||"").slice(0,2500);
  const history:Message[]=Array.isArray(body.history)?body.history.slice(-20).map((m:any)=>({role:m.role==="assistant"?"assistant":"user",text:String(m.text||"").slice(0,2500)})):[];
  if(!incoming)return NextResponse.json({error:"Escribí un mensaje para probar VYRAL Intelligence."},{status:400});
  const goal=String(automation.conversationGoal||automation.conversionGoal||"lead"),tone=String(automation.aiTone||"Profesional y cercano"),instructions=String(automation.aiInstructions||"").slice(0,3000);
  const whatsapp=String(automation.whatsappTarget||"").trim(),cta=String(automation.ctaText||"").trim(),resourceName=String(automation.resourceName||"").trim(),voiceEnabled=!!automation.voiceEnabled,voiceWhen=String(automation.voiceWhen||"never");
  const model="gpt-5.6-luna";
  const prompt=`Sos VYRAL Intelligence, el agente automatizado de una marca. Conversá natural, útil y breve sin fingir ser humano.\nOBJETIVO: ${goal}\nTONO: ${tone}\nUSUARIO: ${username||"desconocido"}\nCONTEXTO NEGOCIO: ${businessContext||"No provisto"}\nPUBLICACIÓN: ${publicationContext||"No provisto"}\nINSTRUCCIONES: ${instructions||"Ayudá y avanzá hacia el objetivo sin presionar."}\nDATOS REALES CONFIGURADOS (fuente de verdad): WhatsApp=${whatsapp||"NO CONFIGURADO"}; CTA=${cta||"NO CONFIGURADO"}; recurso=${resourceName||"NO CARGADO"}; audio=${voiceEnabled?`DISPONIBLE, regla ${voiceWhen}`:"NO CARGADO"}.\nHISTORIAL: ${JSON.stringify(history)}\nMENSAJE NUEVO: ${incoming}\n\nREGLAS: Nunca inventes datos. Si piden WhatsApp y está configurado, entregalo AHORA. Si piden catálogo/archivo/recurso y está cargado, entregalo AHORA. Un pedido explícito de WhatsApp o material comercial es señal fuerte de intención. El audio se usa para sumar confianza cuando está habilitado y la conversación alcanza intención fuerte; nunca reemplaza datos esenciales. Una pregunta por vez. Handoff solo en casos sensibles, petición humana, negociación especial o incertidumbre factual real.\nDevolvé SOLO JSON válido: {"reply":"texto listo para enviar","leadStage":"new|curious|qualified|hot|converted|support","intent":"string breve","confidence":0.0,"handoff":false,"goalReached":false,"suggestedAction":"reply|send_whatsapp|send_resource|send_audio|handoff|close","attachments":{"whatsapp":false,"resource":false,"audio":false},"usePersonalization":true,"reason":"explicación interna breve"}.`;
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,input:[{role:"user",content:[{type:"input_text",text:prompt}]}],max_output_tokens:900})});
  const data=await r.json().catch(()=>({}));if(!r.ok){console.error("[VYRAL Intelligence][admin] provider error",{status:r.status,code:data?.error?.code,type:data?.error?.type,message:data?.error?.message});return publicAiError(r.status===429?503:502)}
  const result=cleanJson(extractText(data));
  const asksWhatsapp=/whats\s*app|wsp|wa\b|n[uú]mero/i.test(incoming);
  const asksResource=/cat[aá]logo|archivo|pdf|lista|gu[ií]a|folleto|recurso|material/i.test(incoming);
  result.attachments={...(result.attachments||{})};
  if(asksWhatsapp&&whatsapp){result.attachments.whatsapp=true;result.suggestedAction="send_whatsapp";result.leadStage="hot";result.confidence=Math.max(Number(result.confidence)||0,.94);if(!String(result.reply||"").includes(whatsapp))result.reply=`${String(result.reply||"").trim()}\n\nWhatsApp: ${whatsapp}`.trim();if(voiceEnabled&&voiceWhen==="hot")result.attachments.audio=true}
  if(asksResource&&resourceName){result.attachments.resource=true;result.suggestedAction="send_resource";if(!String(result.reply||"").toLowerCase().includes(resourceName.toLowerCase()))result.reply=`${String(result.reply||"").trim()}\n\nTe adjunto: ${resourceName}`.trim()}
  if(voiceEnabled&&voiceWhen==="hot"&&result.leadStage==="hot")result.attachments.audio=true;
  await recordAiUsage(session.userId,"automation-agent",model,data.usage||{});return NextResponse.json({ok:true,result});
 }catch(e:any){console.error("[VYRAL Intelligence][admin] agent failure",e?.message||e);return publicAiError(500)}
}
