import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { env } from "../../../../../lib/env";
import {
  exchangeInstagramLongLivedToken,
  readMetaState,
  redirectUri,
  saveInstagramAccount,
} from "../../../../../lib/meta-instagram";
import { socialAccountContext } from "../../../../../lib/social-account-limits";

function home(url: URL, params: Record<string, string>) {
  const target = new URL("/", url.origin);
  for (const [key, value] of Object.entries(params)) {
    target.searchParams.set(key, value);
  }
  target.searchParams.set("section", "accounts");
  return NextResponse.redirect(target);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError =
    url.searchParams.get("error_description") || url.searchParams.get("error");

  if (oauthError) {
    return home(url, { meta_error: oauthError });
  }

  const session = await getCustomerSession();
  const st = state ? readMetaState(state) : null;

  if (!session || !st || session.userId !== st.userId || !code) {
    return home(url, { meta_error: "oauth_invalid" });
  }

  try {
    const ctx = await socialAccountContext();
    if (!ctx) throw new Error("Sesión de VYRAL no válida.");

    const form = new URLSearchParams({
      client_id: env("META_INSTAGRAM_APP_ID"),
      client_secret: env("META_INSTAGRAM_APP_SECRET"),
      grant_type: "authorization_code",
      redirect_uri: redirectUri(),
      code,
    });

    const response = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      cache: "no-store",
    });
    const token = await response.json();

    if (!response.ok || !token.access_token) {
      throw new Error(
        token.error_message ||
          token.error?.message ||
          "Instagram no entregó el token de acceso.",
      );
    }

    const shortToken = String(token.access_token);
    const profileUrl = new URL("https://graph.instagram.com/me");
    profileUrl.searchParams.set("fields", "id,username,name,account_type");
    profileUrl.searchParams.set("access_token", shortToken);

    const profileResponse = await fetch(profileUrl, { cache: "no-store" });
    const profile = await profileResponse.json();

    if (!profileResponse.ok || !profile.id) {
      throw new Error(
        profile.error?.message || "Instagram no devolvió los datos de la cuenta.",
      );
    }

    const instagramUserId = String(profile.id);
    const existing = await ctx.db
      .from("meta_instagram_accounts")
      .select("id")
      .eq("user_id", session.userId)
      .eq("instagram_user_id", instagramUserId)
      .maybeSingle();

    if (existing.error) throw new Error(existing.error.message);
    if (!existing.data && ctx.total >= ctx.limit) {
      throw new Error("Límite de cuentas alcanzado para tu plan.");
    }

    let accessToken = shortToken;
    try {
      const longLived = await exchangeInstagramLongLivedToken(shortToken);
      accessToken = longLived.accessToken;
    } catch (upgradeError) {
      console.error(
        "Instagram long-lived token upgrade failed; keeping authorized token",
        upgradeError,
      );
    }

    let subscriptionWarning = "";
    try {
      await saveInstagramAccount(session.userId, accessToken);
    } catch (saveError: any) {
      const persisted = await ctx.db
        .from("meta_instagram_accounts")
        .select("id")
        .eq("user_id", session.userId)
        .eq("instagram_user_id", instagramUserId)
        .maybeSingle();

      if (persisted.error || !persisted.data) throw saveError;
      subscriptionWarning = String(saveError?.message || "Webhook pendiente");
    }

    return home(url, {
      meta_connected: "instagram",
      connected_username: String(profile.username || ""),
      connected_id: instagramUserId,
      ...(subscriptionWarning
        ? { meta_warning: subscriptionWarning }
        : {}),
    });
  } catch (error: any) {
    return home(url, {
      meta_error: error?.message || "oauth_failed",
    });
  }
}
