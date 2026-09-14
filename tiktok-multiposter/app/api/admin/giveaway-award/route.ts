import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { isPlanId } from "../../../../lib/plans";

export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "");
  const plan = String(body.plan || "");
  if (!userId || !isPlanId(plan)) return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(userId);
  if (!data.user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const now = new Date();
  const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const meta = data.user.user_metadata || {};
  const messages = Array.isArray(meta.support_messages) ? meta.support_messages.slice(-99) : [];
  messages.push({ id: crypto.randomUUID(), from: "admin", text: `¡Ganaste un sorteo VYRAL! Te activamos el plan ${plan} por 30 días.`, createdAt: now.toISOString() });

  await client.auth.admin.updateUserById(userId, { user_metadata: { ...meta, plan, subscription_status: "active", subscription_current_period_end: end, giveaway_awarded_at: now.toISOString(), support_subject: "Premio VYRAL", support_status: "answered", support_messages: messages } });
  return NextResponse.json({ ok: true, periodEnd: end });
}
