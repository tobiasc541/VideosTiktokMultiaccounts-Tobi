import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCustomerSession } from "../../../../lib/auth";
import { env } from "../../../../lib/env";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Sesión inválida." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const currentPassword = String(body.currentPassword || "");
  const newPassword = String(body.newPassword || "");

  if (!currentPassword || !newPassword) {
    return NextResponse.json({ error: "Completá ambas contraseñas." }, { status: 400 });
  }
  if (newPassword.length < 8) {
    return NextResponse.json({ error: "La nueva contraseña debe tener al menos 8 caracteres." }, { status: 400 });
  }
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: "La nueva contraseña debe ser distinta de la actual." }, { status: 400 });
  }

  const admin = supabaseAdmin();
  const { data: userData, error: userError } = await admin.auth.admin.getUserById(session.userId);
  const email = userData.user?.email || session.email;
  if (userError || !email) return NextResponse.json({ error: "No pudimos validar tu cuenta." }, { status: 400 });

  const verifier = createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { error: verifyError } = await verifier.auth.signInWithPassword({ email, password: currentPassword });
  if (verifyError) return NextResponse.json({ error: "La contraseña actual no es correcta." }, { status: 400 });

  const { error: updateError } = await admin.auth.admin.updateUserById(session.userId, { password: newPassword });
  if (updateError) return NextResponse.json({ error: "No se pudo actualizar la contraseña." }, { status: 400 });

  return NextResponse.json({ ok: true });
}
