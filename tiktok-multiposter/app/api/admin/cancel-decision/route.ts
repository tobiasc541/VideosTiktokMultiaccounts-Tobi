import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.redirect(new URL("/login", req.url), 303);
  const form = await req.formData();
  const userId = String(form.get("userId") || "");
  const decision = String(form.get("decision") || "");
  if (!userId || !["approve", "reject"].includes(decision)) return NextResponse.redirect(new URL("/admin#support", req.url), 303);

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(userId);
  if (!data.user) return NextResponse.redirect(new URL("/admin#support", req.url), 303);

  const meta = data.user.user_metadata || {};
  const messages = Array.isArray(meta.support_messages) ? meta.support_messages.slice(-99) : [];
  const now = new Date();

  if (decision === "approve") {
    const periodEnd = meta.subscription_current_period_end || meta.current_period_end || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
    messages.push({ id: crypto.randomUUID(), from: "admin", text: `Tu cancelación fue aprobada. Vas a conservar acceso hasta ${new Date(periodEnd).toLocaleDateString("es-AR")}. Después de esa fecha deberás elegir un plan para seguir usando VYRAL.`, createdAt: now.toISOString() });
    await client.auth.admin.updateUserById(userId, { user_metadata: { ...meta, cancel_approved_at: now.toISOString(), subscription_status: "canceling", subscription_current_period_end: periodEnd, support_status: "answered", support_messages: messages } });
  } else {
    messages.push({ id: crypto.randomUUID(), from: "admin", text: "Revisamos tu solicitud de cancelación y no fue procesada. Respondé en soporte si necesitás que revisemos el caso nuevamente.", createdAt: now.toISOString() });
    const next = { ...meta, support_status: "answered", support_messages: messages } as Record<string, unknown>;
    delete next.cancel_requested_at;
    delete next.cancel_approved_at;
    await client.auth.admin.updateUserById(userId, { user_metadata: next });
  }

  return NextResponse.redirect(new URL("/admin#support", req.url), 303);
}
