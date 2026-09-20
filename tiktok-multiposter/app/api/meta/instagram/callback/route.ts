import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { env } from "../../../../../lib/env";
import { readMetaState, redirectUri, saveInstagramAccount, exchangeInstagramLongLivedToken } from "../../../../../lib/meta-instagram";
import { socialAccountContext } from "../../../../../lib/social-account-limits";

function home(url: URL, params: Record<string,string>) {
  const target = new URL("/", url.origin);
  for (const [key,value] of Object.entries(params)) target.searchParams.set(key,value);
  target.searchParams.set("section","accounts");
  return NextResponse.redirect(target);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");

  if (oauthError) return home(url,{ meta_error: oauthError });

  const session = await getCustomerSession();
  const st = state ? readMetaState(state) : null;
  if (!session || !st || session.userId !== st.userId || !code) {
    return home(url,{ meta_error:"oauth_invalid" });
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
      throw new Error(token.error_message || token.error?.message || "Instagram no entregó el token de acceso.");
    }

    // Identify the account before enforcing the plan limit. Reconnecting an
    // existing account must always be allowed; only a genuinely new account
    // consumes another slot.
    const profileResponse = await fetch(
      `https://graph.instagram.com/me?fields=id,username,name,account_type&access_token=${encodeURIComponent(String(token.access_token))}`,
      { cache:"no-store" },
    );
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.id) {
      throw new Error(profile.error?.message || "Instagram no devolvió los datos de la cuenta.");
    }

    const existing = await ctx.db
      .from("meta_instagram_accounts")
      .select("id")
      .eq("user_id",session.userId)
      .eq("instagram_user_id",String(profile.id))
      .maybeSingle();
    if (existing.error) throw new Error(existing.error.message);
    if (!existing.data && ctx.total >= ctx.limit) {
      throw new Error("Límite de cuentas alcanzado para tu plan.");
    }

    // Persist the authorized account immediately. This prevents a successful OAuth\n    // authorization from disappearing if Meta temporarily fails the long-lived\n    // token upgrade. Then upgrade and overwrite the token when available.\n    let accessToken = String(token.access_token);\n    try {\n      const longLived = await exchangeInstagramLongLivedToken(accessToken);\n      accessToken = longLived.accessToken;\n    } catch (upgradeError) {\n      console.error("Instagram long-lived token upgrade failed; keeping authorized token", upgradeError);\n    }\n\n    // saveInstagramAccount upserts before webhook subscription. Even if Meta rejects\n    // a subscription field, the account itself remains connected and visible.\n    let subscriptionWarning = "";\n    try {\n      await saveInstagramAccount(session.userId,accessToken);\n    } catch (saveError:any) {\n      // saveInstagramAccount may have already persisted the account and then failed\n      // while subscribing webhooks. Verify that before treating OAuth as failed.\n      const persisted = await ctx.db\n        .from("meta_instagram_accounts")\n        .select("id")\n        .eq("user_id",session.userId)\n        .eq("instagram_user_id",String(profile.id))\n        .maybeSingle();\n      if (persisted.error || !persisted.data) throw saveError;\n      subscriptionWarning = String(saveError?.message || "Webhook pendiente");\n    }\n\n    return home(url,{
      meta_connected:"instagram",
      connected_username:String(profile.username || ""),
      connected_id:String(profile.id),\n      ...(subscriptionWarning ? { meta_warning:subscriptionWarning } : {}),\n    });
  } catch (error:any) {
    return home(url,{ meta_error:error?.message || "oauth_failed" });
  }
}
