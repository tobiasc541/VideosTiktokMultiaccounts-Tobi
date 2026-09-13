import { env } from "./env";
import { decrypt, encrypt } from "./crypto";
import { supabaseAdmin } from "./supabase";

const API = "https://open.tiktokapis.com";

export type DbAccount = {
  id: string;
  open_id: string;
  display_name: string;
  avatar_url: string | null;
  access_token_enc: string;
  refresh_token_enc: string;
  access_expires_at: string;
  refresh_expires_at: string | null;
  scope: string | null;
};

type TokenResponse = {
  access_token: string;
  expires_in: number;
  open_id: string;
  refresh_expires_in: number;
  refresh_token: string;
  scope: string;
  token_type: string;
  error?: string;
  error_description?: string;
};

async function formPost(url: string, body: Record<string, string>) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store"
  });
  const json = await res.json();
  if (!res.ok || json.error) {
    throw new Error(json.error_description || json.error || `TikTok HTTP ${res.status}`);
  }
  return json;
}

export async function exchangeCode(code: string, redirectUri: string): Promise<TokenResponse> {
  return formPost(`${API}/v2/oauth/token/`, {
    client_key: env("TIKTOK_CLIENT_KEY"),
    client_secret: env("TIKTOK_CLIENT_SECRET"),
    code,
    grant_type: "authorization_code",
    redirect_uri: redirectUri
  }) as Promise<TokenResponse>;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  return formPost(`${API}/v2/oauth/token/`, {
    client_key: env("TIKTOK_CLIENT_KEY"),
    client_secret: env("TIKTOK_CLIENT_SECRET"),
    grant_type: "refresh_token",
    refresh_token: refreshToken
  }) as Promise<TokenResponse>;
}

export async function getBasicUser(accessToken: string) {
  const res = await fetch(`${API}/v2/user/info/?fields=open_id,display_name,avatar_url`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store"
  });
  const json = await res.json();
  if (!res.ok || json?.error?.code !== "ok") {
    throw new Error(json?.error?.message || "No se pudo obtener el perfil de TikTok.");
  }
  return json.data.user as {
    open_id: string;
    display_name: string;
    avatar_url?: string;
  };
}

