import crypto from "crypto";
import { env } from "./env";
import { supabaseAdmin } from "./supabase-admin";

export const META_IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages",
  "instagram_business_manage_insights"
];

export function metaState(userId:string){
  const nonce=crypto.randomBytes(18).toString("base64url");
  const payload=Buffer.from(JSON.stringify({userId,nonce,iat:Date.now()})).toString("base64url");
  const sig=crypto.createHmac("sha256",env("APP_PASSWORD")).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}
export function readMetaState(state:string){
  const [payload,sig]=state.split(".");
  if(!payload||!sig)return null;
  const expected=crypto.createHmac("sha256",env("APP_PASSWORD")).update(payload).digest("base64url");
  if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;
  try{const v=JSON.parse(Buffer.from(payload,"base64url").toString("utf8"));if(!v.userId||Date.now()-v.iat>10*60*1000)return null;return v as {userId:string;nonce:string;iat:number};}catch{return null;}
}
export function redirectUri(){return process.env.META_INSTAGRAM_REDIRECT_URI||"https://www.libreriadelemprendedor.com/api/meta/instagram/callback";}
export async function exchangeInstagramLongLivedToken(shortToken:string){
  const u=new URL("https://graph.instagram.com/access_token");
  u.searchParams.set("grant_type","ig_exchange_token");
  u.searchParams.set("client_secret",env("META_INSTAGRAM_APP_SECRET"));
  u.searchParams.set("access_token",shortToken);
  const r=await fetch(u,{cache:"no-store"});const j=await r.json();
  if(!r.ok||!j.access_token)throw new Error(j.error?.message||j.error_message||"No se pudo extender la sesión de Instagram.");
  return {accessToken:String(j.access_token),expiresIn:Number(j.expires_in||0)};
}
export async function refreshInstagramLongLivedToken(token:string){
  const u=new URL("https://graph.instagram.com/refresh_access_token");u.searchParams.set("grant_type","ig_refresh_token");u.searchParams.set("access_token",token);
  const r=await fetch(u,{cache:"no-store"});const j=await r.json();if(!r.ok||!j.access_token)throw new Error(j.error?.message||j.error_message||"No se pudo renovar Instagram.");return {accessToken:String(j.access_token),expiresIn:Number(j.expires_in||0)};
}
export async function saveInstagramAccount(userId:string, token:string){
  const profileRes=await fetch(`https://graph.instagram.com/me?fields=id,username,name,account_type&access_token=${encodeURIComponent(token)}`,{cache:"no-store"});
  const profile=await profileRes.json(); if(!profileRes.ok||!profile.id)throw new Error(profile.error?.message||"No se pudo leer la cuenta de Instagram.");
  const db=supabaseAdmin();
  const q=await db.from("meta_instagram_accounts").upsert({user_id:userId,instagram_user_id:String(profile.id),username:profile.username||null,display_name:profile.name||null,account_type:profile.account_type||null,access_token:token,updated_at:new Date().toISOString()},{onConflict:"user_id,instagram_user_id"}).select("id,instagram_user_id,username").single();
  if(q.error)throw new Error(q.error.message); const ver=process.env.META_GRAPH_API_VERSION||"v24.0";const sub=new URL(`https://graph.instagram.com/${ver}/${profile.id}/subscribed_apps`);sub.searchParams.set("subscribed_fields","comments,messages,messaging_postbacks");sub.searchParams.set("access_token",token);const sr=await fetch(sub,{method:"POST",cache:"no-store"}),sj=await sr.json().catch(()=>({}));if(!sr.ok||sj.success!==true)throw new Error(sj.error?.message||"No se pudo activar la automatización de Instagram.");return q.data;
}