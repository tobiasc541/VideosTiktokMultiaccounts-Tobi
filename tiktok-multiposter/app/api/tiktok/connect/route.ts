import crypto from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isLoggedIn } from "../../../../lib/auth";
import { env } from "../../../../lib/env";

export async function GET(req: Request) {
  if (!(await isLoggedIn())) return NextResponse.redirect(new URL("/login", req.url));

  const appUrl = env("APP_URL").replace(/\/$/, "");
  const canonical = new URL(appUrl);
  const current = new URL(req.url);

  // OAuth state lives in a host cookie. If VYRAL was opened through another
  // Vercel/custom-domain alias, first move the flow to APP_URL so TikTok
  // returns to the same host that created the cookie.
  if (current.host !== canonical.host || current.protocol !== canonical.protocol) {
    return NextResponse.redirect(`${appUrl}/api/tiktok/connect`);
  }

  const state = crypto.randomBytes(24).toString("hex");
  const store = await cookies();
  store.set("tt_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60
  });

  const redirectUri = `${appUrl}/api/tiktok/callback`;
  const url = new URL("https://www.tiktok.com/v2/auth/authorize/");
  url.searchParams.set("client_key", env("TIKTOK_CLIENT_KEY"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "user.info.basic,video.publish");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("state", state);

  return NextResponse.redirect(url);
}
