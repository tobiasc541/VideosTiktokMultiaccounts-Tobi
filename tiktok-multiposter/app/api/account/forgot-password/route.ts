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
  const email = String(form.get("email") || "").trim().toLowerCase();

  if (!email) {
    return NextResponse.redirect(new URL("/olvide-contrasena?error=1", req.url), 303);
  }

  const client = supabaseAdmin();
  await client.auth.resetPasswordForEmail(email, {
    redirectTo: "https://vyralvideos.com/restablecer-contrasena"
  });

  // Respuesta deliberadamente genérica para no revelar si un correo está registrado.
  return NextResponse.redirect(new URL(`/olvide-contrasena?sent=1&email=${encodeURIComponent(email)}`, req.url), 303);
}
