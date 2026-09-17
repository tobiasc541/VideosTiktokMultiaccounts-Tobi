import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/auth";
import { recordAiUsage } from "../../../../lib/ai-usage";

export const maxDuration = 60;
function text(data:any){if(typeof data?.output_text==="string")return data.output_text;for(const i of data?.output||[])for(const c of i?.content||[])if(c?.type==="output_text"&&c?.text)return c.text;return ""}
function json(text:string){const a=text.indexOf("{");const b=text.lastIndexOf("}");if(a<0||b<a)throw new Error("invalid_plan");return JSON.parse(text.slice(a,b+1))}
function unavailable(status=503){return NextResponse.json({error:"VYRAL Intelligence no está disponible en este momento. Intentá nuevamente en unos minutos.",code:"VYRAL_AI_UNAVAILABLE"},{status})}
export async function POST(req:Request){
 const session=await getCustomerSession();if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
 const key=process.env.OPENAI_API_KEY;if(!key){console.error("[VYRAL Planner][admin] OPENAI_API_KEY missing");return unavailable()}
 try{
  const b=await req.json();const a=b.automation||{};const publication=String(b.publicationContext||"").slice(0,4000);const model="gpt-5.6-luna";
  const prompt=`Sos VYRAL Conversation Planner. Analizá la automatización comercial configurada y anticipá qué preguntas reales pueden hacer potenciales clientes. OBJETIVO: ${a.conversationGoal||"lead"}. CTA: ${a.ctaText||""}. TONO: ${a.aiTone||""}. REGLAS: ${a.aiInstructions||""}. PUBLICACIÓN: ${publication||"sin detalle"}. RECURSO: ${a.resourceName||"ninguno"}. WHATSAPP: ${a.whatsappTarget?"configurado":"no configurado"}. Proponé audios que valga la pena pregrabar; no inventes precios ni políticas. Devolvé SOLO JSON: {"summary":"breve análisis","questions":["pregunta"],"voiceSuggestions":[{"title":"nombre corto","when":"cuándo conviene usarlo","script":"guion breve sugerido"}]}. Máximo 6 preguntas y 4 audios.`;
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,input:[{role:"user",content:[{type:"input_text",text:prompt}]}],max_output_tokens:1000})});
  const d=await r.json().catch(()=>({}));if(!r.ok){console.error("[VYRAL Planner][admin] provider error",{status:r.status,code:d?.error?.code,message:d?.error?.message});return unavailable(r.status===429?503:502)}
  await recordAiUsage(session.userId,"automation-plan",model,d.usage||{});return NextResponse.json({ok:true,result:json(text(d))});
 }catch(e:any){console.error("[VYRAL Planner][admin] failure",e?.message||e);return unavailable(500)}
}
