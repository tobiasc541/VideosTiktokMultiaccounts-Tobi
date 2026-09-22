import crypto from "crypto";
import { env } from "./env";
import { supabaseAdmin } from "./supabase-admin";

export const META_IG_SCOPES = [
  "instagram_business_basic",
  "instagram_business_content_publish",
  "instagram_business_manage_comments",
  "instagram_business_manage_messages",
  "instagram_business_manage_insights",
];

export function metaState(userId: string) {
  const nonce = crypto.randomBytes(18).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ userId, nonce, iat: Date.now() })).toString("base64url");
  const sig = crypto.createHmac("sha256", env("APP_PASSWORD")).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function readMetaState(state: string) {
  const [payload, sig] = state.split(".");
  if (!payload || !sig) return null;
  const expected = crypto.createHmac("sha256", env("APP_PASSWORD")).update(payload).digest("base64url");
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!value.userId || Date.now() - value.iat > 10 * 60 * 1000) return null;
    return value as { userId: string; nonce: string; iat: number };
  } catch {
    return null;
  }
}

export function redirectUri() {
  return process.env.META_INSTAGRAM_REDIRECT_URI || "https://vyralvideos.com/api/meta/instagram/callback";
}

async function graphJson(url: URL, init?: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const json = await response.json().catch(() => ({}));
  return { response, json };
}

export async function exchangeInstagramLongLivedToken(shortToken: string) {
  const url = new URL("https://graph.instagram.com/access_token");
  url.searchParams.set("grant_type", "ig_exchange_token");
  url.searchParams.set("client_secret", env("META_INSTAGRAM_APP_SECRET"));
  url.searchParams.set("access_token", shortToken);
  const { response, json } = await graphJson(url);
  if (!response.ok || !json.access_token) {
    throw new Error(json.error?.message || json.error_message || "No se pudo extender la sesión de Instagram.");
  }
  return { accessToken: String(json.access_token), expiresIn: Number(json.expires_in || 0) };
}

export async function refreshInstagramLongLivedToken(token: string) {
  const url = new URL("https://graph.instagram.com/refresh_access_token");
  url.searchParams.set("grant_type", "ig_refresh_token");
  url.searchParams.set("access_token", token);
  const { response, json } = await graphJson(url);
  if (!response.ok || !json.access_token) {
    throw new Error(json.error?.message || json.error_message || "No se pudo renovar Instagram.");
  }
  return { accessToken: String(json.access_token), expiresIn: Number(json.expires_in || 0) };
}

export async function saveInstagramAccount(
  userId: string,
  token: string,
  knownInstagramUserId?: string,
) {
  const db = supabaseAdmin();
  let instagramUserId = knownInstagramUserId || "";
  let username: string | null = null;
  let displayName: string | null = null;
  let accountType: string | null = null;
  let webhookUserId: string | null = null;

  // Always enrich the connected account from Instagram. OAuth gives us the
  // account id, but the token exchange does not reliably include username/name.
  // instagram_business_basic grants the profile fields used by the UI.
  const profileUrl = new URL("https://graph.instagram.com/me");
  profileUrl.searchParams.set("fields", "id,user_id,username,name,account_type");
  profileUrl.searchParams.set("access_token", token);
  const { response: profileResponse, json: profileJson } = await graphJson(profileUrl);
  if (profileResponse.ok && profileJson.id) {
    instagramUserId = String(profileJson.id);
    username = typeof profileJson.username === "string" && profileJson.username.trim() ? profileJson.username.trim() : null;
    displayName = typeof profileJson.name === "string" && profileJson.name.trim() ? profileJson.name.trim() : null;
    accountType = typeof profileJson.account_type === "string" && profileJson.account_type.trim() ? profileJson.account_type.trim() : null;
    webhookUserId = profileJson.user_id != null ? String(profileJson.user_id) : null;
  } else if (!instagramUserId) {
    throw new Error(profileJson.error?.message || "Instagram no devolvió el identificador de la cuenta.");
  }

  const saved = await db
    .from("meta_instagram_accounts")
    .upsert(
      {
        user_id: userId,
        instagram_user_id: instagramUserId,
        username,
        display_name: displayName,
        account_type: accountType,
        webhook_user_id: webhookUserId,
        access_token: token,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,instagram_user_id" },
    )
    .select("id,instagram_user_id,username")
    .single();

  if (saved.error) throw new Error(saved.error.message);

  const required = ["comments", "messages", "messaging_postbacks"];
  const subscriptionUrl = new URL(
    `https://graph.instagram.com/${instagramUserId}/subscribed_apps`,
  );
  subscriptionUrl.searchParams.set("subscribed_fields", required.join(","));
  subscriptionUrl.searchParams.set("access_token", token);
  const { response: subscriptionResponse, json: subscriptionJson } = await graphJson(
    subscriptionUrl,
    { method: "POST" },
  );
  if (!subscriptionResponse.ok || subscriptionJson.success !== true) {
    throw new Error(
      subscriptionJson.error?.message || "No se pudo activar la automatización de Instagram.",
    );
  }

  return saved.data;
}
