import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../../lib/auth";
import {supabaseAdmin} from "../../../../../lib/supabase-admin";
export const runtime="nodejs";export const maxDuration=300;

type JpegPage={bytes:Uint8Array;width:number;height:number};
function pdfFromJpegs(images:JpegPage[]){
 const enc=new TextEncoder();const parts:Uint8Array[]=[];let offset=0;const offsets:number[]=[0];const push=(x:string|Uint8Array)=>{const b=typeof x==="string"?enc.encode(x):x;parts.push(b);offset+=b.length};push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");let obj=1;const catalog=obj++,pagesObj=obj++;const pageObjs:number[]=[],contentObjs:number[]=[],imageObjs:number[]=[];for(let i=0;i<images.length;i++){pageObjs.push(obj++);contentObjs.push(obj++);imageObjs.push(obj++)}const start=(n:number)=>{offsets[n]=offset;push(`${n} 0 obj\n`)};start(catalog);push(`<< /Type /Catalog /Pages ${pagesObj} 0 R >>\nendobj\n`);start(pagesObj);push(`<< /Type /Pages /Count ${images.length} /Kids [${pageObjs.map(n=>`${n} 0 R`).join(" ")}] >>\nendobj\n`);
 for(let i=0;i<images.length;i++){const im=images[i],pw=595.276,ph=841.89;start(pageObjs[i]);push(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /XObject << /Im${i+1} ${imageObjs[i]} 0 R >> >> /Contents ${contentObjs[i]} 0 R >>\nendobj\n`);const stream=`q\n${pw} 0 0 ${ph} 0 0 cm\n/Im${i+1} Do\nQ\n`;start(contentObjs[i]);push(`<< /Length ${enc.encode(stream).length} >>\nstream\n${stream}endstream\nendobj\n`);start(imageObjs[i]);push(`<< /Type /XObject /Subtype /Image /Width ${im.width} /Height ${im.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`);push(im.bytes);push("\nendstream\nendobj\n")}
 const xref=offset;push(`xref\n0 ${obj}\n0000000000 65535 f \n`);for(let n=1;n<obj;n++)push(`${String(offsets[n]).padStart(10,"0")} 00000 n \n`);push(`trailer\n<< /Size ${obj} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`);const total=parts.reduce((a,b)=>a+b.length,0),out=new Uint8Array(total);let p=0;for(const b of parts){out.set(b,p);p+=b.length}return out
}
function signature(bytes:Uint8Array){if(bytes.length>=3&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)return"jpeg";if(bytes.length>=8&&bytes[0]===0x89&&bytes[1]===0x50&&bytes[2]===0x4e&&bytes[3]===0x47)return"png";if(bytes.length>=12&&String.fromCharCode(...bytes.slice(0,4))==="RIFF"&&String.fromCharCode(...bytes.slice(8,12))==="WEBP")return"webp";return"unknown"}
async function bytesFromBlob(blob:Blob){return new Uint8Array(await blob.arrayBuffer())}
async function getImageBytes(db:any,path:string,url:string|undefined,index:number){
 const candidates:Uint8Array[]=[];
 if(path){const d=await db.storage.from("scheduled-media").download(path);if(!d.error&&d.data)candidates.push(await bytesFromBlob(d.data))}
 if(url){try{const r=await fetch(url,{cache:"no-store"});if(r.ok)candidates.push(new Uint8Array(await r.arrayBuffer()))}catch{}}
 for(const bytes of candidates){const kind=signature(bytes);if(kind!=="unknown")return {bytes,kind}}
 throw new Error(`No se pudo leer la imagen de la página ${index+1}.`)
}
async function normalizeToJpeg(input:{bytes:Uint8Array;kind:string}){
 const sharp=(await import("sharp")).default;
 if(input.kind==="jpeg"){const meta=await sharp(Buffer.from(input.bytes)).metadata();return {bytes:input.bytes,width:meta.width||1024,height:meta.height||1280}}
 const jpg=await sharp(Buffer.from(input.bytes)).flatten({background:"#ffffff"}).jpeg({quality:94,mozjpeg:true}).toBuffer();const meta=await sharp(jpg).metadata();return {bytes:new Uint8Array(jpg),width:meta.width||1024,height:meta.height||1280}
}
export async function POST(req:Request){
 const session=await getCustomerSession();if(!session)return NextResponse.json({error:"Iniciá sesión."},{status:401});const db=supabaseAdmin();
 try{
  const b=await req.json();const title=String(b.title||"ebook").trim().slice(0,120);const paths=Array.isArray(b.storagePaths)?b.storagePaths.map(String):[];const urls=Array.isArray(b.imageUrls)?b.imageUrls.map(String):[];
  if(!paths.length||paths.length>45)return NextResponse.json({error:"El ebook debe tener entre 1 y 45 páginas generadas."},{status:400});
  if(paths.some((p:string)=>!p.startsWith(`${session.userId}/creator-ai/ebooks/`)||/\.pdf(?:$|\?)/i.test(p)))return NextResponse.json({error:"El PDF solo puede construirse a partir de páginas de imagen del ebook."},{status:400});
  const imgs:JpegPage[]=[];for(let i=0;i<paths.length;i++){const source=await getImageBytes(db,paths[i],urls[i],i);imgs.push(await normalizeToJpeg(source))}
  const pdf=pdfFromJpegs(imgs);const safe=title.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9_-]+/g,"-").replace(/^-+|-+$/g,"").toLowerCase()||"ebook";
  // El PDF final NO se guarda en Supabase. Se devuelve como archivo binario directamente al navegador.
  // Storage sigue alojando únicamente las imágenes maestras de las páginas.
  return new Response(Buffer.from(pdf),{status:200,headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${safe}.pdf"`,"Content-Length":String(pdf.byteLength),"Cache-Control":"no-store"}})
 }catch(e:any){return NextResponse.json({error:e.message||"No se pudo crear el PDF."},{status:500})}
}
