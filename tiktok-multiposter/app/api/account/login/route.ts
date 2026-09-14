import crypto from "crypto";
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "../../../../lib/env";
import { setAdminSession, setCustomerSession } from "../../../../lib/auth";

const ADMIN_EMAIL = "admin@vyral.app";
const ADMIN_SALT = "jtvWPG2b00KzG3b1kdbYVQ==";
const ADMIN_HASH = "RTRo7WsM6ck8J7OIUo3ECQWXu0QzMvpoJq4H1i+8X2DvuyaAAj+brrFBpQ8A84lQLYokXilg5fJmALgphflEUw==";

function supabaseAdmin() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false, autoRefreshToken: false } });
}

function validAdminPassword(password: string) {
  const actual = crypto.scryptSync(password, Buffer.from(ADMIN_SALT, "base64"), 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(ADMIN_HASH, "base64");
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");

  if (!email || !password) return NextResponse.redirect(new URL("/login?error=account", req.url), 303);

  if (email === ADMIN_EMAIL) {
    if (!validAdminPassword(password)) return NextResponse.redirect(new URL("/login?error=account", req.url), 303);
    await setAdminSession(email);
    return NextResponse.redirect(new URL("/admin", req.url), 303);
  }

  const client = supabaseAdmin();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    const message = error?.message?.toLowerCase() || "";
    const reason = message.includes("confirm") ? "unverified" : "account";
    return NextResponse.redirect(new URL(`/login?error=${reason}`, req.url), 303);
  }

  const plan = typeof data.user.user_metadata?.plan === "string" ? data.user.user_metadata.plan : undefined;
  await setCustomerSession(data.user.id, data.user.email || email, plan);
  return NextResponse.redirect(new URL(plan ? "/" : "/planes", req.url), 303);
}
