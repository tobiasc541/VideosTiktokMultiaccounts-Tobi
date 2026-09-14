import { NextResponse } from "next/server";
import { getAdminSession } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

function makeCode(input: string) {
  const clean = input.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^(TOBIAS|VYRAL)/, "").slice(0,8);
  return clean.length >= 4 ? clean : `VYR${Math.random().toString(36).slice(2,6).toUpperCase()}`;
}

export async function POST(req: Request) {
  if (!(await getAdminSession())) return NextResponse.redirect(new URL("/login", req.url), 303);
  const form = await req.formData();
  const userId = String(form.get("userId") || "");
  const decision = String(form.get("decision") || "");
  if (!userId || !["approve","reject"].includes(decision)) return NextResponse.redirect(new URL("/admin#creators", req.url),303);

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(userId);
  if (!data.user) return NextResponse.redirect(new URL("/admin#creators", req.url),303);
  const meta = data.user.user_metadata || {};

  if (decision === "approve") {
    const base = String(meta.creator_handle || meta.full_name || data.user.email || "creator");
    const code = String(form.get("code") || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0,12) || makeCode(base);
    await client.auth.admin.updateUserById(userId,{user_metadata:{...meta,creator_status:"approved",creator_code:code,creator_approved_at:new Date().toISOString(),creator_referrals:Number(meta.creator_referrals||0),creator_revenue:Number(meta.creator_revenue||0),creator_commission:Number(meta.creator_commission||0)}});
  } else {
    await client.auth.admin.updateUserById(userId,{user_metadata:{...meta,creator_status:"rejected",creator_rejected_at:new Date().toISOString()}});
  }
  return NextResponse.redirect(new URL("/admin#creators", req.url),303);
}
