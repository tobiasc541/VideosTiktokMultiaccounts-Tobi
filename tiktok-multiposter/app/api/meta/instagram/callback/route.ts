import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { env } from "../../../../../lib/env";
import { exchangeInstagramLongLivedToken, readMetaState, redirectUri, saveInstagramAccount } from "../../../../../lib/meta-instagram";
import { socialAccountContext } from "../../../../../lib/social-account-limits";

function home(url: URL, params: Record<string,string>) {
  const target=new URL("/",url.origin);
  Object.entries(params).forEach(([k,v])=>target.searchParams.set(k,v));
  target.searchParams.set("section","accounts");
  return NextResponse.redirect(target);
}

export async function GET(req:Request){
  const url=new URL(req.url);
  const code=url.searchParams.get("code");
  const state=url.searchParams.get("state");
  const oauthError=url.searchParams.get("error_description")||url.searchParams.get("error");
  const session=await getCustomerSession();
  const ctx=session?await socialAccountContext():null;

  async function diag(stage:string,ok:boolean,extra:Record<string,unknown>={}){
    if(!session||!ctx)return;
    const safe={...extra};
    delete (safe as any).access_token;
    delete (safe as any).token;
    await ctx.db.from("meta_oauth_diagnostics").insert({
      user_id:session.userId,provider:"instagram",stage,ok,
      external_account_id:String((safe as any).external_account_id||"")||null,
      external_username:String((safe as any).external_username||"")||null,
      error_message:String((safe as any).error_message||"")||null,
      details:safe
    });
  }

  if(oauthError){
    await diag("oauth_return",false,{error_message:oauthError});
    return home(url,{meta_error:oauthError});
  }
  const st=state?readMetaState(state):null;
  if(!session||!ctx||!st||session.userId!==st.userId||!code){
    await diag("state_session_validation",false,{error_message:"oauth_invalid",has_session:!!session,has_state:!!st,has_code:!!code,state_matches:!!session&&!!st&&session.userId===st.userId});
    return home(url,{meta_error:"oauth_invalid"});
  }
  await diag("state_session_validation",true,{has_code:true});

  try{
    const form=new URLSearchParams({
      client_id:env("META_INSTAGRAM_APP_ID"),
      client_secret:env("META_INSTAGRAM_APP_SECRET"),
      grant_type:"authorization_code",
      redirect_uri:redirectUri(),
      code
    });
    const response=await fetch("https://api.instagram.com/oauth/access_token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form,cache:"no-store"});
    const token=await response.json().catch(()=>({}));
    if(!response.ok||!token.access_token){
      const msg=String(token.error_message||token.error?.message||`Token exchange HTTP ${response.status}`);
      await diag("token_exchange",false,{error_message:msg,http_status:response.status,error_type:token.error_type||token.error?.type||null,error_code:token.code||token.error?.code||null});
      throw new Error(msg);
    }
    await diag("token_exchange",true,{http_status:response.status});

    const shortToken=String(token.access_token);
    const profileUrl=new URL("https://graph.instagram.com/me");
    profileUrl.searchParams.set("fields","id,username,name,account_type");
    profileUrl.searchParams.set("access_token",shortToken);
    const profileResponse=await fetch(profileUrl,{cache:"no-store"});
    const profile=await profileResponse.json().catch(()=>({}));
    if(!profileResponse.ok||!profile.id){
      const msg=String(profile.error?.message||`Profile HTTP ${profileResponse.status}`);
      await diag("profile_fetch",false,{error_message:msg,http_status:profileResponse.status,error_code:profile.error?.code||null});
      throw new Error(msg);
    }
    const instagramUserId=String(profile.id);
    await diag("profile_fetch",true,{external_account_id:instagramUserId,external_username:profile.username||null,account_type:profile.account_type||null});

    const existing=await ctx.db.from("meta_instagram_accounts").select("id").eq("user_id",session.userId).eq("instagram_user_id",instagramUserId).maybeSingle();
    if(existing.error){
      await diag("existing_lookup",false,{external_account_id:instagramUserId,error_message:existing.error.message});
      throw new Error(existing.error.message);
    }
    if(!existing.data&&ctx.total>=ctx.limit){
      await diag("plan_limit",false,{external_account_id:instagramUserId,total:ctx.total,limit:ctx.limit,error_message:"Límite de cuentas alcanzado"});
      throw new Error("Límite de cuentas alcanzado para tu plan.");
    }

    const persisted=await ctx.db.from("meta_instagram_accounts").upsert({
      user_id:session.userId,
      instagram_user_id:instagramUserId,
      username:profile.username||null,
      display_name:profile.name||null,
      account_type:profile.account_type||null,
      access_token:shortToken,
      updated_at:new Date().toISOString()
    },{onConflict:"user_id,instagram_user_id"}).select("id").single();
    if(persisted.error){
      await diag("account_persist",false,{external_account_id:instagramUserId,external_username:profile.username||null,error_message:persisted.error.message,code:persisted.error.code||null});
      throw new Error(persisted.error.message);
    }
    await diag("account_persist",true,{external_account_id:instagramUserId,external_username:profile.username||null,db_id:persisted.data?.id||null});

    let accessToken=shortToken;
    try{
      const longLived=await exchangeInstagramLongLivedToken(shortToken);
      accessToken=longLived.accessToken;
      await diag("long_lived_token",true,{external_account_id:instagramUserId});
    }catch(e:any){
      await diag("long_lived_token",false,{external_account_id:instagramUserId,error_message:String(e?.message||e)});
    }

    try{
      await saveInstagramAccount(session.userId,accessToken);
      await diag("webhook_setup",true,{external_account_id:instagramUserId});
    }catch(e:any){
      await diag("webhook_setup",false,{external_account_id:instagramUserId,error_message:String(e?.message||e)});
    }

    return home(url,{meta_connected:"instagram",connected_username:String(profile.username||""),connected_id:instagramUserId});
  }catch(error:any){
    await diag("callback_failed",false,{error_message:String(error?.message||"oauth_failed")});
    return home(url,{meta_error:String(error?.message||"oauth_failed")});
  }
}
