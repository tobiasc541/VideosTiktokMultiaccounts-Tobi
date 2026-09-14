import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "../../../../lib/env";

function supabaseAdmin() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const accessToken = String(form.get("accessToken") || "");
  const password = String(form.get("password") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");

  if (!accessToken || password.length < 8 || password !== confirmPassword) {
    return NextResponse.redirect(new URL("/olvide-contrasena", req.url), 303);
  }

  const client = supabaseAdmin();
  const { data, error } = await client.auth.getUser(accessToken);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/olvide-contrasena", req.url), 303);
  }

  const { error: updateError } = await client.auth.admin.updateUserById(data.user.id, { password });
  if (updateError) {
    return NextResponse.redirect(new URL("/olvide-contrasena", req.url), 303);
  }

  return NextResponse.redirect(new URL("/login?reset=1", req.url), 303);
}
