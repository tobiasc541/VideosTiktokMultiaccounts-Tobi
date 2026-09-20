import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { refreshInstagramLongLivedToken } from "../../../../lib/meta-instagram";

export const maxDuration = 60;

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const db = supabaseAdmin();
  const refreshBefore = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const accounts = await db
    .from("meta_instagram_accounts")
    .select("id,access_token,token_expires_at,token_status")
    .eq("token_status", "long_lived")
    .not("token_expires_at", "is", null)
    .lte("token_expires_at", refreshBefore)
    .limit(100);

  if (accounts.error) {
    return NextResponse.json({ error: accounts.error.message }, { status: 500 });
  }

  const results: Array<{ id: string; ok: boolean; error?: string }> = [];
  for (const account of accounts.data || []) {
    try {
      const refreshed = await refreshInstagramLongLivedToken(account.access_token);
      const expiresAt = refreshed.expiresIn > 0
        ? new Date(Date.now() + refreshed.expiresIn * 1000).toISOString()
        : null;
      const updated = await db
        .from("meta_instagram_accounts")
        .update({
          access_token: refreshed.accessToken,
          token_expires_at: expiresAt,
          token_refreshed_at: new Date().toISOString(),
          token_status: "long_lived",
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id);
      if (updated.error) throw new Error(updated.error.message);
      results.push({ id: account.id, ok: true });
    } catch (error: any) {
      await db.from("meta_instagram_accounts")
        .update({ token_status: "refresh_failed", updated_at: new Date().toISOString() })
        .eq("id", account.id);
      results.push({ id: account.id, ok: false, error: String(error?.message || error) });
    }
  }

  return NextResponse.json({ ok: true, refreshed: results.length, results });
}
