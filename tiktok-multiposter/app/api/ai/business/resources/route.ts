import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../../lib/auth";
import {supabaseAdmin} from "../../../../../lib/supabase-admin";
const BUCKET="scheduled-media";
const clean=(v:any,n=1600)=>String(v||"").trim().slice(0,n);
export async function GET(){const s=await getCustomerSession();if(!s)return NextResponse.json({error:"No autorizado"},{status:401});const {data,error}=await supabaseAdmin().from("vyral_business_resources").select("*").eq("user_id",s.userId).order("created_at",{ascending:false});if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({resources:data||[]})}
export async function POST(req:Request){const s=await getCustomerSession();if(!s)return NextResponse.json({error:"No autorizado"},{status:401});const b=await req.json().catch(()=>({})),kind=b.kind==="url"?"url":"file",db=supabaseAdmin();if(kind==="url"){let url="";try{const u=new URL(clean(b.url,1800));if(!["http:","https:"].includes(u.protocol))throw 0;url=u.toString()}catch{return NextResponse.json({error:"Ingresá una URL válida."},{status:400})}const {data,error}=await db.from("vyral_business_resources").insert({user_id:s.userId,name:clean(b.name,180)||url,kind:"url",external_url:url,purpose:clean(b.purpose),send_when:clean(b.send_when,900)}).select("*").single();if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({ok:true,resource:data})}
 const name=clean(b.name,180).replace(/[^a-zA-Z0-9._-]/g,"_")||"recurso",type=clean(b.type,120)||"application/octet-stream",size=Number(b.size||0);if(!size||size>50*1024*1024)return NextResponse.json({error:"El archivo debe pesar menos de 50 MB."},{status:400});const path=`business-resource/${s.userId}/${crypto.randomUUID()}-${name}`,q=await db.storage.from(BUCKET).createSignedUploadUrl(path,{upsert:false});if(q.error||!q.data)return NextResponse.json({error:"No se pudo preparar el archivo."},{status:500});const {data,error}=await db.from("vyral_business_resources").insert({user_id:s.userId,name:clean(b.name,180)||name,kind:"file",storage_path:path,mime_type:type,purpose:clean(b.purpose),send_when:clean(b.send_when,900)}).select("*").single();if(error)return NextResponse.json({error:error.message},{status:500});return NextResponse.json({ok:true,resource:data,signedUrl:q.data.signedUrl,path})}
export async function DELETE(req:Request){const s=await getCustomerSession();if(!s)return NextResponse.json({error:"No autorizado"},{status:401});const id=new URL(req.url).searchParams.get("id");if(!id)return NextResponse.json({error:"Falta id"},{status:400});const db=supabaseAdmin(),old=await db.from("vyral_business_resources").select("storage_path").eq("id",id).eq("user_id",s.userId).maybeSingle();const del=await db.from("vyral_business_resources").delete().eq("id",id).eq("user_id",s.userId);if(del.error)return NextResponse.json({error:del.error.message},{status:500});if(old.data?.storage_path)await db.storage.from(BUCKET).remove([old.data.storage_path]);return NextResponse.json({ok:true})}


export async function PATCH(req:Request){
 const s=await getCustomerSession();if(!s)return NextResponse.json({error:"No autorizado"},{status:401});
 const b=await req.json().catch(()=>({}));
 if(b.action!=="analyze")return NextResponse.json({error:"Acción no válida."},{status:400});
 const db=supabaseAdmin(),key=process.env.VYRAL_CREATOR_PRODUCTION;
 if(!key)return NextResponse.json({error:"IA no configurada."},{status:503});
 const id=clean(b.id,120);
 let resource:any=null;
 if(id){const q=await db.from("vyral_business_resources").select("id,name,kind,storage_path,external_url,mime_type").eq("id",id).eq("user_id",s.userId).maybeSingle();resource=q.data}
 const name=clean(resource?.name||b.name,180),mime=clean(resource?.mime_type||b.type,120),kind=resource?.kind||b.kind;
 let source=String(b.dataUrl||"").trim()||clean(resource?.external_url||b.url,1800);
 if(source.startsWith("data:")&&source.length>12*1024*1024)return NextResponse.json({error:"La imagen es demasiado grande para analizarla directamente."},{status:413});
 if(!source&&resource?.storage_path){const q=await db.storage.from(BUCKET).createSignedUrl(String(resource.storage_path),3600);source=String(q.data?.signedUrl||"")}
 if(!source)return NextResponse.json({error:"No se pudo obtener el recurso para analizar."},{status:400});
 const visual=source.startsWith("data:image/")||/^image\//i.test(mime)||/\.(png|jpe?g|webp|gif)(?:$|\?)/i.test(source);
 const prompt=`Analizá este recurso de negocio con muchísimo detalle y de forma universal, sin asumir industria. Mirá el contenido visual completo. Identificá, sólo cuando sea realmente visible, la plataforma/software/producto/interfaz, títulos, textos, métricas, porcentajes, cantidades, fechas, tablas, gráficos, resultados y cualquier evidencia relevante. Explicá qué demuestra y qué NO permite concluir para evitar que el agente invente. Devolvé JSON válido con exactamente dos campos: "purpose" = descripción rica, concreta y autosuficiente de 2 a 4 oraciones sobre qué contiene/demuestra, incluyendo los datos visibles importantes; "send_when" = 1 o 2 oraciones con las preguntas/intenciones concretas del cliente ante las que conviene enviarlo y cuándo NO enviarlo de forma proactiva. No inventes ni completes datos ilegibles. Nombre: ${name||"Sin nombre"}. Tipo: ${mime||kind||"desconocido"}.`;
 const content:any[]=[{type:"input_text",text:prompt}];
 if(visual)content.push({type:"input_image",image_url:source});
 else content[0].text+=` URL de referencia: ${source}`;
 try{
  const r=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},body:JSON.stringify({model:"gpt-5.6-luna",input:[{role:"user",content}],max_output_tokens:650,text:{format:{type:"json_schema",name:"resource_analysis",strict:true,schema:{type:"object",properties:{purpose:{type:"string"},send_when:{type:"string"}},required:["purpose","send_when"],additionalProperties:false}}}}),signal:AbortSignal.timeout(30000)});
  const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j?.error?.message||`OpenAI HTTP ${r.status}`);
  let raw=String(j.output_text||"");if(!raw)for(const x of j.output||[])for(const z of x.content||[])if(z.type==="output_text")raw+=z.text||"";
  raw=raw.trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"").replace(/^~~~(?:json)?\s*/i,"").replace(/\s*~~~$/,"").trim();
  const first=raw.indexOf("{"),last=raw.lastIndexOf("}");if(first<0||last<first)throw new Error("OpenAI no devolvió JSON analizable");
  const parsed=JSON.parse(raw.slice(first,last+1));
  const purpose=clean(parsed.purpose),sendWhen=clean(parsed.send_when,900);
  if(!purpose||!sendWhen)throw new Error("El análisis llegó incompleto");
  return NextResponse.json({ok:true,purpose,send_when:sendWhen});
 }catch(e:any){console.error("[VYRAL resources] AI analysis failed",{name,mime,error:String(e?.message||e)});return NextResponse.json({error:"No se pudo analizar la imagen.",detail:String(e?.message||e).slice(0,500)},{status:502})}
}
