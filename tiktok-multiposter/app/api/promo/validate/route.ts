import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const body = await req.json().catch(()=>({}));
  const code = String(body.code || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!code) return NextResponse.json({ valid:false });
  const client = supabaseAdmin();
  const { data } = await client.auth.admin.listUsers({ page:1, perPage:200 });
  const owner = (data.users || []).find(u => u.user_metadata?.creator_status === "approved" && String(u.user_metadata?.creator_code || "").toUpperCase() === code);
  if (!owner) return NextResponse.json({ valid:false });
  return NextResponse.json({ valid:true, code, discount:50, creatorId:owner.id, creatorName:owner.user_metadata?.creator_handle || owner.user_metadata?.full_name || "Creator VYRAL" });
}
