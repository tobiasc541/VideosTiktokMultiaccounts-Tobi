import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { PLAN_CONFIG, currentUsageMonth, isPlanId } from "../../../../../lib/plans";

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(session.userId);
  if (!data.user) return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });

  const meta = data.user.user_metadata || {};
  const planId = String(meta.plan || session.plan || "");
  if (!isPlanId(planId)) return NextResponse.json({ error: "Necesitás un plan activo para publicar." }, { status: 403 });

  const periodEndRaw = meta.subscription_current_period_end || meta.current_period_end || null;
  if (periodEndRaw && new Date(periodEndRaw).getTime() <= Date.now()) {
    const next = { ...meta } as Record<string, unknown>;
    delete next.plan;
    next.subscription_status = "expired";
    await client.auth.admin.updateUserById(session.userId, { user_metadata: next });
    return NextResponse.json({ error: "Tu plan venció. Elegí un plan para seguir publicando." }, { status: 403 });
  }

  const month = currentUsageMonth();
  const used = meta.video_usage_month === month ? Number(meta.videos_used_month || 0) : 0;
  const limit = PLAN_CONFIG[planId].monthlyVideos;
  if (used >= limit) return NextResponse.json({ error: `Alcanzaste el límite mensual de ${limit} videos de tu plan.` }, { status: 429 });

  const nextUsed = used + 1;
  await client.auth.admin.updateUserById(session.userId, {
    user_metadata: { ...meta, video_usage_month: month, videos_used_month: nextUsed }
  });

  return NextResponse.json({ used: nextUsed, limit, remaining: Math.max(0, limit - nextUsed), month });
}
