import { NextResponse } from "next/server";
import { env } from "../../../../lib/env";
import { getCustomerSession, setCustomerSession } from "../../../../lib/auth";
import { readOAuthState } from "../../../../lib/oauth-state";
import { exchangeCode, saveAccount } from "../../../../lib/tiktok";
import { assignTikTokAccountOwner } from "../../../../lib/tiktok-ownership";
import { socialAccountContext } from "../../../../lib/social-account-limits";

export async function GET(req: Request) {
  const appUrl = env("APP_URL").replace(/\/$/, "");
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  if (error) return NextResponse.redirect(`${appUrl}/?oauth_error=${encodeURIComponent(error)}`);
  const parsedState=readOAuthState(state,"tiktok");
  if (!code || !parsedState) return NextResponse.redirect(`${appUrl}/?oauth_error=state_mismatch`);

  let session = await getCustomerSession();
  if(!session || session.userId!==parsedState.userId){
    await setCustomerSession(parsedState.userId,parsedState.email,parsedState.plan);
    session=await getCustomerSession();
  }
  if (!session || session.userId!==parsedState.userId) return NextResponse.redirect(`${appUrl}/login?oauth_error=session_expired`);

  try {
    const ctx=await socialAccountContext(); if(!ctx||ctx.total>=ctx.limit)throw new Error("Límite de cuentas alcanzado para tu plan.");
    const redirectUri = `${appUrl}/api/tiktok/callback`;
    const token = await exchangeCode(code, redirectUri);
    await saveAccount(token);
    await assignTikTokAccountOwner(session.userId, token.open_id);
    return NextResponse.redirect(`${appUrl}/?connected=1`);
  } catch (e: any) {
    return NextResponse.redirect(`${appUrl}/?oauth_error=${encodeURIComponent(e.message || "No se pudo conectar TikTok.")}`);
  }
}
