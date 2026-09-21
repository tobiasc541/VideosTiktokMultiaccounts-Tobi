import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../lib/auth";
import {supabaseAdmin} from "../../../../lib/supabase-admin";
export const runtime="nodejs";export const maxDuration=60;
function parse(s:string){const a=s.indexOf("[");const b=s.lastIndexOf("]");if(a<0||b<a)throw new Error("La IA no devolvió ideas válidas.");return JSON.parse(s.slice(a,b+1))}
export async function POST(req:Request){
 const session=await getCustomerSession();if(!session)return NextResponse.json({error:"Iniciá sesión."},{status:401});
 const db=supabaseAdmin();const {data}=await db.auth.admin.getUserById(session.userId);const plan=String(data.user?.user_metadata?.plan||session.plan||"");
 if(plan!=="escala"&&plan!=="ai")return NextResponse.json({error:"Creator IA requiere Escala o VYRAL AI."},{status:403});
 const key=process.env.VYRAL_CREATOR_PRODUCTION;if(!key)return NextResponse.json({error:"Falta configurar la IA."},{status:503});
 try{const b=await req.json();const brief=String(b.brief||"").trim();if(brief.length<3)return NextResponse.json({error:"Contame brevemente qué querés vender o comunicar."},{status:400});
 const prompt=`Sos director creativo de performance para VYRAL. A partir de este brief: "${brief}", proponé 8 conceptos de carrusel de Instagram que parezcan creados por un equipo humano, no por una plantilla de IA. Mezclá UGC hiperrealista con personas reales, producto en uso, lifestyle, testimonial visual sin inventar testimonios, demostración, problema/solución, comparativa visual sin datos falsos, editorial premium y storytelling. Priorizá conceptos que detengan el scroll y vendan. Respondé SOLO JSON array. Cada objeto: {"id":"idea-1","name":"nombre corto","hook":"hook","angle":"ángulo","humanStyle":"cómo aparecen personas/producto","business":"descripción completa producto/negocio","offer":"oferta/propuesta sin inventar precio","audience":"público probable","goal":"ventas|mensajes|seguidores|trafico|educar","tone":"dirección visual detallada, hiperrealista cuando corresponda","cta":"CTA concreto","count":6}. No inventes precio, métricas, testimonios ni características que no estén en el brief.`;
 const r=await fetch("https://api.openai.com/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:process.env.VYRAL_TEXT_MODEL||"gpt-5.6-sol",messages:[{role:"user",content:prompt}]})});const j=await r.json();if(!r.ok)throw new Error(j.error?.message||"No se pudieron crear ideas.");return NextResponse.json({ideas:parse(j.choices?.[0]?.message?.content||"").slice(0,8)});
 }catch(e:any){return NextResponse.json({error:e.message||"No se pudieron crear ideas."},{status:500})}
}