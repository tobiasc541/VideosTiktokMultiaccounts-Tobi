import { NextResponse } from "next/server";
import { META_IG_SCOPES, metaState, redirectUri } from "../../../../../lib/meta-instagram";
import { env } from "../../../../../lib/env";
import { socialAccountContext } from "../../../../../lib/social-account-limits";
export async function GET(){
 const ctx=await socialAccountContext(); if(!ctx)return NextResponse.json({error:"No autorizado"},{status:401}); if(ctx.total>=ctx.limit)return NextResponse.redirect(new URL("/?account_limit=1",process.env.APP_URL||"https://vyralvideos.com")); const s=ctx.session;
 const u=new URL("https://www.instagram.com/oauth/authorize");
 u.searchParams.set("client_id",env("META_INSTAGRAM_APP_ID"));u.searchParams.set("redirect_uri",redirectUri());u.searchParams.set("response_type","code");u.searchParams.set("scope",META_IG_SCOPES.join(","));u.searchParams.set("state",metaState(s.userId));
 return NextResponse.redirect(u);
}