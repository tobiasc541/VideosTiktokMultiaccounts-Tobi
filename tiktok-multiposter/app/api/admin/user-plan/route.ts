import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../../lib/auth";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

const allowed = new Set(["", "inicio", "pro", "escala"]);

export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.redirect(new URL("/login", req.url), 303);
  const form = await req.formData();
  const userId = String(form.get("userId") || "");
  const plan = String(form.get("plan") || "");
  if (!userId || !allowed.has(plan)) return NextResponse.redirect(new URL("/admin#users", req.url), 303);

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(userId);
  if (data.user) {
    const metadata = data.user.user_metadata || {};
    const next = { ...metadata } as Record<string, unknown>;
    if (plan) next.plan = plan; else delete next.plan;
    await client.auth.admin.updateUserById(userId, { user_metadata: next });
  }
  return NextResponse.redirect(new URL("/admin#users", req.url), 303);
}
