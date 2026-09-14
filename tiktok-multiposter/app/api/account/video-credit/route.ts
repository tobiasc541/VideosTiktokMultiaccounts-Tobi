import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { PLAN_CONFIG, currentUsageMonth, isPlanId } from "../../../../lib/plans";

async function readState() {
  const session = await getCustomerSession();
  if (!session) return { error: "No autorizado", status: 401 } as const;

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(session.userId);
  if (!data.user) return { error: "Usuario no encontrado", status: 404 } as const;

  const meta = data.user.user_metadata || {};
  const planId = String(meta.plan || session.plan || "");
  if (!isPlanId(planId)) return { error: "Necesitás un plan activo para publicar.", status: 403 } as const;

  const periodEndRaw = meta.subscription_current_period_end || meta.current_period_end || null;
  if (periodEndRaw && new Date(periodEndRaw).getTime() <= Date.now()) {
    const next = { ...meta } as Record<string, unknown>;
    delete next.plan;
    next.subscription_status = "expired";
    await client.auth.admin.updateUserById(session.userId, { user_metadata: next });
    return { error: "Tu plan venció. Elegí un plan para seguir publicando.", status: 403 } as const;
  }

  const month = currentUsageMonth();
  const used = meta.video_usage_month === month ? Number(meta.videos_used_month || 0) : 0;
  const limit = PLAN_CONFIG[planId].monthlyVideos;
  return { session, client, meta, planId, month, used, limit };
}

export async function GET() {
  const state = await readState();
  if ("error" in state) return NextResponse.json({ error: state.error }, { status: state.status });
  return NextResponse.json({ plan: state.planId, used: state.used, limit: state.limit, remaining: Math.max(0, state.limit - state.used), month: state.month });
}

export async function POST() {
  const state = await readState();
  if ("error" in state) return NextResponse.json({ error: state.error }, { status: state.status });
  if (state.used >= state.limit) return NextResponse.json({ error: `Alcanzaste el límite mensual de ${state.limit} videos de tu plan.` }, { status: 429 });

  const nextUsed = state.used + 1;
  await state.client.auth.admin.updateUserById(state.session.userId, {
    user_metadata: { ...state.meta, video_usage_month: state.month, videos_used_month: nextUsed }
  });

  return NextResponse.json({ plan: state.planId, used: nextUsed, limit: state.limit, remaining: Math.max(0, state.limit - nextUsed), month: state.month });
}
