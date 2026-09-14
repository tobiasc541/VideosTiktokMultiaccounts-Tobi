import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const client = supabaseAdmin();
  const { data } = await client.auth.admin.listUsers({ page: 1, perPage: 200 });
  const items = (data.users || []).filter(u => u.user_metadata?.upgrade_request_status === "pending").map(u => ({
    userId: u.id,
    name: u.user_metadata?.full_name || "Usuario VYRAL",
    email: u.email || "",
    from: String(u.user_metadata?.upgrade_request_from || ""),
    to: String(u.user_metadata?.upgrade_request_to || ""),
    remainingDays: Number(u.user_metadata?.upgrade_request_remaining_days || 0),
    equivalentDays: Number(u.user_metadata?.upgrade_request_equivalent_days || 0),
    requestedAt: String(u.user_metadata?.upgrade_requested_at || ""),
    demoCycle: Boolean(u.user_metadata?.upgrade_request_demo_cycle),
    providerConnected: Boolean(u.user_metadata?.lemon_subscription_id || u.user_metadata?.provider_subscription_id)
  }));
  return NextResponse.json({ items });
}
