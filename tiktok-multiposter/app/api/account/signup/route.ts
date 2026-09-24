import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "../../../../lib/env";

const VYRAL_PRODUCTION_URL = "https://vyralvideos.com";

function supabaseAdmin() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");

  if (!name || !email || !password) {
    return NextResponse.redirect(new URL("/registro?error=campos", req.url), 303);
  }
  if (password.length < 8) {
    return NextResponse.redirect(new URL("/registro?error=password", req.url), 303);
  }
  if (password !== confirmPassword) {
    return NextResponse.redirect(new URL("/registro?error=coincidencia", req.url), 303);
  }

  const isOwner = email === "ayuda.importadosbaires@gmail.com";
  const admin = supabaseAdmin();
  const { data, error } = isOwner
    ? await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name, plan: "ai" }
      })
    : await admin.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${VYRAL_PRODUCTION_URL}/login?verified=1`
        }
      });

  if (error) {
    const code = encodeURIComponent(error.message.toLowerCase().includes("already") ? "existe" : "registro");
    return NextResponse.redirect(new URL(`/registro?error=${code}`, req.url), 303);
  }

  if (data.user?.email_confirmed_at) {
    return NextResponse.redirect(new URL("/login?verified=1", req.url), 303);
  }

  return NextResponse.redirect(new URL(`/registro/verificar?email=${encodeURIComponent(email)}`, req.url), 303);
}
