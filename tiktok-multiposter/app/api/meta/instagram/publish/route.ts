import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

export const maxDuration=60;
const BUCKET="scheduled-media";
const GRAPH="https://graph.instagram.com";
const API_VERSION=process.env.META_GRAPH_API_VERSION||"v24.0";
const ALLOWED=new Set(["video/mp4","video/quicktime"]);

async function graphJson(url:string,init?:RequestInit){
 const r=await fetch(url,{...init,cache:"no-store"});
 const j=await r.json().catch(()=>({}));
 if(!r.ok||j.error)throw new Error(j.error?.message||j.error_message||`Instagram API HTTP ${r.status}`);
 return j;
}
export async function POST(req:Request){
 const session=await getCustomerSession();
 if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
 let storagePath="";
 try{
  const body=await req.json(),accountId=String(body.accountId||""),caption=String(body.caption||"").trim();
  const fileName=String(body.fileName||"video.mp4"),mimeType=String(body.mimeType||"video/mp4"),fileSize=Number(body.fileSize||0);
  if(!accountId||!caption||!ALLOWED.has(mimeType)||!fileSize)return NextResponse.json({error:"Faltan datos válidos para publicar el Reel."},{status:400});
  if(fileSize>1024*1024*1024)return NextResponse.json({error:"Instagram admite hasta 1 GB para este flujo."},{status:400});
  const db=supabaseAdmin();
  const q=await db.from("meta_instagram_accounts").select("id,instagram_user_id,username,access_token").eq("id",accountId).eq("user_id",session.userId).maybeSingle();
  if(q.error)throw new Error(q.error.message); if(!q.data)return NextResponse.json({error:"La cuenta de Instagram no pertenece a tu usuario."},{status:403});
  storagePath=`${session.userId}/instagram/${crypto.randomUUID()}/${fileName.replace(/[^a-zA-Z0-9._-]/g,"_")}`;
  const prep=await db.storage.from(BUCKET).createSignedUploadUrl(storagePath);
  if(prep.error||!prep.data)throw new Error(prep.error?.message||"No se pudo preparar el video.");
  return NextResponse.json({ok:true,action:"upload",bucket:BUCKET,path:storagePath,token:prep.data.token,signedUrl:prep.data.signedUrl});
 }catch(e:any){return NextResponse.json({error:e?.message||"No se pudo preparar Instagram."},{status:500})}
}

export async function PUT(req:Request){
 const session=await getCustomerSession(); if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
 let path="";
 try{
  const body=await req.json(),accountId=String(body.accountId||""),caption=String(body.caption||"").trim(),shareToFeed=body.shareToFeed!==false; path=String(body.storagePath||"");
  if(!accountId||!caption||!path||!path.startsWith(`${session.userId}/instagram/`))return NextResponse.json({error:"Solicitud inválida."},{status:400});
  const db=supabaseAdmin();
  const q=await db.from("meta_instagram_accounts").select("instagram_user_id,username,access_token").eq("id",accountId).eq("user_id",session.userId).maybeSingle();
  if(q.error)throw new Error(q.error.message); if(!q.data)return NextResponse.json({error:"Cuenta no autorizada."},{status:403});
  const parent=path.split("/").slice(0,-1).join("/"),leaf=path.split("/").pop()||"";const exists=await db.storage.from(BUCKET).list(parent,{search:leaf,limit:10});if(exists.error)throw new Error(`No se pudo verificar el video: ${exists.error.message}`);if(!(exists.data||[]).some(x=>x.name===leaf))return NextResponse.json({error:"El video no llegó al almacenamiento de VYRAL. Volvé a intentar la subida."},{status:409});
  const signed=await db.storage.from(BUCKET).createSignedUrl(path,3600);
  if(signed.error||!signed.data?.signedUrl)throw new Error(signed.error?.message||"No se pudo exponer temporalmente el video.");
  const params=new URLSearchParams({media_type:"REELS",video_url:signed.data.signedUrl,caption,share_to_feed:shareToFeed?"true":"false",access_token:q.data.access_token});
  const created=await graphJson(`${GRAPH}/${API_VERSION}/${q.data.instagram_user_id}/media?${params}`,{method:"POST"});
  const containerId=String(created.id||""); if(!containerId)throw new Error("Instagram no devolvió el contenedor del Reel.");
  let finished=false,last="";
  for(let i=0;i<3;i++){await new Promise(r=>setTimeout(r,1200));const st=await graphJson(`${GRAPH}/${API_VERSION}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(q.data.access_token)}`);last=String(st.status_code||"");if(last==="FINISHED"){finished=true;break}if(["ERROR","EXPIRED"].includes(last))throw new Error(st.status||`Instagram: ${last}`)}
  if(!finished)return NextResponse.json({ok:true,processing:true,containerId,username:q.data.username,message:"Instagram sigue procesando el Reel."},{status:202});
  const published=await graphJson(`${GRAPH}/${API_VERSION}/${q.data.instagram_user_id}/media_publish?creation_id=${encodeURIComponent(containerId)}&access_token=${encodeURIComponent(q.data.access_token)}`,{method:"POST"});
  await db.storage.from(BUCKET).remove([path]);
  return NextResponse.json({ok:true,mediaId:String(published.id||""),containerId,username:q.data.username});
 }catch(e:any){return NextResponse.json({error:e?.message||"No se pudo publicar en Instagram."},{status:500})}
}
