import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/auth";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.redirect(new URL("/login", req.url), 303);
  const form = await req.formData();
  const email = String(form.get("email") || "").trim().toLowerCase();
  if (email) {
    const client = supabaseAdmin();
    await client.auth.resetPasswordForEmail(email, { redirectTo: "https://libreriadelemprendedor.com/restablecer-contrasena" });
  }
  return NextResponse.redirect(new URL("/admin#users", req.url), 303);
}
