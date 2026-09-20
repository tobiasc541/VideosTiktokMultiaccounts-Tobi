import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

export const maxDuration=60;
const BUCKET="scheduled-media";
const ALLOWED=new Set(["video/mp4","video/quicktime"]);
export async function POST(req:Request){
 const session=await getCustomerSession();
 if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
 try{
  const form=await req.formData();
  const file=form.get("file");
  const path=String(form.get("path")||"");
  if(!(file instanceof File)||!path||!path.startsWith(`${session.userId}/instagram/`))return NextResponse.json({error:"Subida inválida."},{status:400});
  if(!ALLOWED.has(file.type)||file.size<=0||file.size>1024*1024*1024)return NextResponse.json({error:"Video inválido para Instagram."},{status:400});
  const db=supabaseAdmin();
  const bytes=new Uint8Array(await file.arrayBuffer());
  const up=await db.storage.from(BUCKET).upload(path,bytes,{contentType:file.type,upsert:true});
  if(up.error)throw new Error(up.error.message);
  return NextResponse.json({ok:true,path});
 }catch(e:any){return NextResponse.json({error:e?.message||"No se pudo guardar el video."},{status:500})}
}