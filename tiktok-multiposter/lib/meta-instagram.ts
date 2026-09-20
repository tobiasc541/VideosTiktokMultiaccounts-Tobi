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

export async function saveInstagramAccount(userId: string, token: string) {
  const profileUrl = new URL("https://graph.instagram.com/me");
  profileUrl.searchParams.set("fields", "id,username,name,account_type");
  profileUrl.searchParams.set("access_token", token);

  const { response: profileResponse, json: profile } = await graphJson(profileUrl);
  if (!profileResponse.ok || !profile.id) {
    throw new Error(profile.error?.message || "No se pudo leer la cuenta de Instagram.");
  }

  const db = supabaseAdmin();
  const saved = await db
    .from("meta_instagram_accounts")
    .upsert(
      {
        user_id: userId,
        instagram_user_id: String(profile.id),
        username: profile.username || null,
        display_name: profile.name || null,
        account_type: profile.account_type || null,
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
    `https://graph.instagram.com/${profile.id}/subscribed_apps`,
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

  const verifyUrl = new URL(
    `https://graph.instagram.com/${version}/${profile.id}/subscribed_apps`,
  );
  verifyUrl.searchParams.set("access_token", token);
  const { response: verifyResponse, json: verifyJson } = await graphJson(verifyUrl);
  if (!verifyResponse.ok || verifyJson.error) {
    throw new Error(
      verifyJson.error?.message || "No se pudo verificar la automatización de Instagram.",
    );
  }

  const subscribed = Array.from(
    new Set(
      (Array.isArray(verifyJson.data) ? verifyJson.data : []).flatMap((item: any) =>
        Array.isArray(item?.subscribed_fields) ? item.subscribed_fields.map(String) : [],
      ),
    ),
  ) as string[];
  const missing = required.filter((field) => !subscribed.includes(field));
  if (missing.length) {
    throw new Error(`Instagram no confirmó estas suscripciones: ${missing.join(", ")}`);
  }

  return saved.data;
}
