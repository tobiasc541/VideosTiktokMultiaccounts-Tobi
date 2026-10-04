import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../../lib/auth";
import {supabaseAdmin} from "../../../../../lib/supabase-admin";
export const runtime="nodejs";export const maxDuration=300;
const OPENAI="https://api.openai.com/v1";
function sleep(ms:number){return new Promise(r=>setTimeout(r,ms))}
export async function POST(req:Request){
 const session=await getCustomerSession();if(!session)return NextResponse.json({error:"Iniciá sesión."},{status:401});
 const db=supabaseAdmin();const {data}=await db.auth.admin.getUserById(session.userId);const plan=String(data.user?.user_metadata?.plan||session.plan||"");if(plan!=="escala"&&plan!=="ai")return NextResponse.json({error:"Ebooks IA requiere Escala o VYRAL AI."},{status:403});
 const key=process.env.VYRAL_CREATOR_PRODUCTION;if(!key)return NextResponse.json({error:"Falta configurar la API de OpenAI."},{status:503});
 try{
  const b=await req.json();const page=Number(b.page);const total=Number(b.total);const prompt=String(b.prompt||"").trim();if(!page||!total||!prompt)return NextResponse.json({error:"Faltan datos de la página."},{status:400});
  // EBOOK IA tiene una política de coste/calidad propia: siempre medium. No hereda High/Premium del Creator normal.
  const model=process.env.VYRAL_EBOOK_IMAGE_MODEL||process.env.VYRAL_IMAGE_MODEL||"gpt-image-2";
  const finalPrompt=`Create EXACTLY ONE finished ebook page. This request is page ${page} of ${total}, but NEVER render, preview, mention or include any other page. One image = one complete page. Vertical 4:5 canvas, flat front view, edge-to-edge. No book mockup, no perspective, no spread, no grid, no collage, no contact sheet, no thumbnails. Preserve exact supplied Spanish text and strong editorial legibility. ${prompt}`;
  let r:Response|null=null,j:any=null;
  for(let attempt=0;attempt<4;attempt++){
   r=await fetch(OPENAI+"/images/generations",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model,prompt:finalPrompt,size:"1024x1280",quality:"medium",output_format:"webp"})});
   const raw=await r.text();try{j=JSON.parse(raw)}catch{j={error:{message:`Respuesta inválida del generador (HTTP ${r.status}).`}}}
   if(r.ok)break;if(![408,409,429,500,502,503,504].includes(r.status)||attempt===3)break;await sleep(4000*Math.pow(2,attempt));
  }
  if(!r?.ok)throw new Error(j?.error?.message||`Falló la página ${page}.`);const b64=j?.data?.[0]?.b64_json;if(!b64)throw new Error("El generador no devolvió la imagen.");
  const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const path=`${session.userId}/creator-ai/ebooks/${crypto.randomUUID()}-${String(page).padStart(3,"0")}.webp`;const up=await db.storage.from("scheduled-media").upload(path,bytes,{contentType:"image/webp",upsert:false});if(up.error)throw new Error(up.error.message);const signed=await db.storage.from("scheduled-media").createSignedUrl(path,86400);if(signed.error||!signed.data?.signedUrl)throw new Error("No se pudo preparar la página.");return NextResponse.json({image:signed.data.signedUrl,storagePath:path,model,quality:"medium"});
 }catch(e:any){return NextResponse.json({error:e.message||"No se pudo generar la página."},{status:500})}
}
