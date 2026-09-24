import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { setAdminSession, setCustomerSession } from "../../../../lib/auth";

const OWNER_EMAIL="ayuda.importadosbaires@gmail.com";

export async function POST(req:Request){
 const form=await req.formData();
 const email=String(form.get("email")||"").trim().toLowerCase();
 const password=String(form.get("password")||"");
 if(!email||!password)return NextResponse.redirect(new URL("/login?error=account",req.url),303);

 const client=supabaseAdmin();
 const {data,error}=await client.auth.signInWithPassword({email,password});
 if(error||!data.user){
  const reason=(error?.message||"").toLowerCase().includes("confirm")?"unverified":"account";
  return NextResponse.redirect(new URL(`/login?error=${reason}`,req.url),303);
 }

 const meta=data.user.user_metadata||{};
 const plan=typeof meta.plan==="string"?meta.plan:undefined;
 const admin=email===OWNER_EMAIL&&meta.vyral_admin===true;
 if(admin){
  await setAdminSession(email);
  return NextResponse.redirect(new URL("/admin",req.url),303);
 }
 await setCustomerSession(data.user.id,data.user.email||email,plan);
 return NextResponse.redirect(new URL(plan?"/":"/planes",req.url),303);
}