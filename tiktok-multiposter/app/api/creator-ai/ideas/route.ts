import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../lib/auth";
import {supabaseAdmin} from "../../../../lib/supabase-admin";

export const runtime="nodejs";
export const maxDuration=300;

function parseIdeas(value:string){
 const raw=value.trim().replace(/^\`\`\`(?:json)?\s*/i,"").replace(/\s*\`\`\`$/,"");
 const parsed=JSON.parse(raw);
 const ideas=Array.isArray(parsed)?parsed:parsed?.ideas;
 if(!Array.isArray(ideas))throw new Error("La IA no devolvió una lista de ideas válida.");
 return ideas.slice(0,8);
}

export async function POST(req:Request){
 const session=await getCustomerSession();
 if(!session)return NextResponse.json({error:"Iniciá sesión."},{status:401});
 const db=supabaseAdmin();
 const {data}=await db.auth.admin.getUserById(session.userId);
 const plan=String(data.user?.user_metadata?.plan||session.plan||"");
 if(plan!=="escala"&&plan!=="ai")return NextResponse.json({error:"Creator IA requiere Escala o VYRAL AI."},{status:403});
 const key=process.env.VYRAL_CREATOR_PRODUCTION;
 if(!key)return NextResponse.json({error:"Falta configurar la IA."},{status:503});

 try{
  const b=await req.json();
  const brief=String(b.brief||"").trim();
  const previousIdeas=Array.isArray(b.previousIdeas)?b.previousIdeas.map((x:any)=>String(x||"").trim()).filter(Boolean).slice(-24):[];
  const variationSeed=String(b.variationSeed||crypto.randomUUID());
  if(brief.length<3)return NextResponse.json({error:"Contame brevemente qué querés vender o comunicar."},{status:400});

  const prompt=`Sos director creativo senior de performance para VYRAL. Brief: "${brief}". Creá exactamente 8 conceptos de carrusel realmente diferentes entre sí y diferentes de ejecuciones anteriores.

REGLA DE DIVERSIDAD: no uses ocho variantes de problema→solución. En esta tanda cubrí 8 familias creativas distintas elegidas y combinadas de este banco: historia personal/documental, POV, mito o creencia contraria, comparación A/B, antes/después sin inventar resultados, demostración paso a paso, lista/checklist, errores frecuentes, mini caso sin datos inventados, detrás de escena, diario/nota manuscrita, editorial de revista, UGC/lifestyle, conversación/chat ficticio claramente ilustrativo, objeto/metáfora visual, tutorial, desafío/pregunta, aspiracional, humor observacional, producto en contexto, framework/diagrama, manifiesto/opinión, FAQ/objeciones. Cambiá también hooks, ritmo, estructura narrativa, dirección de arte, presencia humana, fondos, encuadres, tipografías y CTA. No repitas fórmulas como "la clave", "nadie te cuenta", "no es X es Y" más de una vez.

Cada idea debe tener un hook semánticamente distinto y una dirección visual específica. Algunas pueden ser minimalistas, otras fotográficas, otras editoriales, otras diagramáticas o UGC; no fuerces personas en todas.

Ideas/títulos ya mostrados al usuario que NO debés repetir ni parafrasear de cerca: ${previousIdeas.length?previousIdeas.join(" | "):"ninguna"}.
Semilla de variación de esta tanda: ${variationSeed}. Usala solo para forzar una nueva exploración creativa, no la menciones en la respuesta.

No inventes precio, métricas, testimonios ni características ausentes. Priorizá ideas vendibles pero genuinamente variadas. Devolvé un objeto JSON con una única clave "ideas". "ideas" debe ser un array de 8 objetos con: id, name, hook, angle, humanStyle, business, offer, audience, goal, tone, cta, count. goal solo puede ser ventas, mensajes, seguidores, trafico o educar. count debe ser 6.`;

  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),120000);
  let r:Response;
  try{
   r=await fetch("https://api.openai.com/v1/chat/completions",{
    method:"POST",
    signal:controller.signal,
    headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({
     model:process.env.VYRAL_TEXT_MODEL||"gpt-5.6-sol",
     messages:[{role:"user",content:prompt}],
     response_format:{type:"json_object"},
     max_completion_tokens:3000
    })
   });
  }finally{clearTimeout(timer)}

  const raw=await r.text();
  let j:any;
  try{j=JSON.parse(raw)}catch{throw new Error(`El proveedor de IA respondió en un formato inválido (HTTP ${r.status}).`)}
  if(!r.ok)throw new Error(j.error?.message||`No se pudieron crear ideas (HTTP ${r.status}).`);
  const content=String(j.choices?.[0]?.message?.content||"");
  return NextResponse.json({ideas:parseIdeas(content)});
 }catch(e:any){
  const message=e?.name==="AbortError"?"La IA tardó demasiado en responder. Intentá nuevamente; la solicitud anterior fue cancelada.":e?.message||"No se pudieron crear ideas.";
  return NextResponse.json({error:message},{status:e?.name==="AbortError"?504:500});
 }
}
