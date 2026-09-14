import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { PLAN_CONFIG, isPlanId } from "../../../../lib/plans";

async function cancelProviderSubscription(subscriptionId: string) {
  const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
  if (!apiKey || !subscriptionId) return { attempted: false, ok: false };
  const res = await fetch(`https://api.lemonsqueezy.com/v1/subscriptions/${encodeURIComponent(subscriptionId)}`, {
    method: "DELETE",
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`
    }
  });
  return { attempted: true, ok: res.ok };
}

export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.redirect(new URL("/login", req.url), 303);
  const form = await req.formData();
  const userId = String(form.get("userId") || "");
  const decision = String(form.get("decision") || "reject");
  if (!userId) return NextResponse.redirect(new URL("/admin#upgrades", req.url), 303);

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(userId);
  if (!data.user) return NextResponse.redirect(new URL("/admin#upgrades", req.url), 303);
  const meta = data.user.user_metadata || {};

  if (decision !== "approve") {
    await client.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...meta,
        upgrade_request_status: "rejected",
        upgrade_decided_at: new Date().toISOString(),
        account_notice: "Tu solicitud de conversión de saldo no fue aprobada. Tu plan actual continúa sin cambios."
      }
    });
    return NextResponse.redirect(new URL("/admin#upgrades", req.url), 303);
  }

  const target = String(meta.upgrade_request_to || "");
  if (!isPlanId(target)) return NextResponse.redirect(new URL("/admin#upgrades", req.url), 303);
  const equivalentDays = Math.max(1, Number(meta.upgrade_request_equivalent_days || 1));
  const providerSubscriptionId = String(meta.lemon_subscription_id || meta.provider_subscription_id || "");
  const providerResult = await cancelProviderSubscription(providerSubscriptionId);
  const end = new Date(Date.now() + equivalentDays * 86400000).toISOString();

  await client.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...meta,
      plan: target,
      subscription_status: "manual_upgrade",
      subscription_current_period_end: end,
      current_period_end: end,
      upgrade_request_status: "approved",
      upgrade_decided_at: new Date().toISOString(),
      upgrade_manual_until: end,
      provider_cancel_attempted: providerResult.attempted,
      provider_cancel_ok: providerResult.ok,
      account_notice: `Tu cambio a ${PLAN_CONFIG[target].name} fue aprobado. Tenés acceso hasta el ${new Date(end).toLocaleDateString("es-AR")}. Después deberás renovar tu suscripción para seguir usando VYRAL.`
    }
  });

  return NextResponse.redirect(new URL("/admin#upgrades", req.url), 303);
}
