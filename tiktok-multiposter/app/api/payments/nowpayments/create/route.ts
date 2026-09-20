import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { isPlanId, PLAN_CONFIG } from "../../../../../lib/plans";

const API = "https://api.nowpayments.io/v1";

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (!isPlanId(body?.plan)) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });

  const key = process.env.NOWPAYMENTS_API_KEY;
  if (!key) return NextResponse.json({ error: "Crypto payments not configured" }, { status: 503 });

  const prices = { inicio: 4.99, pro: 9.99, escala: 19.99 } as const;
  const origin = process.env.APP_URL || new URL(req.url).origin;
  const orderId = `vyral:${session.userId}:${body.plan}:${crypto.randomUUID()}`;

  const response = await fetch(`${API}/invoice`, {
    method: "POST",
    headers: { "x-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: prices[body.plan],
      price_currency: "usd",
      order_id: orderId,
      order_description: `VYRAL ${PLAN_CONFIG[body.plan].name} - 1 mes`,
      ipn_callback_url: `${origin}/api/payments/nowpayments/webhook`,
      success_url: `${origin}/planes?crypto=success`,
      cancel_url: `${origin}/planes?crypto=cancelled`
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data?.invoice_url) {
    console.error("NOWPayments invoice error", response.status, data);
    return NextResponse.json({ error: "No pudimos iniciar el pago cripto" }, { status: 502 });
  }
  return NextResponse.json({ url: data.invoice_url });
}
