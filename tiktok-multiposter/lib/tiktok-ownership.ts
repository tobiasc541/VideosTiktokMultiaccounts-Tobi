import { supabaseAdmin } from "./supabase-admin";

export async function assertTikTokAccountOwner(userId: string, accountId: string) {
  if (!userId || !accountId) throw new Error("Cuenta TikTok inválida.");
  const { data, error } = await supabaseAdmin()
    .from("tiktok_accounts")
    .select("id")
    .eq("id", accountId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Cuenta TikTok no encontrada o sin permiso.");
}

export async function listOwnedTikTokAccounts(userId: string) {
  const client = supabaseAdmin();
  let owned = await client
    .from("tiktok_accounts")
    .select("id, open_id, display_name, avatar_url, access_expires_at, scope, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (owned.error) throw owned.error;

  // One-time compatibility for accounts connected before VYRAL became multi-user.
  // Only a user with no owned accounts can adopt legacy rows that have no owner.
  if ((owned.data || []).length === 0) {
    const legacy = await client.from("tiktok_accounts").select("id").is("user_id", null).limit(50);
    if (legacy.error) throw legacy.error;
    const ids = (legacy.data || []).map((row) => row.id);
    if (ids.length) {
      const claim = await client.from("tiktok_accounts").update({ user_id: userId }).in("id", ids).is("user_id", null);
      if (claim.error) throw claim.error;
      owned = await client
        .from("tiktok_accounts")
        .select("id, open_id, display_name, avatar_url, access_expires_at, scope, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
      if (owned.error) throw owned.error;
    }
  }
  return owned.data ?? [];
}

export async function assignTikTokAccountOwner(userId: string, openId: string) {
  const { error } = await supabaseAdmin()
    .from("tiktok_accounts")
    .update({ user_id: userId })
    .eq("open_id", openId);
  if (error) throw error;
}

export async function deleteOwnedTikTokAccount(userId: string, accountId: string) {
  const { data, error } = await supabaseAdmin()
    .from("tiktok_accounts")
    .delete()
    .eq("id", accountId)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("Cuenta TikTok no encontrada o sin permiso.");
}
