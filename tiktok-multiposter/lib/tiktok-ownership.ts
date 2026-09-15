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
  const { data, error } = await supabaseAdmin()
    .from("tiktok_accounts")
    .select("id, open_id, display_name, avatar_url, access_expires_at, scope, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
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
