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
  const b=await req.json(),accountId=String(b.accountId||""),containerId=String(b.containerId||""),storagePath=String(b.storagePath||"");
  if(!accountId||!containerId)return NextResponse.json({error:"Faltan datos del Reel."},{status:400});
  const db=supabaseAdmin(),q=await db.from("meta_instagram_accounts").select("instagram_user_id,username,access_token").eq("id",accountId).eq("user_id",session.userId).maybeSingle();
  if(q.error)throw new Error(q.error.message);if(!q.data)return NextResponse.json({error:"Cuenta no autorizada."},{status:403});
  const st=await graphJson(`${GRAPH}/${API_VERSION}/${containerId}?fields=status_code,status&access_token=${encodeURIComponent(q.data.access_token)}`);
  const code=String(st.status_code||"");
  if(["ERROR","EXPIRED"].includes(code))throw new Error(st.status||`Instagram: ${code}`);
  if(code!=="FINISHED"&&code!=="PUBLISHED")return NextResponse.json({ok:true,processing:true,status:code||"IN_PROGRESS"},{status:202});
  if(code==="PUBLISHED")return NextResponse.json({ok:true,published:true,containerId});
  const published=await graphJson(`${GRAPH}/${API_VERSION}/${q.data.instagram_user_id}/media_publish?creation_id=${encodeURIComponent(containerId)}&access_token=${encodeURIComponent(q.data.access_token)}`,{method:"POST"});
  if(storagePath&&storagePath.startsWith(`${session.userId}/instagram/`))await db.storage.from(BUCKET).remove([storagePath]);
  return NextResponse.json({ok:true,published:true,mediaId:String(published.id||""),containerId,username:q.data.username});
 }catch(e:any){return NextResponse.json({error:e?.message||"No se pudo finalizar el Reel."},{status:500})}
}