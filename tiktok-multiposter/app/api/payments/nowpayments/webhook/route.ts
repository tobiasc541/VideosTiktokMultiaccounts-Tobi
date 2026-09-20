import crypto from "crypto";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase";

const PAID = new Set(["finished", "confirmed"]);

function verify(raw: string, signature: string | null, secret: string) {
  if (!signature) return false;
  let payload: unknown;
  try { payload = JSON.parse(raw); } catch { return false; }
  const sorted = JSON.stringify(payload, Object.keys(payload as object).sort());
  const digest = crypto.createHmac("sha512", secret).update(sorted).digest("hex");
  return signature.length === digest.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(req: Request) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const raw = await req.text();
  if (!verify(raw, req.headers.get("x-nowpayments-sig"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(raw);
  if (!PAID.has(String(event.payment_status || "").toLowerCase())) return NextResponse.json({ ok: true });

  const parts = String(event.order_id || "").split(":");
  if (parts.length < 4 || parts[0] !== "vyral") return NextResponse.json({ ok: true });
  const [, userId, plan] = parts;
  if (!["inicio", "pro", "escala"].includes(plan)) return NextResponse.json({ ok: true });

  const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
  const user = data?.user;
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const now = new Date();
  const base = user.user_metadata?.subscription_current_period_end && new Date(user.user_metadata.subscription_current_period_end) > now
    ? new Date(user.user_metadata.subscription_current_period_end) : now;
  base.setUTCMonth(base.getUTCMonth() + 1);

  const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    user_metadata: {
      ...user.user_metadata,
      plan,
      subscription_status: "active",
      subscription_provider: "nowpayments",
      subscription_current_period_end: base.toISOString(),
      current_period_end: base.toISOString(),
      nowpayments_payment_id: String(event.payment_id || "")
    }
  });
  if (error) return NextResponse.json({ error: "Activation failed" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
