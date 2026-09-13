import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "../../../../lib/env";
import { setCustomerSession } from "../../../../lib/auth";

function supabaseAdmin() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");

  if (!email || !password) {
    return NextResponse.redirect(new URL("/login?error=account", req.url), 303);
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
