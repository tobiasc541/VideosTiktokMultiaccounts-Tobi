import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

export async function GET(){
  const session=await getCustomerSession();
  if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
  const db=supabaseAdmin();
  const q=await db.from("meta_instagram_accounts")
    .select("id,instagram_user_id,username,display_name,account_type,created_at,access_token")
    .eq("user_id",session.userId).order("created_at",{ascending:true});
  if(q.error)return NextResponse.json({error:q.error.message},{status:500});
  const ver=process.env.META_GRAPH_API_VERSION||"v24.0";await Promise.all((q.data||[]).map(async(a:any)=>{try{const u=new URL(`https://graph.instagram.com/${ver}/${a.instagram_user_id}/subscribed_apps`);u.searchParams.set("subscribed_fields","comments,messages,messaging_postbacks");u.searchParams.set("access_token",a.access_token);await fetch(u,{method:"POST",cache:"no-store"})}catch{}}));const accounts=(q.data||[]).map(({access_token,...a}:any)=>a);return NextResponse.json({accounts},{headers:{"Cache-Control":"private, no-store"}});
}

export async function DELETE(req:Request){
  const session=await getCustomerSession();
  if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
  const id=new URL(req.url).searchParams.get("id");
  if(!id)return NextResponse.json({error:"Falta la cuenta."},{status:400});
  const db=supabaseAdmin();
  const q=await db.from("meta_instagram_accounts").delete().eq("id",id).eq("user_id",session.userId).select("id").maybeSingle();
  if(q.error)return NextResponse.json({error:q.error.message},{status:500});
  if(!q.data)return NextResponse.json({error:"Cuenta no encontrada."},{status:404});
  return NextResponse.json({ok:true});
}