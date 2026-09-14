import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.redirect(new URL("/login", req.url), 303);
  const form = await req.formData();
  const userId = String(form.get("userId") || "");
  const action = String(form.get("action") || "reply");
  const text = String(form.get("message") || "").trim().slice(0, 2000);
  if (!userId) return NextResponse.redirect(new URL("/admin#support", req.url), 303);

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(userId);
  if (!data.user) return NextResponse.redirect(new URL("/admin#support", req.url), 303);
  const metadata = data.user.user_metadata || {};
  const messages = Array.isArray(metadata.support_messages) ? metadata.support_messages.slice(-99) : [];

  if (action === "close") {
    const archive = Array.isArray(metadata.support_archive) ? metadata.support_archive.slice(-29) : [];
    archive.push({
      id: crypto.randomUUID(),
      subject: metadata.support_subject || "Consulta de soporte",
      messages,
      closedAt: new Date().toISOString()
    });
    const next = {
      ...metadata,
      support_archive: archive,
      support_status: "new",
      support_messages: [],
      support_subject: "",
      support_last_closed_at: new Date().toISOString()
    };
    await client.auth.admin.updateUserById(userId, { user_metadata: next });
  } else if (text) {
    messages.push({ id: crypto.randomUUID(), from: "admin", text, createdAt: new Date().toISOString() });
    await client.auth.admin.updateUserById(userId, { user_metadata: { ...metadata, support_status: "answered", support_messages: messages } });
  }
  return NextResponse.redirect(new URL("/admin#support", req.url), 303);
}
