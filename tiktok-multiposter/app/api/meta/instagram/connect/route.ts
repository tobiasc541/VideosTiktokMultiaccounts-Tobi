import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { META_IG_SCOPES, metaState, redirectUri } from "../../../../../lib/meta-instagram";
import { env } from "../../../../../lib/env";
export async function GET(){
 const s=await getCustomerSession(); if(!s)return NextResponse.json({error:"No autorizado"},{status:401});
 const u=new URL("https://www.instagram.com/oauth/authorize");
 u.searchParams.set("client_id",env("META_INSTAGRAM_APP_ID"));u.searchParams.set("redirect_uri",redirectUri());u.searchParams.set("response_type","code");u.searchParams.set("scope",META_IG_SCOPES.join(","));u.searchParams.set("state",metaState(s.userId));
 return NextResponse.redirect(u);
}