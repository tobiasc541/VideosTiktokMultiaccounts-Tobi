import { NextResponse } from "next/server";
import { getCustomerSession, setCustomerSession } from "../../../../../lib/auth";
import { readOAuthState } from "../../../../../lib/oauth-state";
import { env } from "../../../../../lib/env";
import {
  exchangeInstagramLongLivedToken,
  redirectUri,
  saveInstagramAccount,
} from "../../../../../lib/meta-instagram";
import { socialAccountContext } from "../../../../../lib/social-account-limits";

function redirectHome(url: URL, params: Record<string, string>) {
  const target = new URL("/", url.origin);
  target.searchParams.set("section", "accounts");
  Object.entries(params).forEach(([key, value]) => target.searchParams.set(key, value));
  return NextResponse.redirect(target);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");
  let session = await getCustomerSession();
  const parsedState = await readOAuthState(state,"instagram");
  if(parsedState && (!session || session.userId!==parsedState.userId)){
    await setCustomerSession(parsedState.userId,parsedState.email,parsedState.plan);
    session = await getCustomerSession();
  }
  const ctx = session ? await socialAccountContext() : null;

  const diagnostic = async (
    stage: string,
    ok: boolean,
    details: Record<string, unknown> = {},
  ) => {
    if (!session || !ctx) return;
    const safe = { ...details } as Record<string, any>;
    delete safe.access_token;
    delete safe.token;
    await ctx.db.from("meta_oauth_diagnostics").insert({
      user_id: session.userId,
      provider: "instagram",
      stage,
      ok,
      external_account_id: safe.external_account_id ? String(safe.external_account_id) : null,
      external_username: safe.external_username ? String(safe.external_username) : null,
      error_message: safe.error_message ? String(safe.error_message) : null,
      details: safe,
    });
  };

  if (oauthError) {
    await diagnostic("oauth_return", false, { error_message: oauthError });
    return redirectHome(url, { meta_error: oauthError });
  }

  const stateMatches = Boolean(session && parsedState && parsedState.userId === session.userId);

  if (!session || !ctx || !parsedState || !stateMatches || !code) {
    await diagnostic("state_session_validation", false, {
      error_message: "oauth_invalid",
      has_session: Boolean(session),
      has_state: Boolean(parsedState),
      has_code: Boolean(code),
      state_matches: stateMatches,
    });
    return redirectHome(url, { meta_error: "oauth_invalid" });
  }

  await diagnostic("state_session_validation", true, { has_code: true });

  try {
    const form = new URLSearchParams({
      client_id: env("META_INSTAGRAM_APP_ID"),
      client_secret: env("META_INSTAGRAM_APP_SECRET"),
      grant_type: "authorization_code",
      redirect_uri: redirectUri(),
      code,
    });

    const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
      cache: "no-store",
    });
    const tokenJson = await tokenResponse.json().catch(() => ({}));

    if (!tokenResponse.ok || !tokenJson.access_token) {
      const message = String(
        tokenJson.error_message ||
          tokenJson.error?.message ||
          `Token exchange HTTP ${tokenResponse.status}`,
      );
      await diagnostic("token_exchange", false, {
        error_message: message,
        http_status: tokenResponse.status,
        error_code: tokenJson.code || tokenJson.error?.code || null,
      });
      throw new Error(message);
    }

    await diagnostic("token_exchange", true, { http_status: tokenResponse.status });

    const shortToken = String(tokenJson.access_token);
    const oauthUserId = tokenJson.user_id ? String(tokenJson.user_id) : "";

    await diagnostic("oauth_identity", Boolean(oauthUserId), {
      external_account_id: oauthUserId || null,
      error_message: oauthUserId
        ? null
        : "Instagram token response did not include user_id",
    });

    if (!oauthUserId) {
      throw new Error("Instagram no devolvió el identificador de la cuenta.");
    }

    const instagramUserId = oauthUserId;
    const oauthUsername =
      typeof tokenJson.username === "string" && tokenJson.username.trim()
        ? tokenJson.username.trim()
        : null;
    const profile = {
      id: instagramUserId,
      username: oauthUsername,
      name: null as string | null,
      account_type: null as string | null,
    };

    // The OAuth token exchange already returned the authenticated Instagram
    // account id. Persist it first instead of making profile lookup a hard
    // dependency; profile metadata can be enriched later.
    await diagnostic("oauth_identity_ready", true, {
      external_account_id: instagramUserId,
    });

    const existing = await ctx.db
      .from("meta_instagram_accounts")
      .select("id")
      .eq("user_id", session.userId)
      .eq("instagram_user_id", instagramUserId)
      .maybeSingle();

    if (existing.error) {
      await diagnostic("existing_lookup", false, {
        external_account_id: instagramUserId,
        error_message: existing.error.message,
      });
      throw new Error(existing.error.message);
    }

    if (!existing.data && ctx.total >= ctx.limit) {
      await diagnostic("plan_limit", false, {
        external_account_id: instagramUserId,
        total: ctx.total,
        limit: ctx.limit,
        error_message: "Límite de cuentas alcanzado",
      });
      throw new Error("Límite de cuentas alcanzado para tu plan.");
    }

    const persisted = await ctx.db
      .from("meta_instagram_accounts")
      .upsert(
        {
          user_id: session.userId,
          instagram_user_id: instagramUserId,
          username: profile.username,
          display_name: profile.name,
          account_type: profile.account_type,
          access_token: shortToken,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,instagram_user_id" },
      )
      .select("id")
      .single();

    if (persisted.error) {
      await diagnostic("account_persist", false, {
        external_account_id: instagramUserId,
          error_message: persisted.error.message,
        code: persisted.error.code || null,
      });
      throw new Error(persisted.error.message);
    }

    await diagnostic("account_persist", true, {
      external_account_id: instagramUserId,
      external_username: profile.username || null,
      db_id: persisted.data?.id || null,
    });

    let finalToken = shortToken;
    try {
      const longLived = await exchangeInstagramLongLivedToken(shortToken);
      finalToken = longLived.accessToken;
      const expiresAt = longLived.expiresIn > 0
        ? new Date(Date.now() + longLived.expiresIn * 1000).toISOString()
        : null;
      const tokenUpdate = await ctx.db
        .from("meta_instagram_accounts")
        .update({
          access_token: finalToken,
          token_expires_at: expiresAt,
          token_refreshed_at: new Date().toISOString(),
          token_status: "long_lived",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", session.userId)
        .eq("instagram_user_id", instagramUserId);
      if (tokenUpdate.error) throw new Error(tokenUpdate.error.message);
      await diagnostic("long_lived_token", true, {
        external_account_id: instagramUserId,
        expires_in: longLived.expiresIn,
        expires_at: expiresAt,
      });
    } catch (error: any) {
      await ctx.db
        .from("meta_instagram_accounts")
        .update({ token_status: "exchange_failed", updated_at: new Date().toISOString() })
        .eq("user_id", session.userId)
        .eq("instagram_user_id", instagramUserId);
      await diagnostic("long_lived_token", false, {
        external_account_id: instagramUserId,
        error_message: String(error?.message || error),
      });
      throw new Error("No pudimos activar una sesión duradera de Instagram. Volvé a autorizar esta cuenta.");
    }

    try {
      await saveInstagramAccount(session.userId, finalToken, instagramUserId);
      await diagnostic("webhook_setup", true, {
        external_account_id: instagramUserId,
      });
    } catch (error: any) {
      await diagnostic("webhook_setup", false, {
        external_account_id: instagramUserId,
        error_message: String(error?.message || error),
      });
    }

    return redirectHome(url, {
      meta_connected: "instagram",
      connected_username: "",
      connected_id: instagramUserId,
    });
  } catch (error: any) {
    await diagnostic("callback_failed", false, {
      error_message: String(error?.message || "oauth_failed"),
    });
    return redirectHome(url, {
      meta_error: String(error?.message || "oauth_failed"),
    });
  }
}
