import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { PLAN_CONFIG, isPlanId } from "../../../../lib/plans";

const order = ["inicio", "pro", "escala"] as const;
const numericPrice = { inicio: 1.99, pro: 6.99, escala: 19.99 } as const;

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url), 303);

  const form = await req.formData();
  const target = String(form.get("target") || "");
  if (!isPlanId(target)) return NextResponse.redirect(new URL("/mi-plan?upgrade=invalid#upgrade", req.url), 303);

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(session.userId);
  if (!data.user) return NextResponse.redirect(new URL("/login", req.url), 303);
  const meta = data.user.user_metadata || {};
  const current = String(meta.plan || session.plan || "");
  if (!isPlanId(current) || order.indexOf(target) <= order.indexOf(current)) {
    return NextResponse.redirect(new URL("/mi-plan?upgrade=invalid#upgrade", req.url), 303);
  }

  const periodEndRaw = meta.subscription_current_period_end || meta.current_period_end || null;
  const remainingDays = periodEndRaw
    ? Math.max(1, Math.ceil((new Date(String(periodEndRaw)).getTime() - Date.now()) / 86400000))
    : 30;
  const equivalentDays = Math.max(1, Math.floor((remainingDays * numericPrice[current]) / numericPrice[target]));

  await client.auth.admin.updateUserById(session.userId, {
    user_metadata: {
      ...meta,
      upgrade_request_status: "pending",
      upgrade_request_from: current,
      upgrade_request_to: target,
      upgrade_request_remaining_days: remainingDays,
      upgrade_request_equivalent_days: equivalentDays,
      upgrade_requested_at: new Date().toISOString(),
      upgrade_request_demo_cycle: !periodEndRaw,
      account_notice: `Recibimos tu solicitud para convertir tu saldo de ${PLAN_CONFIG[current].name} a ${PLAN_CONFIG[target].name}. Te avisaremos cuando sea revisada.`
    }
  });

  return NextResponse.redirect(new URL("/mi-plan?upgrade=requested#upgrade", req.url), 303);
}
