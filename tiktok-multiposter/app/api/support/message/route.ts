import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url), 303);

  const form = await req.formData();
  const subject = String(form.get("subject") || "").trim().slice(0, 100);
  const text = String(form.get("message") || "").trim().slice(0, 2000);
  if (!subject || !text) return NextResponse.redirect(new URL("/soporte", req.url), 303);

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(session.userId);
  if (!data.user) return NextResponse.redirect(new URL("/soporte", req.url), 303);

  const metadata = data.user.user_metadata || {};
  const messages = Array.isArray(metadata.support_messages) ? metadata.support_messages.slice(-99) : [];
  messages.push({ id: crypto.randomUUID(), from: "user", text, createdAt: new Date().toISOString() });

  await client.auth.admin.updateUserById(session.userId, {
    user_metadata: { ...metadata, support_subject: subject, support_status: "open", support_messages: messages }
  });

  return NextResponse.redirect(new URL("/soporte", req.url), 303);
}
