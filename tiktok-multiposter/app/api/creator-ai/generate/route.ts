import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../lib/auth";
import {supabaseAdmin} from "../../../../lib/supabase-admin";
export const runtime="nodejs"; export const maxDuration=300;
const OPENAI="https://api.openai.com/v1";
function cleanJson(s:string){const a=s.indexOf("[");const b=s.lastIndexOf("]");if(a<0||b<a)throw new Error("La IA no devolvió una estructura válida.");return JSON.parse(s.slice(a,b+1))}
async function readProviderJson(r:Response,label:string){const raw=await r.text();try{return JSON.parse(raw)}catch{throw new Error(`${label} respondió con un formato inválido (HTTP ${r.status}). Reintentá la generación.`)}}
function safeError(j:any){return {type:j?.error?.type||null,code:j?.error?.code||null,message:j?.error?.message||null,param:j?.error?.param||null}}
async function diag(db:any,row:any){try{await db.from("creator_ai_diagnostics").insert(row)}catch{}}
export async function POST(req:Request){
 const session=await getCustomerSession();if(!session)return NextResponse.json({error:"Iniciá sesión."},{status:401});
 const db=supabaseAdmin(); let stage="boot";
 try{
  const {data}=await db.auth.admin.getUserById(session.userId);const plan=String(data.user?.user_metadata?.plan||session.plan||"");
  if(plan!=="escala"&&plan!=="ai")return NextResponse.json({error:"Creator IA está disponible en los planes Escala y VYRAL AI."},{status:403});
  const keySource=process.env.VYRAL_CREATOR_PRODUCTION?"VYRAL_CREATOR_PRODUCTION":"missing";
  const key=process.env.VYRAL_CREATOR_PRODUCTION;
  if(!key){await diag(db,{user_id:session.userId,stage:"config",ok:false,error_code:"missing_key",error_message:"VYRAL_CREATOR_PRODUCTION is not configured"});return NextResponse.json({error:"Falta configurar la API de OpenAI.",diagnosticStage:"config"},{status:503})}
  const body=await req.json();const humanMode=body.humanMode===true;const logoPath=typeof body.logoPath==="string"&&body.logoPath.startsWith(`${session.userId}/creator-ai/references/`)?body.logoPath:"";const personRefPaths=Array.isArray(body.personRefPaths)?body.personRefPaths.filter((x:any)=>typeof x==="string"&&x.startsWith(`${session.userId}/creator-ai/references/`)).slice(0,5):[];const count=Math.min(7,Math.max(1,Number(body.count)||6));const single=!!body.slide;
  const strategy=single?JSON.stringify([body.slide]):`Creá ${count} placas distintas. Estructura recomendada: hook que detiene el scroll, problema/deseo, consecuencia o tensión, solución, beneficio/prueba, oferta y CTA. Adaptala al número de placas.`;
  const referenceSystem=`REFERENCIA VISUAL VYRAL (usar como lenguaje de diseño, NO copiar piezas ni identidades): carruseles editoriales de alto impacto; cada placa sale terminada con texto dentro de la imagen. Jerarquía tipográfica extrema: titular corto grande, 1-2 palabras clave destacadas con bloques de color/subrayado/marcador, texto secundario breve y legible. Mezclar según el tema: editorial blanco con grilla sutil y acentos fuertes; dark premium con neón/gradientes; hoja/cuaderno físico fotografiado con escritura manual, resaltadores, flechas y doodles; collage con fotos/producto/capturas en tarjetas, marcos, stickers, badges y datos. Mucho contraste, composición clara, aire, profundidad y foco único. No hacer una ilustración genérica a pantalla completa. La narrativa visual debe variar entre placas pero mantener paleta/tipografía/sistema. El hook debe impactar inmediatamente. La última placa debe ser un CTA grande y accionable. No inventar métricas, testimonios, logos, perfiles, capturas ni resultados: si faltan pruebas reales, usar beneficio/explicación sin fingir evidencia.`;
  const humanDirection=humanMode?`MODO HUMANO / PERSONAL BRAND: el carrusel debe sentirse producido por un director creativo y fotógrafo humano. Usá a la persona de las referencias cuando aporte a la narrativa, alternando retrato/lifestyle/acción/trabajo/producto/capturas/diagramas para no repetir composiciones. Fotografía hiperrealista, piel y textura naturales, iluminación y óptica plausibles, manos y anatomía realistas, escenarios creíbles, imperfecciones fotográficas sutiles. La persona debe conservar identidad visual consistente entre placas: forma del rostro, ojos, nariz, boca, mandíbula, cabello, tono de piel y proporciones. No embellecer, rejuvenecer ni rediseñar rasgos. No copiar literalmente piezas, marcas, usernames o composiciones de otros creadores. Cada placa debe tener una composición diferente pero una dirección de arte coherente.`:"";
  const prompt=`Sos el director creativo de VYRAL. Diseñás carruseles de Instagram persuasivos en español rioplatense, claros y modernos. ${referenceSystem} ${humanDirection} No inventes testimonios, cifras ni garantías. Cada placa debe tener poco texto y avanzar una historia. Negocio/producto: ${String(body.business||"")}. Oferta: ${String(body.offer||"")}. Público: ${String(body.audience||"")}. Objetivo: ${String(body.goal||"ventas")}. CTA final: ${String(body.cta||"Escribí INFO")}. IMPORTANTE: el CTA se escribe UNA SOLA VEZ. Si la frase ya contiene un verbo de acción como "comentá", "escribí", "mandame", "comprá" o equivalente, no lo antepongas ni lo repitas. Ejemplo: si CTA final es "Comentá BRYAN", renderizar exactamente "Comentá BRYAN", nunca "Comentá Comentá BRYAN". Estética solicitada: ${String(body.tone||"animado premium")}. ${strategy} Respondé SOLO JSON array con objetos {"role":"hook|problema|tension|solucion|beneficio|oferta|cta","title":"máx 9 palabras","copy":"máx 22 palabras","visualPrompt":"dirección de arte detallada para una placa TERMINADA, indicando layout, fondo, tipografía, jerarquía, bloques, fotos/ilustraciones, flechas/stickers y ubicación del texto; composición vertical 4:5, misma identidad/paleta en todo el carrusel"}.`;
  const textModel=process.env.VYRAL_TEXT_MODEL||"gpt-5.6-sol"; stage="text_model";
  const tr=await fetch(OPENAI+"/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:textModel,messages:[{role:"user",content:prompt}]})});
  const tj=await readProviderJson(tr,"La estrategia de IA"); const trId=tr.headers.get("x-request-id");
  await diag(db,{user_id:session.userId,stage,ok:tr.ok,http_status:tr.status,model:textModel,request_id:trId,error_type:safeError(tj).type,error_code:safeError(tj).code,error_message:safeError(tj).message,details:{key_source:keySource,endpoint:"chat/completions",param:safeError(tj).param}});
  if(!tr.ok)return NextResponse.json({error:tj.error?.message||"Falló la estrategia de IA.",diagnosticStage:stage,requestId:trId},{status:tr.status});
  let slides=cleanJson(tj.choices?.[0]?.message?.content||""); slides=single?slides.slice(0,1):slides.slice(0,count);
  const model=process.env.VYRAL_IMAGE_MODEL||"gpt-image-2";
  const generated=await Promise.all(slides.map(async(s:any,i:number)=>{
   const imageStage=`image_${i+1}`;const personRule=humanMode&&personRefPaths.length?`Identity references are attached. Preserve the same person faithfully across generated scenes: facial geometry, eyes, nose, mouth, jaw, hair, skin tone and distinctive visible traits. Do not beautify, age-shift, change ethnicity, reshape the face or invent facial details. Use natural photographic variation only in pose, expression, wardrobe, lighting, lens and environment. Do not place the person in every slide unless narratively useful.`:"No person identity reference is supplied.";const logoRule=logoPath?"A brand logo reference is attached. Preserve its recognizable symbol, proportions, colors and lettering as faithfully as possible. Integrate it naturally as a small brand signature; do not redesign it, invent a replacement, or make it dominate the composition.":"No brand logo was supplied; do not invent one.";const ip=`Create a FINISHED premium Instagram carousel slide, vertical 4:5. ${referenceSystem} Slide role: ${s.role}. Exact headline to render legibly: "${s.title}". Exact supporting copy to render legibly: "${s.copy}". ${s.visualPrompt}. Business context: ${String(body.business||"")}. Requested style: ${String(body.tone||"editorial premium")}. ${humanDirection} ${personRule} The text is part of the final design: render it clearly, correctly spelled in Spanish, with strong hierarchy and highlighted keywords. Do not add invented claims, fake UI, fake logos or watermarks. Maintain visual continuity with the carousel while making this slide compositionally distinct.`;
   const refPaths=[...(logoPath?[logoPath]:[]),...(humanMode?personRefPaths:[])];const editRefs=await Promise.all(refPaths.map(async(path:string)=>{const d=await db.storage.from("scheduled-media").download(path);if(d.error||!d.data)throw new Error("No se pudo leer una imagen de referencia.");return {path,blob:d.data};}));const imageEndpoint=editRefs.length?"/images/edits":"/images/generations";
   let imageBody:BodyInit;
   if(editRefs.length){
    const form=new FormData();
    form.append("model",model);
    form.append("prompt",ip+" "+logoRule+" "+personRule);
    form.append("size","1024x1280");
    form.append("quality","medium");
    form.append("output_format","webp");
    editRefs.forEach((ref:any,refIndex:number)=>{
     const mime=ref.blob.type||"image/jpeg";const ext=mime==="image/jpeg"?"jpg":mime.split("/")[1]||"img";
     form.append("image[]",ref.blob,refIndex===0&&logoPath?"brand-logo."+ext:"person-reference-"+refIndex+"."+ext);
    });
    imageBody=form;
   }else{
    imageBody=JSON.stringify({model,prompt:ip+" "+logoRule,size:"1024x1280",quality:"medium",output_format:"webp"});
   }
   const headers:Record<string,string>={Authorization:"Bearer "+key};
   if(!editRefs.length)headers["Content-Type"]="application/json";
   let ir=await fetch(OPENAI+imageEndpoint,{method:"POST",headers,body:imageBody});
   let ij=await readProviderJson(ir,`La generación de la imagen ${i+1}`);let irId=ir.headers.get("x-request-id");
   if(ir.status===429){
    const retryMs=Math.min(20000,Math.max(12000,Number(ir.headers.get("retry-after")||0)*1000||12000));
    await new Promise(resolve=>setTimeout(resolve,retryMs));
    ir=await fetch(OPENAI+imageEndpoint,{method:"POST",headers,body:imageBody});
    ij=await readProviderJson(ir,`La generación de la imagen ${i+1}`);irId=ir.headers.get("x-request-id");
   }
   await diag(db,{user_id:session.userId,stage:imageStage,ok:ir.ok,http_status:ir.status,model,request_id:irId,error_type:safeError(ij).type,error_code:safeError(ij).code,error_message:safeError(ij).message,details:{key_source:keySource,endpoint:editRefs.length?"images/edits":"images/generations",slide:i+1,logo_used:!!logoPath,human_mode:humanMode,person_refs:personRefPaths.length,param:safeError(ij).param}});
   if(!ir.ok)throw new Error(ij.error?.message||`Falló la generación de la imagen ${i+1}.`);
   const b64=ij.data?.[0]?.b64_json;if(!b64)throw new Error(`OpenAI no devolvió la imagen ${i+1}.`);
   const imageBytes=Uint8Array.from(atob(b64),ch=>ch.charCodeAt(0));
   const storagePath=`${session.userId}/creator-ai/${crypto.randomUUID()}-${i+1}.webp`;
   const uploaded=await db.storage.from("scheduled-media").upload(storagePath,imageBytes,{contentType:"image/webp",upsert:false});
   if(uploaded.error)throw new Error(`No se pudo guardar la placa ${i+1}: ${uploaded.error.message}`);
   const signed=await db.storage.from("scheduled-media").createSignedUrl(storagePath,86400);
   if(signed.error||!signed.data?.signedUrl)throw new Error(`No se pudo preparar la placa ${i+1}.`);
   return {role:s.role,title:s.title,copy:s.copy,image:signed.data.signedUrl,storagePath};
  }));
  return NextResponse.json({slides:generated,model});
 }catch(e:any){await diag(db,{user_id:session.userId,stage,ok:false,error_type:"local_exception",error_message:e.message||"unknown"});return NextResponse.json({error:e.message||"No se pudo generar el carrusel.",diagnosticStage:stage},{status:500})}
}