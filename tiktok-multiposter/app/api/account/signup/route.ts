import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

const VYRAL_PRODUCTION_URL = "https://vyralvideos.com";


export async function POST(req: Request) {
  const form = await req.formData();
  const name = String(form.get("name") || "").trim();
  const email = String(form.get("email") || "").trim().toLowerCase();
  const password = String(form.get("password") || "");
  const confirmPassword = String(form.get("confirmPassword") || "");

  if (!name || !email || !password) {
    return NextResponse.redirect(new URL("/registro?error=campos", req.url), 303);
  }
  if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return NextResponse.redirect(new URL("/registro?error=password", req.url), 303);
  }
  if (password !== confirmPassword) {
    return NextResponse.redirect(new URL("/registro?error=coincidencia", req.url), 303);
  }

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.signUp({
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
