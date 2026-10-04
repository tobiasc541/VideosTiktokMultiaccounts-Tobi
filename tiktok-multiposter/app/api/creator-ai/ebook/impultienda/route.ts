import {NextResponse} from "next/server";
import {createClient} from "@/lib/supabase/server";

export const maxDuration=300;
const MODEL=process.env.VYRAL_EBOOK_TEXT_MODEL||process.env.VYRAL_TEXT_MODEL||"gpt-5.6-sol";

async function call(system:string,input:any){
  const key=process.env.OPENAI_API_KEY;
  if(!key)throw new Error("OPENAI_API_KEY no configurada");
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:MODEL,input:[{role:"system",content:[{type:"input_text",text:system}]},{role:"user",content:[{type:"input_text",text:JSON.stringify(input)}]}]})});
  const j=await r.json();
  if(!r.ok)throw new Error(j?.error?.message||"Error de IA");
  const raw=j.output_text||j.output?.flatMap((x:any)=>x.content||[]).find((x:any)=>x.type==="output_text")?.text;
  if(!raw)throw new Error("La IA no devolvió HTML");
  return raw.replace(/^```html\s*/i,"").replace(/```\s*$/i,"").trim();
}

export async function POST(req:Request){
  try{
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser();
    if(!user)return NextResponse.json({error:"No autorizado"},{status:401});
    const b=await req.json();
    if(!b.brief||!b.plan)return NextResponse.json({error:"Primero generá el producto principal y su estructura."},{status:400});
    const assets=b.assets||{};
    if(!assets.main)return NextResponse.json({error:"Pegá al menos la URL del mockup del producto principal."},{status:400});
    const input={brief:b.brief,plan:b.plan,assets,heroDesktop:b.heroDesktop||"",heroMobile:b.heroMobile||""};
    const html=await call(`Sos VYRAL Landing Engine, especialista en páginas de venta premium EXCLUSIVAMENTE para ImpulTienda. Entregá SOLO un documento HTML completo desde <!DOCTYPE html> hasta </html>, sin markdown ni explicación.

REGLAS IMPULTIENDA OBLIGATORIAS:
- CTA de compra: href="/checkout" o data-checkout.
- Preservá literalmente los tokens {{price}}, {{original_price}}, {{savings}} y {{currency}} cuando correspondan. Nunca los reemplaces por valores inventados.
- HTML/CSS/JS autocontenido, responsive y listo para pegar en el editor HTML de ImpulTienda.
- No uses dependencias JS externas ni frameworks.
- No inventes testimonios, resultados, estadísticas, garantías, escasez ni urgencia. Si usás conversaciones ilustrativas, rotulalas claramente como recreadas/ilustrativas.

DATOS Y OFERTA:
- Usá el brief y plan como fuente principal de avatar, dolores, transformación, tono, promesa, contenido y Style Bible.
- assets.main es el mockup principal obligatorio.
- assets.bonuses contiene hasta 5 bonos OPCIONALES. Ignorá por completo slots vacíos. No muestres tarjetas vacías ni menciones bonos inexistentes.
- assets.upsells contiene hasta 3 upsells OPCIONALES, pero NO los incluyas en la landing principal salvo que includeUpsells sea true. Por defecto son post-compra.
- Cada asset puede incluir name,url,value,description. No inventes precio/valor si no existe.
- Si existen bonos, construí una sección premium de regalos y un value stack coherente únicamente con datos disponibles.

DIRECCIÓN VISUAL:
- Inferí la identidad visual del Style Bible y del producto. No conviertas esto en una plantilla genérica rígida.
- La landing debe sentirse diseñada específicamente para este producto: jerarquía editorial fuerte, espacios premium, contraste, tarjetas, imágenes y CTA claros.
- Desktop y móvil deben estar diseñados intencionalmente. No resuelvas móvil apilando mecánicamente todo si la composición puede conservarse con escalado/rejillas.
- FAQ debe ser especialmente legible y táctil en celular.
- Si heroDesktop existe, usalo como fondo del hero desktop. Si heroMobile existe, usalo específicamente en media query móvil. Si falta uno, diseñá un hero sólido usando el mockup principal sin inventar URLs.
- No deformes imágenes: object-fit adecuado.

ESTRUCTURA RECOMENDADA, ADAPTABLE AL PRODUCTO:
hero con promesa + precio + CTA; identificación del problema; mecanismo/nueva forma de mirar; contenido/beneficios; bonos existentes; value stack; situaciones/conversaciones ilustrativas solo si aportan; FAQ; CTA final. Podés ajustar secciones según el producto, pero mantené una narrativa comercial completa.

COPY:
- Escribí para el avatar real del brief, usando su idioma y tono.
- Vendé mediante claridad del problema, mecanismo, transformación y contenido; no mediante claims inventados.
- FAQ debe responder objeciones reales del producto y del acceso digital.

Devolvé exclusivamente HTML válido.`,input);
    return NextResponse.json({html});
  }catch(e:any){return NextResponse.json({error:e.message||"Error interno"},{status:500})}
}
