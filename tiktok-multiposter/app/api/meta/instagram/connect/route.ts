import { NextResponse } from "next/server";
import { META_IG_SCOPES, metaState, redirectUri } from "../../../../../lib/meta-instagram";
import { env } from "../../../../../lib/env";
import { socialAccountContext } from "../../../../../lib/social-account-limits";
import { setCustomerSession } from "../../../../../lib/auth";
export async function GET(){
 const ctx=await socialAccountContext(); if(!ctx)return NextResponse.json({error:"No autorizado"},{status:401}); const s=ctx.session;
 await setCustomerSession(s.userId,s.email,ctx.plan);
 const u=new URL("https://www.instagram.com/oauth/authorize");
 u.searchParams.set("client_id",env("META_INSTAGRAM_APP_ID"));u.searchParams.set("redirect_uri",redirectUri());u.searchParams.set("response_type","code");u.searchParams.set("scope",META_IG_SCOPES.join(","));u.searchParams.set("state",metaState(s.userId));u.searchParams.set("force_reauth","true");u.searchParams.set("force_authentication","1");u.searchParams.set("enable_fb_login","false");
 return NextResponse.redirect(u);
}