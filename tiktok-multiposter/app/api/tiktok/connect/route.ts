import { NextResponse } from "next/server";
import { socialAccountContext } from "../../../../lib/social-account-limits";
import { env } from "../../../../lib/env";
import { createOAuthState } from "../../../../lib/oauth-state";
import { setCustomerSession } from "../../../../lib/auth";

export async function GET(req: Request) {
  const ctx=await socialAccountContext();
  if (!ctx) return NextResponse.redirect(new URL("/login", req.url));
  if(ctx.total>=ctx.limit)return NextResponse.redirect(new URL("/?account_limit=1",req.url));
  await setCustomerSession(ctx.session.userId,ctx.session.email,ctx.plan);

  const appUrl = env("APP_URL").replace(/\/$/, "");
  const redirectUri = `${appUrl}/api/tiktok/callback`;
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");

  url.searchParams.set("client_key", env("TIKTOK_CLIENT_KEY"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "user.info.basic,video.publish");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", await createOAuthState({provider:"tiktok",userId:ctx.session.userId,email:ctx.session.email,plan:ctx.plan}));

  return NextResponse.redirect(url);
}
