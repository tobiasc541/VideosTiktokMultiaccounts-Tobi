import crypto from "crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { isLoggedIn } from "../../../../lib/auth";
import { env } from "../../../../lib/env";

function sharedCookieDomain(appUrl: string) {
  const host = new URL(appUrl).hostname;
  if (host === "localhost" || host.endsWith(".vercel.app")) return undefined;
  const parts = host.split(".");
  if (parts.length < 2) return undefined;
  return `.${parts.slice(-2).join(".")}`;
}

export async function GET(req: Request) {
  if (!(await isLoggedIn())) return NextResponse.redirect(new URL("/login", req.url));

  const appUrl = env("APP_URL").replace(/\/$/, "");
  const state = crypto.randomBytes(24).toString("hex");
  const store = await cookies();

  store.set("tt_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
    domain: sharedCookieDomain(appUrl)
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
