import crypto from "crypto";
import { NextResponse } from "next/server";
import { socialAccountContext } from "../../../../lib/social-account-limits";
import { env } from "../../../../lib/env";

function makeSignedState() {
  const issuedAt = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(24).toString("hex");
  const payload = `${issuedAt}.${nonce}`;
  const signature = crypto
    .createHmac("sha256", env("APP_PASSWORD"))
    .update(payload)
    .digest("hex");
  return `${payload}.${signature}`;
}

export async function GET(req: Request) {
  const ctx=await socialAccountContext();
  if (!ctx) return NextResponse.redirect(new URL("/login", req.url));
  if(ctx.total>=ctx.limit)return NextResponse.redirect(new URL("/?account_limit=1",req.url));

  const appUrl = env("APP_URL").replace(/\/$/, "");
  const redirectUri = `${appUrl}/api/tiktok/callback`;
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");

  url.searchParams.set("client_key", env("TIKTOK_CLIENT_KEY"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "user.info.basic,video.publish");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", makeSignedState());

  return NextResponse.redirect(url);
}
