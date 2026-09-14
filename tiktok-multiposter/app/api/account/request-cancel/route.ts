import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url), 303);

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(session.userId);
  if (!data.user) return NextResponse.redirect(new URL("/mi-plan", req.url), 303);

  const metadata = data.user.user_metadata || {};
  const messages = Array.isArray(metadata.support_messages) ? metadata.support_messages.slice(-99) : [];
  const alreadyRequested = Boolean(metadata.cancel_requested_at);

  if (!alreadyRequested) {
    messages.push({
      id: crypto.randomUUID(),
      from: "user",
      text: "Solicito cancelar mi suscripción de VYRAL al finalizar el período actual.",
      createdAt: new Date().toISOString()
    });
  }

  await client.auth.admin.updateUserById(session.userId, {
    user_metadata: {
      ...metadata,
      cancel_requested_at: metadata.cancel_requested_at || new Date().toISOString(),
      support_subject: "Cancelación de suscripción",
      support_status: "open",
      support_messages: messages
    }
  });

  return NextResponse.redirect(new URL("/mi-plan?cancel=1", req.url), 303);
}
