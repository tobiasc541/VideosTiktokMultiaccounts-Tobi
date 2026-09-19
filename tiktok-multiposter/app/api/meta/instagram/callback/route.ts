import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { env } from "../../../../../lib/env";
import { readMetaState,redirectUri,saveInstagramAccount } from "../../../../../lib/meta-instagram";
export async function GET(req:Request){
 const url=new URL(req.url),code=url.searchParams.get("code"),state=url.searchParams.get("state"),err=url.searchParams.get("error_description")||url.searchParams.get("error");
 if(err)return NextResponse.redirect(new URL(`/?meta_error=${encodeURIComponent(err)}`,url.origin));
 const session=await getCustomerSession(),st=state?readMetaState(state):null;
 if(!session||!st||session.userId!==st.userId||!code)return NextResponse.redirect(new URL("/?meta_error=oauth_invalid",url.origin));
 try{
  const form=new URLSearchParams({client_id:env("META_INSTAGRAM_APP_ID"),client_secret:env("META_INSTAGRAM_APP_SECRET"),grant_type:"authorization_code",redirect_uri:redirectUri(),code});
  const r=await fetch("https://api.instagram.com/oauth/access_token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form,cache:"no-store"});const j=await r.json();
  if(!r.ok||!j.access_token)throw new Error(j.error_message||j.error?.message||"No se pudo obtener el token.");
  await saveInstagramAccount(session.userId,j.access_token);
  return NextResponse.redirect(new URL("/?meta_connected=instagram",url.origin));
 }catch(e:any){return NextResponse.redirect(new URL(`/?meta_error=${encodeURIComponent(e?.message||"oauth_failed")}`,url.origin));}
}