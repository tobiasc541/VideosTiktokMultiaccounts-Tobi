import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url), 303);
  const form = await req.formData();
  const handle = String(form.get("handle") || "").trim().slice(0,60);
  const platform = String(form.get("platform") || "other").slice(0,30);
  const note = String(form.get("note") || "").trim().slice(0,500);

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(session.userId);
  if (!data.user) return NextResponse.redirect(new URL("/creadores", req.url), 303);
  const meta = data.user.user_metadata || {};

  await client.auth.admin.updateUserById(session.userId, {
    user_metadata: {
      ...meta,
      creator_status: "pending",
      creator_handle: handle || meta.full_name || data.user.email || "creator",
      creator_platform: platform,
      creator_note: note,
      creator_requested_at: new Date().toISOString()
    }
  });

  return NextResponse.redirect(new URL("/creadores?sent=1", req.url), 303);
}
