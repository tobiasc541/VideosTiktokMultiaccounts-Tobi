import crypto from "crypto";
import { NextResponse } from "next/server";
import { env } from "../../../../lib/env";
import { getCustomerSession } from "../../../../lib/auth";
import { exchangeCode, saveAccount } from "../../../../lib/tiktok";
import { assignTikTokAccountOwner } from "../../../../lib/tiktok-ownership";
import { socialAccountContext } from "../../../../lib/social-account-limits";

function isValidSignedState(state: string | null) {
  if (!state) return false;
  const parts = state.split(".");
  if (parts.length !== 3) return false;
  const [issuedAt, nonce, signature] = parts;
  if (!/^\d+$/.test(issuedAt) || !/^[a-f0-9]{48}$/.test(nonce) || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const age = Math.floor(Date.now() / 1000) - Number(issuedAt);
  if (age < 0 || age > 10 * 60) return false;
  const payload = `${issuedAt}.${nonce}`;
  const expected = crypto.createHmac("sha256", env("APP_PASSWORD")).update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export async function GET(req: Request) {
  const appUrl = env("APP_URL").replace(/\/$/, "");
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  if (error) return NextResponse.redirect(`${appUrl}/?oauth_error=${encodeURIComponent(error)}`);
  if (!code || !isValidSignedState(state)) return NextResponse.redirect(`${appUrl}/?oauth_error=state_mismatch`);

  const session = await getCustomerSession();
  if (!session) return NextResponse.redirect(`${appUrl}/login?oauth_error=session_expired`);

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
