import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../lib/auth";
import {supabaseAdmin} from "../../../../lib/supabase-admin";
export const runtime="nodejs"; export const maxDuration=300;
const OPENAI="https://api.openai.com/v1";
function cleanJson(s:string){const a=s.indexOf("[");const b=s.lastIndexOf("]");if(a<0||b<a)throw new Error("La IA no devolvió una estructura válida.");return JSON.parse(s.slice(a,b+1))}
export async function POST(req:Request){
 try{
  const session=await getCustomerSession();if(!session)return NextResponse.json({error:"Iniciá sesión."},{status:401});
  const {data}=await supabaseAdmin().auth.admin.getUserById(session.userId);const plan=String(data.user?.user_metadata?.plan||session.plan||"");
  if(plan!=="escala")return NextResponse.json({error:"Creator IA está disponible únicamente en el plan Escala."},{status:403});
  const key=process.env.VYRAL_OPENAI_ADMIN_KEY||process.env.OPENAI_API_KEY;if(!key)return NextResponse.json({error:"Falta configurar la API de OpenAI."},{status:503});
  const body=await req.json();const count=Math.min(7,Math.max(1,Number(body.count)||6));
  const single=body.slide?true:false;
  const strategy=single?JSON.stringify([body.slide]):`Creá ${count} placas distintas. Estructura recomendada: hook que detiene el scroll, problema/deseo, consecuencia o tensión, solución, beneficio/prueba, oferta y CTA. Adaptala al número de placas.`;
  const prompt=`Sos el director creativo de VYRAL. Diseñás carruseles de Instagram persuasivos en español rioplatense, claros y modernos. No inventes testimonios, cifras ni garantías. Cada placa debe tener poco texto y avanzar una historia. Negocio/producto: ${String(body.business||"")}. Oferta: ${String(body.offer||"")}. Público: ${String(body.audience||"")}. Objetivo: ${String(body.goal||"ventas")}. CTA final: ${String(body.cta||"Escribí INFO")}. Estética solicitada: ${String(body.tone||"animado premium")}. ${strategy} Respondé SOLO JSON array con objetos {"role":"hook|problema|tension|solucion|beneficio|oferta|cta","title":"máx 9 palabras","copy":"máx 22 palabras","visualPrompt":"descripción visual detallada sin texto incrustado, composición vertical 4:5, misma identidad/personajes/paleta en todo el carrusel"}.`;
  const tr=await fetch(OPENAI+"/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.VYRAL_TEXT_MODEL||"gpt-5.6",messages:[{role:"user",content:prompt}]})});
  const tj=await tr.json();if(!tr.ok)throw new Error(tj.error?.message||"Falló la estrategia de IA.");
  let slides=cleanJson(tj.choices?.[0]?.message?.content||"");
  if(single)slides=slides.slice(0,1);else slides=slides.slice(0,count);
  const model=process.env.VYRAL_IMAGE_MODEL||"gpt-image-2.5-flare";
  for(let i=0;i<slides.length;i++){
   const s=slides[i];const ip=`Draw a premium social media illustration for an Instagram carousel. Vertical 4:5. ${s.visualPrompt}. Brand/business context: ${String(body.business||"")}. Visual style: ${String(body.tone||"animated premium")}. Keep generous negative space for overlay copy. Do not render words, letters, logos, watermarks or UI. High visual continuity and polished commercial art direction.`;
   const ir=await fetch(OPENAI+"/images/generations",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,prompt:ip,size:"1024x1280",quality:"medium",output_format:"webp"})});
   const ij=await ir.json();if(!ir.ok)throw new Error(ij.error?.message||"Falló la generación de una imagen.");
   const b64=ij.data?.[0]?.b64_json;if(!b64)throw new Error("OpenAI no devolvió la imagen.");
   slides[i]={role:s.role,title:s.title,copy:s.copy,image:`data:image/webp;base64,${b64}`};
  }
  return NextResponse.json({slides,model});
 }catch(e:any){return NextResponse.json({error:e.message||"No se pudo generar el carrusel."},{status:500})}
}
