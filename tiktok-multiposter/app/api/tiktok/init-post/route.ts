import crypto from "crypto";
import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { PLAN_CONFIG, currentUsageMonth, isPlanId } from "../../../../lib/plans";
import { initVideoPost } from "../../../../lib/tiktok";

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const body = await req.json();
    if (!body.accountId || !body.caption || !body.privacyLevel || !body.videoSize) {
      return NextResponse.json({ error: "Faltan datos de publicación." }, { status: 400 });
    }

    const client = supabaseAdmin();
    const { data } = await client.auth.admin.getUserById(session.userId);
    if (!data.user) return NextResponse.json({ error: "Usuario no encontrado." }, { status: 404 });

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
    const fingerprint = crypto.createHash("sha256").update(`${String(body.caption)}|${Number(body.videoSize)}`).digest("hex");
    const lastAt = meta.last_video_credit_at ? new Date(meta.last_video_credit_at).getTime() : 0;
    const sameBatch = meta.last_video_credit_fingerprint === fingerprint && Date.now() - lastAt < 15 * 60 * 1000;

    if (!sameBatch) {
      if (used >= limit) return NextResponse.json({ error: `Alcanzaste el límite mensual de ${limit} videos de tu plan.` }, { status: 429 });
      await client.auth.admin.updateUserById(session.userId, {
        user_metadata: {
          ...meta,
          video_usage_month: month,
          videos_used_month: used + 1,
          last_video_credit_fingerprint: fingerprint,
          last_video_credit_at: new Date().toISOString()
        }
      });
    }

    const result = await initVideoPost({
      accountId: body.accountId,
      caption: String(body.caption),
      privacyLevel: String(body.privacyLevel),
      videoSize: Number(body.videoSize)
    });

    return NextResponse.json({ ...result, credits: { used: sameBatch ? used : used + 1, limit, remaining: Math.max(0, limit - (sameBatch ? used : used + 1)) } });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error TikTok" }, { status: 500 });
  }
}
