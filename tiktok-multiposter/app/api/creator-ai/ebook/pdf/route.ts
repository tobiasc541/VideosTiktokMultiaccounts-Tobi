import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../../lib/auth";
import {supabaseAdmin} from "../../../../../lib/supabase-admin";
export const runtime="nodejs";export const maxDuration=300;
function pdfFromJpegs(images:{bytes:Uint8Array;width:number;height:number}[]){
 const enc=new TextEncoder();const parts:Uint8Array[]=[];let offset=0;const offsets:number[]=[0];const push=(x:string|Uint8Array)=>{const b=typeof x==="string"?enc.encode(x):x;parts.push(b);offset+=b.length};push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");let obj=1;const catalog=obj++,pagesObj=obj++;const pageObjs:number[]=[],contentObjs:number[]=[],imageObjs:number[]=[];for(let i=0;i<images.length;i++){pageObjs.push(obj++);contentObjs.push(obj++);imageObjs.push(obj++)}const start=(n:number)=>{offsets[n]=offset;push(`${n} 0 obj\n`)};start(catalog);push(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>\nendobj\n`);start(pagesObj);push(`<< /Type /Pages /Count ${images.length} /Kids [${pageObjs.map(n=>`${n} 0 R`).join(" ")}] >>\nendobj\n`);
 for(let i=0;i<images.length;i++){const im=images[i],pw=595.276,ph=841.89;start(pageObjs[i]);push(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im${i+1} ${imageObjs[i]} 0 R >> >> /Contents ${contentObjs[i]} 0 R >>\nendobj\n`);const stream=`q\n${pw} 0 0 ${ph} 0 0 cm\n/Im${i+1} Do\nQ\n`;start(contentObjs[i]);push(`<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}endstream\nendobj\n`);start(imageObjs[i]);push(`<< /Type /XObject /Subtype /Image /Width ${im.width} /Height ${im.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`);push(im.bytes);push("\nendstream\nendobj\n")}
 const xref=offset;push(`xref\n0 ${obj}\n0000000000 65535 f \n`);for(let n=1;n<obj;n++)push(`${String(offsets[n]).padStart(10,"0")} 00000 n \n`);push(`trailer\n<< /Size ${obj} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`);const total=parts.reduce((a,b)=>a+b.length,0),out=new Uint8Array(total);let p=0;for(const b of parts){out.set(b,p);p+=b.length}return out}
async function imageToJpeg(blob:Blob){const sharp=(await import("sharp")).default;const input=Buffer.from(await blob.arrayBuffer());const meta=await sharp(input).metadata();const width=meta.width||1024,height=meta.height||1280;const jpg=await sharp(input).flatten({background:"#ffffff"}).jpeg({quality:92,mozjpeg:true}).toBuffer();return {bytes:new Uint8Array(jpg),width,height}}
async function readPage(db:any,path:string,url:string|undefined,index:number){
 // Fuente principal: el original persistido en Storage. Si una lectura puntual de Storage falla,
 // usamos la URL firmada que ya está mostrando el navegador. Así no obligamos a regenerar páginas.
 if(path){const d=await db.storage.from("scheduled-media").download(path);if(!d.error&&d.data)return d.data}
 if(url){const r=await fetch(url,{cache:"no-store"});if(r.ok)return await r.blob()}
 throw new Error(`No se pudo leer la página ${index+1}. Reintentá el PDF; no hace falta regenerar el ebook.`)
}
export async function POST(req:Request){
 const session=await getCustomerSession();if(!session)return NextResponse.json({error:"Iniciá sesión."},{status:401});const db=supabaseAdmin();
 try{
  const b=await req.json();const title=String(b.title||"ebook").trim().slice(0,120);const paths=Array.isArray(b.storagePaths)?b.storagePaths.map(String):[];const urls=Array.isArray(b.imageUrls)?b.imageUrls.map(String):[];
  if(!paths.length||paths.length>45)return NextResponse.json({error:"El ebook debe tener entre 1 y 45 páginas generadas."},{status:400});
  if(paths.some((p:string)=>!p.startsWith(`${session.userId}/creator-ai/ebooks/`)))return NextResponse.json({error:"Una página no pertenece a este ebook."},{status:403});
  const imgs=[];for(let i=0;i<paths.length;i++){const blob=await readPage(db,paths[i],urls[i],i);imgs.push(await imageToJpeg(blob))}
  const pdf=pdfFromJpegs(imgs);const safe=title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").toLowerCase()||"ebook";const pdfPath=`${session.userId}/creator-ai/ebooks/${crypto.randomUUID()}-${safe}.pdf`;const up=await db.storage.from("scheduled-media").upload(pdfPath,pdf,{contentType:"application/pdf",upsert:false});if(up.error)throw new Error(`No se pudo guardar el PDF: ${up.error.message}`);const signed=await db.storage.from("scheduled-media").createSignedUrl(pdfPath,3600);if(signed.error||!signed.data?.signedUrl)throw new Error("El PDF se creó pero no se pudo preparar la descarga.");return NextResponse.json({url:signed.data.signedUrl,storagePath:pdfPath,pages:paths.length});
 }catch(e:any){return NextResponse.json({error:e.message||"No se pudo crear el PDF."},{status:500})}
}
