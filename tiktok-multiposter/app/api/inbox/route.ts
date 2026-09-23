import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase-admin";

export const dynamic = "force-dynamic";

async function inboxSession() {
  const session = await getCustomerSession();
  if (!session) return null;
  const { data } = await supabaseAdmin().auth.admin.getUserById(session.userId);
  const plan = String(data.user?.user_metadata?.plan || session.plan || "").toLowerCase();
  return ["escala","ai"].includes(plan) ? session : null;
}

export async function GET(req: NextRequest) {
  const session = await inboxSession();
  if (!session) return NextResponse.json({ error: "VYRAL Inbox no está habilitado en este plan" }, { status: 403 });
  const db = supabaseAdmin();
  const contact = req.nextUrl.searchParams.get("contact");
  const automation = req.nextUrl.searchParams.get("automation");
  const analytics = req.nextUrl.searchParams.get("analytics");
  const scopedAutomation = automation ? decodeURIComponent(automation).trim() : "";
  if (analytics === "1") {
    const days = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get("days") || 30)));
    const since = new Date(Date.now() - days * 86400000).toISOString();
    let leadsQ = db.from("vyral_handoffs").select("id,stage,lead_score,reason,created_at,updated_at").eq("user_id", session.userId).gte("created_at", since); if(scopedAutomation) leadsQ=leadsQ.eq("automation_id",scopedAutomation); const leads=await leadsQ;
    let eventsQ = db.from("vyral_crm_events").select("event_type,created_at").eq("user_id", session.userId).gte("created_at", since); if(scopedAutomation) eventsQ=eventsQ.eq("automation_id",scopedAutomation); const events=await eventsQ;
    const rows = leads.data || [], ev = events.data || [];
    const count = (type:string) => ev.filter((x) => x.event_type === type).length;
    const conversations = rows.length;
    const interested = rows.filter((x) => Number(x.lead_score) >= 60 || ["qualified","won"].includes(String(x.stage))).length;
    const hot = rows.filter((x) => Number(x.lead_score) >= 75).length;
    const whatsapp = count("whatsapp");
    const goals = ev.filter((x) => ["goal_completed","sale","resource_delivered","whatsapp"].includes(String(x.event_type))).length;
    const buckets = 12, span = Math.max(1, days * 86400000 / buckets), now = Date.now();
    const series = Array.from({length:buckets},(_,i)=>{const from=now-(buckets-i)*span,to=from+span;return ev.filter((x)=>{const t=new Date(x.created_at).getTime();return t>=from&&t<to&&["goal_completed","sale","resource_delivered","whatsapp","interested"].includes(String(x.event_type))}).length});
    return NextResponse.json({days,conversations,interested,hot,whatsapp,goals,human:rows.filter((x)=>String(x.reason||"").toLowerCase().includes("persona")).length,conversion:conversations?Math.round(goals/conversations*1000)/10:0,series});
  }
  if (contact) {
    let mq = db.from("vyral_inbox_messages").select("*").eq("user_id", session.userId).eq("contact_id", contact); if(scopedAutomation) mq=mq.eq("automation_id",scopedAutomation); const result = await mq.order("created_at", { ascending: true }).limit(200);
    await db.from("vyral_handoffs").update({ unread: false }).eq("user_id", session.userId).eq("contact_id", contact).eq("status", "open");
    return NextResponse.json({ messages: result.data || [] });
  }
  let hq=db.from("vyral_handoffs").select("*").eq("user_id",session.userId); if(scopedAutomation) hq=hq.eq("automation_id",scopedAutomation); const result=await hq.order("updated_at",{ascending:false}).limit(250);
  const rows = result.data || [];
  return NextResponse.json({
    handoffs: rows,
    stats: {
      total: rows.filter((x) => x.status === "open").length,
      hot: rows.filter((x) => x.status === "open" && Number(x.lead_score) >= 75).length,
      unread: rows.filter((x) => x.status === "open" && x.unread).length,
      human: rows.filter((x) => x.status === "open" && (x.needs_human || String(x.reason || "").toLowerCase().includes("persona"))).length
    }
  });
}

export async function POST(req: NextRequest) {
  const session = await inboxSession();
  if (!session) return NextResponse.json({ error: "VYRAL Inbox no está habilitado en este plan" }, { status: 403 });
  const body = await req.json();
  const db = supabaseAdmin();

  if (body.action === "event") {
    const handoff = await db.from("vyral_handoffs").select("account_id,contact_id,automation_id").eq("id", String(body.id)).eq("user_id", session.userId).single();
    if (handoff.error || !handoff.data) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
    const allowed = ["whatsapp","interested","payment_intent","sale","goal_completed","resource_delivered"];
    if (!allowed.includes(String(body.eventType))) return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
    const inserted=await db.from("vyral_crm_events").insert({user_id:session.userId,account_id:handoff.data.account_id,contact_id:handoff.data.contact_id,event_type:String(body.eventType),source:"human",automation_id:handoff.data.automation_id});
    if(inserted.error)return NextResponse.json({error:inserted.error.message},{status:500});
    const eventPatch:Record<string,unknown>={updated_at:new Date().toISOString()};
    if(body.eventType==="interested")Object.assign(eventPatch,{stage:"qualified",lead_score:75});
    if(body.eventType==="whatsapp")Object.assign(eventPatch,{stage:"qualified",lead_score:85});
    if(body.eventType==="payment_intent")Object.assign(eventPatch,{stage:"qualified",lead_score:90,priority:"high"});
    if(body.eventType==="sale"||body.eventType==="goal_completed")Object.assign(eventPatch,{stage:"won",lead_score:100,priority:"normal"});
    const updated=await db.from("vyral_handoffs").update(eventPatch).eq("id",String(body.id)).eq("user_id",session.userId).select("*").single();
    if(updated.error)return NextResponse.json({error:updated.error.message},{status:500});
    return NextResponse.json({ok:true,handoff:updated.data,eventType:String(body.eventType)});
  }

  if (body.action === "update") {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (["new", "contacted", "qualified", "won", "lost"].includes(body.stage)) patch.stage = body.stage;
    if (["normal", "high", "urgent"].includes(body.priority)) patch.priority = body.priority;
    if (typeof body.notes === "string") patch.notes = body.notes.slice(0, 4000);
    if (typeof body.assignedTo === "string") patch.assigned_to = body.assignedTo.slice(0, 120);\n    if (typeof body.aiPaused === "boolean") patch.ai_paused = body.aiPaused;\n    if (typeof body.needsHuman === "boolean") patch.needs_human = body.needsHuman;
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