export async function saveAccount(token: TokenResponse) {
  const user = await getBasicUser(token.access_token);
  const now = Date.now();
  const row = {
    open_id: token.open_id || user.open_id,
    display_name: user.display_name || "TikTok",
    avatar_url: user.avatar_url || null,
    access_token_enc: encrypt(token.access_token),
    refresh_token_enc: encrypt(token.refresh_token),
    access_expires_at: new Date(now + token.expires_in * 1000).toISOString(),
    refresh_expires_at: new Date(now + token.refresh_expires_in * 1000).toISOString(),
    scope: token.scope,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabaseAdmin
    .from("tiktok_accounts")
    .upsert(row, { onConflict: "open_id" });

  if (error) throw error;
}

export async function listAccounts() {
  const { data, error } = await supabaseAdmin
    .from("tiktok_accounts")
    .select("id, open_id, display_name, avatar_url, access_expires_at, scope, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

export async function deleteAccount(id: string) {
  const { error } = await supabaseAdmin.from("tiktok_accounts").delete().eq("id", id);
  if (error) throw error;
}

async function getDbAccount(id: string): Promise<DbAccount> {
  const { data, error } = await supabaseAdmin
    .from("tiktok_accounts")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) throw new Error("Cuenta TikTok no encontrada.");
  return data as DbAccount;
}

export async function validAccessToken(accountId: string) {
  const account = await getDbAccount(accountId);
  const expires = new Date(account.access_expires_at).getTime();

  // Renovar cinco minutos antes.
  if (expires > Date.now() + 5 * 60 * 1000) {
    return decrypt(account.access_token_enc);
  }

  const refreshed = await refreshAccessToken(decrypt(account.refresh_token_enc));
  const now = Date.now();

  const { error } = await supabaseAdmin
    .from("tiktok_accounts")
    .update({
      access_token_enc: encrypt(refreshed.access_token),
      refresh_token_enc: encrypt(refreshed.refresh_token || decrypt(account.refresh_token_enc)),
      access_expires_at: new Date(now + refreshed.expires_in * 1000).toISOString(),
      refresh_expires_at: refreshed.refresh_expires_in
        ? new Date(now + refreshed.refresh_expires_in * 1000).toISOString()
        : account.refresh_expires_at,
      scope: refreshed.scope || account.scope,
      updated_at: new Date().toISOString()
    })
    .eq("id", accountId);

  if (error) throw error;
  return refreshed.access_token;
}

export async function creatorInfo(accountId: string) {
  const token = await validAccessToken(accountId);
  const res = await fetch(`${API}/v2/post/publish/creator_info/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8"
    },
    body: "{}",
    cache: "no-store"
  });

  const json = await res.json();
  if (!res.ok || json?.error?.code !== "ok") {
    throw new Error(json?.error?.message || `TikTok HTTP ${res.status}`);
  }
  return json.data;
}

export function calculateChunks(videoSize: number) {
  const MB = 1024 * 1024;
  if (videoSize < 5 * MB) {
    return { chunkSize: videoSize, totalChunkCount: 1 };
  }
  if (videoSize <= 64 * MB) {
    return { chunkSize: videoSize, totalChunkCount: 1 };
  }

  // 32 MiB nominales, dejando el último resto dentro de los límites de TikTok.
  let chunkSize = 32 * MB;
  let totalChunkCount = Math.floor(videoSize / chunkSize);

  if (totalChunkCount < 1) totalChunkCount = 1;
  if (totalChunkCount > 1000) throw new Error("El video es demasiado grande.");

  return { chunkSize, totalChunkCount };
}

export async function initVideoPost(params: {
  accountId: string;
  caption: string;
  privacyLevel: string;
  videoSize: number;
  disableComment?: boolean;
  disableDuet?: boolean;
  disableStitch?: boolean;
}) {
  const token = await validAccessToken(params.accountId);
  const creator = await creatorInfo(params.accountId);

  if (!creator.privacy_level_options?.includes(params.privacyLevel)) {
    throw new Error("La privacidad seleccionada no está permitida para esta cuenta.");
  }
  if (params.videoSize <= 0) throw new Error("Tamaño de video inválido.");

  const { chunkSize, totalChunkCount } = calculateChunks(params.videoSize);

  const body = {
    post_info: {
      title: params.caption,
      privacy_level: params.privacyLevel,
      disable_comment: Boolean(params.disableComment),
      disable_duet: Boolean(params.disableDuet),
      disable_stitch: Boolean(params.disableStitch)
    },
    source_info: {
      source: "FILE_UPLOAD",
      video_size: params.videoSize,
      chunk_size: chunkSize,
      total_chunk_count: totalChunkCount
    }
  };

  const res = await fetch(`${API}/v2/post/publish/video/init/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8"
    },
    body: JSON.stringify(body),
    cache: "no-store"
  });

  const json = await res.json();
  if (!res.ok || json?.error?.code !== "ok") {
    throw new Error(json?.error?.message || `TikTok HTTP ${res.status}`);
  }

  return {
    publishId: json.data.publish_id as string,
    uploadUrl: json.data.upload_url as string,
    chunkSize,
    totalChunkCount
  };
}

export async function fetchPostStatus(accountId: string, publishId: string) {
  const token = await validAccessToken(accountId);
  const res = await fetch(`${API}/v2/post/publish/status/fetch/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json; charset=UTF-8"
    },
    body: JSON.stringify({ publish_id: publishId }),
    cache: "no-store"
  });
  const json = await res.json();
  if (!res.ok || json?.error?.code !== "ok") {
    throw new Error(json?.error?.message || `TikTok HTTP ${res.status}`);
  }
  return json.data;
}
