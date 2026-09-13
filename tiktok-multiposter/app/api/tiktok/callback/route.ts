import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "../../../../lib/env";
import { exchangeCode, saveAccount } from "../../../../lib/tiktok";

export async function GET(req: Request) {
  const appUrl = env("APP_URL").replace(/\/$/, "");
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const store = await cookies();
  const expected = store.get("tt_oauth_state")?.value;
  store.delete("tt_oauth_state");

  if (error) {
    return NextResponse.redirect(`${appUrl}/?oauth_error=${encodeURIComponent(error)}`);
  }

  // The signed state cookie is the CSRF/session continuity check for this flow.
  // It is shared between root/www so the callback remains valid even when the
  // production domain redirects between those two hosts.
  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(`${appUrl}/?oauth_error=state_mismatch`);
  }

  try {
    const redirectUri = `${appUrl}/api/tiktok/callback`;
    const token = await exchangeCode(code, redirectUri);
    await saveAccount(token);
    return NextResponse.redirect(`${appUrl}/?connected=1`);
  } catch (e: any) {
    return NextResponse.redirect(
      `${appUrl}/?oauth_error=${encodeURIComponent(e.message || "No se pudo conectar TikTok.")}`
    );
  }
}
