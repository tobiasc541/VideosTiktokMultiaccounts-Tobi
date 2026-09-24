import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { setAdminSession, setCustomerSession } from "../../../../lib/auth";
import crypto from "crypto";

const OWNER_EMAIL="ayuda.importadosbaires@gmail.com";

export async function POST(req:Request){
 const form=await req.formData();
 const email=String(form.get("email")||"").trim().toLowerCase();
 const password=String(form.get("password")||"");
 const captchaToken=String(form.get("captchaToken")||"");
 if(!email||!password||!captchaToken)return NextResponse.redirect(new URL("/login?error=security",req.url),303);

 const client=supabaseAdmin();
 const forwarded=req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()||"unknown";
 const rateKey=crypto.createHash("sha256").update(`${forwarded}|${email}`).digest("hex");
 const {data:allowed}=await client.rpc("consume_login_attempt",{p_key_hash:rateKey,p_limit:8,p_window_seconds:900});
 if(allowed===false)return NextResponse.redirect(new URL("/login?error=rate",req.url),303);
 const {data,error}=await client.auth.signInWithPassword({email,password,options:{captchaToken}});
 if(error||!data.user){
  const reason=(error?.message||"").toLowerCase().includes("confirm")?"unverified":"account";
  return NextResponse.redirect(new URL(`/login?error=${reason}`,req.url),303);
 }

 await client.rpc("clear_login_attempts",{p_key_hash:rateKey});
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