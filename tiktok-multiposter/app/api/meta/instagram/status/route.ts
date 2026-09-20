import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

const GRAPH="https://graph.instagram.com";
const API_VERSION=process.env.META_GRAPH_API_VERSION||"v24.0";
const BUCKET="scheduled-media";
async function graphJson(url:string,init?:RequestInit){const r=await fetch(url,{...init,cache:"no-store"});const j=await r.json().catch(()=>({}));if(!r.ok||j.error)throw new Error(j.error?.message||`Instagram API HTTP ${r.status}`);return j}

export async function POST(req:Request){
 const session=await getCustomerSession();if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
 try{
  const b=await req.json(),accountId=String(b.accountId||""),containerId=String(b.containerId||""),storagePath=String(b.storagePath||""),caption=String(b.caption||"").trim(),fileName=String(b.fileName||"video.mov"),mimeType=String(b.mimeType||"video/quicktime"),fileSize=Number(b.fileSize||0),shareToFeed=b.shareToFeed!==false;
  if(!accountId||!containerId)return NextResponse.json({error:"Faltan datos del Reel."},{status:400});
  const db=supabaseAdmin();const log=async(stage:string,detail:any={},mediaId?:string)=>{await db.from("instagram_publish_events").insert({user_id:session.userId,account_id:accountId||null,container_id:containerId||null,media_id:mediaId||null,storage_path:storagePath||null,stage,detail});};await log("status_check_started");const q=await db.from("meta_instagram_accounts").select("instagram_user_id,username,access_token").eq("id",accountId).eq("user_id",session.userId).maybeSingle();
  if(q.error)throw new Error(q.error.message);if(!q.data)return NextResponse.json({error:"Cuenta no autorizada."},{status:403});
  const st=await graphJson(`${GRAPH}/${API_VERSION}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(q.data.access_token)}`);
  const code=String(st.status_code||"");await log("status_checked",{status_code:code,status:st.status||null});
  if(["ERROR","EXPIRED"].includes(code))throw new Error(st.status||`Instagram: ${code}`);
  if(code!=="FINISHED"&&code!=="PUBLISHED"){await log("still_processing",{status_code:code});return NextResponse.json({ok:true,processing:true,status:code||"IN_PROGRESS"},{status:202});}
  if(code==="PUBLISHED")return NextResponse.json({ok:true,published:true,containerId});
  const published=await graphJson(`${GRAPH}/${API_VERSION}/${q.data.instagram_user_id}/media_publish?creation_id=${encodeURIComponent(containerId)}&access_token=${encodeURIComponent(q.data.access_token)}`,{method:"POST"});
  const mediaId=String(published.id||"");await log("media_publish_success",{published},mediaId);
  await db.from("scheduled_publications").insert({user_id:session.userId,caption:caption||"Instagram Reel",scheduled_at:new Date().toISOString(),timezone:"UTC",status:"published",platforms:["instagram"],targets:[{platform:"instagram",accountId,name:q.data.username}],storage_bucket:BUCKET,storage_path:storagePath||null,mime_type:mimeType,file_name:fileName,file_size:fileSize||null,platform_results:{instagram:{mediaId,containerId,shareToFeed}},published_at:new Date().toISOString()});
  return NextResponse.json({ok:true,published:true,mediaId,containerId,username:q.data.username});
 }catch(e:any){return NextResponse.json({error:e?.message||"No se pudo finalizar el Reel."},{status:500})}
}