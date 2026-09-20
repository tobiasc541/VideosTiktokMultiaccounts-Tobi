import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { isPlanId, PLAN_CONFIG } from "../../../../../lib/plans";

const API = "https://api.nowpayments.io/v1";

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body: unknown = await req.json().catch(() => ({}));
  const requestedPlan = typeof body === "object" && body !== null && "plan" in body
    ? String((body as { plan?: unknown }).plan ?? "")
    : "";
  if (!isPlanId(requestedPlan)) return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
  const plan = requestedPlan;
  const requestedCurrency = typeof body === "object" && body !== null && "payCurrency" in body ? String((body as { payCurrency?: unknown }).payCurrency ?? "").toLowerCase() : "";
  const allowedCurrencies = new Set(["btc","usdttrc20","usdtbsc","usdtsol","eth","sol","trx","ltc"]);
  if (requestedCurrency && !allowedCurrencies.has(requestedCurrency)) return NextResponse.json({ error: "Moneda no disponible" }, { status: 400 });

  const key = process.env.NOWPAYMENTS_API_KEY;
  if (!key) return NextResponse.json({ error: "Crypto payments not configured" }, { status: 503 });

  const prices = { inicio: 4.99, pro: 9.99, escala: 19.99 } as const;
  const origin = process.env.APP_URL || new URL(req.url).origin;
  const orderId = `vyral:${session.userId}:${plan}:${crypto.randomUUID()}`;

  const response = await fetch(`${API}/invoice`, {
    method: "POST",
    headers: { "x-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      price_amount: prices[plan],
      price_currency: "usd",
      ...(requestedCurrency ? { pay_currency: requestedCurrency } : {}),
      order_id: orderId,
      order_description: `VYRAL ${PLAN_CONFIG[plan].name} - 1 mes`,
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
