import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { env } from "../../../../lib/env";
import { exchangeCode, saveAccount } from "../../../../lib/tiktok";
import { isLoggedIn } from "../../../../lib/auth";

export async function GET(req: Request) {
  if (!(await isLoggedIn())) return NextResponse.redirect(new URL("/login", req.url));

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const store = await cookies();
  const expected = store.get("tt_oauth_state")?.value;
  store.delete("tt_oauth_state");

  if (error) {
    return NextResponse.redirect(new URL(`/?oauth_error=${encodeURIComponent(error)}`, req.url));
  }

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.json({ error: "OAuth state inválido o código faltante." }, { status: 400 });
  }

  try {
    const redirectUri = `${env("APP_URL").replace(/\/$/, "")}/api/tiktok/callback`;
    const token = await exchangeCode(code, redirectUri);
    await saveAccount(token);
    return NextResponse.redirect(new URL("/", req.url));
  } catch (e: any) {
    return NextResponse.json(
      { error: e.message || "No se pudo conectar TikTok." },
      { status: 500 }
    );
  }
}
