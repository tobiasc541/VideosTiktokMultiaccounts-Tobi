import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

export async function GET(){
  const session=await getCustomerSession();
  if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
  const db=supabaseAdmin();
  const q=await db.from("meta_instagram_accounts")
    .select("id,instagram_user_id,username,display_name,account_type,created_at")
    .eq("user_id",session.userId).order("created_at",{ascending:true});
  if(q.error)return NextResponse.json({error:q.error.message},{status:500});
  return NextResponse.json({accounts:q.data||[]},{headers:{"Cache-Control":"private, no-store"}});
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