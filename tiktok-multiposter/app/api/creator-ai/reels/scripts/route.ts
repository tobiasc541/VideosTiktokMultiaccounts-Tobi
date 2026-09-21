import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../../lib/auth";
import {supabaseAdmin} from "../../../../../lib/supabase-admin";
export const runtime="nodejs";
function parseJson(s:string){const a=s.indexOf("[");const b=s.lastIndexOf("]");if(a<0||b<a)throw new Error("La IA no devolvió guiones válidos.");return JSON.parse(s.slice(a,b+1))}
export async function POST(req:Request){
 const session=await getCustomerSession();if(!session)return NextResponse.json({error:"Iniciá sesión."},{status:401});
 const db=supabaseAdmin();const {data}=await db.auth.admin.getUserById(session.userId);const plan=String(data.user?.user_metadata?.plan||session.plan||"");
 if(plan!=="ai")return NextResponse.json({error:"Creator Reels está disponible en VYRAL AI."},{status:403});
 const key=process.env.VYRAL_CREATOR_PRODUCTION;if(!key)return NextResponse.json({error:"Falta configurar el motor de IA."},{status:503});
 try{const b=await req.json();const duration=Math.min(30,Math.max(10,Number(b.duration)||30));const prompt=`Actuás como director creativo de anuncios UGC para VYRAL. Generá 5 conceptos distintos para un Reel vertical de máximo ${duration} segundos. Producto/brief: ${String(b.product||"")}. URL aportada por el usuario (solo como contexto textual; no afirmes haberla navegado): ${String(b.sourceUrl||"")}. Público: ${String(b.audience||"")}. Idioma: ${String(b.language||"Español (Argentina)")}. Estilo: ${String(b.style||"UGC")}. Cada guion debe poder decirse naturalmente dentro del tiempo. No inventes precios, testimonios, métricas ni características no provistas. Respondé SOLO JSON array de 5 objetos {"id":1,"hook":"hook breve","angle":"nombre del enfoque","script":"guion hablado completo","cta":"CTA breve"}.`;
 const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.VYRAL_TEXT_MODEL||"gpt-5.6-sol",messages:[{role:"user",content:prompt}]})});const j=await r.json();if(!r.ok)return NextResponse.json({error:j.error?.message||"Falló la generación de guiones."},{status:r.status});return NextResponse.json({scripts:parseJson(j.choices?.[0]?.message?.content||"")});
 }catch(e:any){return NextResponse.json({error:e.message||"No se pudieron generar los guiones."},{status:500})}
}