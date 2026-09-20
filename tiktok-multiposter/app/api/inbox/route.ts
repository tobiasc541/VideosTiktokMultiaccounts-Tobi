import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

async function escalaSession() {
  const session = await getCustomerSession();
  if (!session) return null;
  const { data } = await supabaseAdmin().auth.admin.getUserById(session.userId);
  return String(data.user?.user_metadata?.plan || session.plan || "") === "escala" ? session : null;
}

export async function GET(req: NextRequest) {
  const session = await escalaSession();
  if (!session) return NextResponse.json({ error: "VYRAL Inbox es exclusivo del plan Escala" }, { status: 403 });
  const db = supabaseAdmin();
  const contact = req.nextUrl.searchParams.get("contact");
  if (contact) {
    const result = await db.from("vyral_inbox_messages").select("*").eq("user_id", session.userId).eq("contact_id", contact).order("created_at", { ascending: true }).limit(200);
    await db.from("vyral_handoffs").update({ unread: false }).eq("user_id", session.userId).eq("contact_id", contact).eq("status", "open");
    return NextResponse.json({ messages: result.data || [] });
  }
  const result = await db.from("vyral_handoffs").select("*").eq("user_id", session.userId).order("updated_at", { ascending: false }).limit(250);
  const rows = result.data || [];
  return NextResponse.json({
    handoffs: rows,
    stats: {
      total: rows.filter((x) => x.status === "open").length,
      hot: rows.filter((x) => x.status === "open" && Number(x.lead_score) >= 75).length,
      unread: rows.filter((x) => x.status === "open" && x.unread).length,
      human: rows.filter((x) => x.status === "open" && String(x.reason || "").toLowerCase().includes("persona")).length
    }
  });
}

export async function POST(req: NextRequest) {
  const session = await escalaSession();
  if (!session) return NextResponse.json({ error: "VYRAL Inbox es exclusivo del plan Escala" }, { status: 403 });
  const body = await req.json();
  const db = supabaseAdmin();

  if (body.action === "update") {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (["new", "contacted", "qualified", "won", "lost"].includes(body.stage)) patch.stage = body.stage;
    if (["normal", "high", "urgent"].includes(body.priority)) patch.priority = body.priority;
    if (typeof body.notes === "string") patch.notes = body.notes.slice(0, 4000);
    if (typeof body.assignedTo === "string") patch.assigned_to = body.assignedTo.slice(0, 120);
    if (body.status === "resolved" || body.status === "open") patch.status = body.status;
    const result = await db.from("vyral_handoffs").update(patch).eq("id", String(body.id)).eq("user_id", session.userId).select("*").single();
    return NextResponse.json({ ok: !result.error, handoff: result.data, error: result.error?.message });
  }

  const handoff = await db.from("vyral_handoffs").select("*").eq("id", String(body.handoffId)).eq("user_id", session.userId).single();
  if (handoff.error || !handoff.data) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  const account = await db.from("meta_instagram_accounts").select("instagram_user_id,access_token").eq("id", handoff.data.account_id).eq("user_id", session.userId).single();
  if (account.error || !account.data) return NextResponse.json({ error: "Cuenta no disponible" }, { status: 404 });

  const response = await fetch(`https://graph.instagram.com/${process.env.META_GRAPH_API_VERSION || "v24.0"}/${account.data.instagram_user_id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${account.data.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: handoff.data.contact_id }, message: { text: String(body.message || "").slice(0, 1800) } })
  });
  const json = await response.json();
  if (!response.ok) return NextResponse.json({ error: json.error?.message || "No se pudo enviar" }, { status: 400 });

  await db.from("vyral_inbox_messages").insert({ user_id: session.userId, account_id: handoff.data.account_id, contact_id: handoff.data.contact_id, contact_username: handoff.data.contact_username, message_id: String(json.message_id || crypto.randomUUID()), body: String(body.message || "").slice(0, 1800), direction: "out", sender_type: "human", automation_id: handoff.data.automation_id });
  await db.from("vyral_handoffs").update({ last_message: String(body.message || "").slice(0, 500), stage: handoff.data.stage === "new" ? "contacted" : handoff.data.stage, unread: false, updated_at: new Date().toISOString() }).eq("id", handoff.data.id);
  return NextResponse.json({ ok: true });
}
