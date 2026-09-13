import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { env } from "../../../../lib/env";
import { getCustomerSession, setCustomerSession } from "../../../../lib/auth";

const ALLOWED_PLANS = new Set(["inicio", "pro", "escala"]);

function supabaseAdmin() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url), 303);

  const form = await req.formData();
  const plan = String(form.get("plan") || "");
  if (!ALLOWED_PLANS.has(plan)) {
    return NextResponse.redirect(new URL("/planes?error=plan", req.url), 303);
  }

  const client = supabaseAdmin();
  const { data, error } = await client.auth.admin.updateUserById(session.userId, {
    user_metadata: { plan }
  });

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/planes?error=save", req.url), 303);
  }

  await setCustomerSession(session.userId, session.email, plan);
  return NextResponse.redirect(new URL("/", req.url), 303);
}
