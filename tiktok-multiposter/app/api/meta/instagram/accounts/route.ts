import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

const VER=process.env.META_GRAPH_API_VERSION||"v24.0";
const REQUIRED_FIELDS=["comments","live_comments","messages","messaging_postbacks","messaging_referral","messaging_seen"];

async function ensureWebhookSubscription(a:any){
  try{
    const postUrl=new URL(`https://graph.instagram.com/${VER}/${a.instagram_user_id}/subscribed_apps`);
    postUrl.searchParams.set("subscribed_fields",REQUIRED_FIELDS.join(","));
    postUrl.searchParams.set("access_token",a.access_token);
    const post=await fetch(postUrl,{method:"POST",cache:"no-store"});
    const postJson=await post.json().catch(()=>({}));
    if(!post.ok||postJson.success!==true){
      return {ok:false,fields:[],error:String(postJson?.error?.message||`Instagram HTTP ${post.status}`)};
    }

    // Do not assume POST success means the account is really subscribed.
    // Read it back from Meta and expose a safe diagnostic (never the token).
    const getUrl=new URL(`https://graph.instagram.com/${VER}/${a.instagram_user_id}/subscribed_apps`);
    getUrl.searchParams.set("access_token",a.access_token);
    const get=await fetch(getUrl,{cache:"no-store"});
    const getJson=await get.json().catch(()=>({}));
    if(!get.ok||getJson.error){
      return {ok:false,fields:[],error:String(getJson?.error?.message||`Instagram HTTP ${get.status}`)};
    }
    const fields=Array.from(new Set((getJson?.data||[]).flatMap((x:any)=>Array.isArray(x?.subscribed_fields)?x.subscribed_fields:[]).map(String)));
    const missing=REQUIRED_FIELDS.filter(x=>!fields.includes(x));
    return {ok:missing.length===0,fields,missing,error:missing.length?`Faltan suscripciones: ${missing.join(", ")}`:null};
  }catch(e:any){
    return {ok:false,fields:[],error:String(e?.message||e)};
  }
}

export async function GET(){
  const session=await getCustomerSession();
  if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
  const db=supabaseAdmin();
  const q=await db.from("meta_instagram_accounts")
    .select("id,instagram_user_id,username,display_name,account_type,created_at,access_token")
    .eq("user_id",session.userId).order("created_at",{ascending:true});
  if(q.error)return NextResponse.json({error:q.error.message},{status:500});

  const subscriptions=await Promise.all((q.data||[]).map((a:any)=>ensureWebhookSubscription(a)));
  const accounts=(q.data||[]).map(({access_token,...a}:any,i:number)=>({
    ...a,
    webhook_subscription:subscriptions[i]
  }));
  return NextResponse.json({accounts},{headers:{"Cache-Control":"private, no-store"}});
}

export async function DELETE(req:Request){
  const session=await getCustomerSession();
  if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
  const id=new URL(req.url).searchParams.get("id");
  if(!id)return NextResponse.json({error:"Falta la cuenta."},{status:400});
  const db=supabaseAdmin();
  const q=await db.from("meta_instagram_accounts").delete().eq("id",id).eq("user_id",session.userId).select("id").maybeSingle();
  if(q.error)return NextResponse.json({error:q.error.message},{status:500});
  if(!q.data)return NextResponse.json({error:"Cuenta no encontrada."},{status:404});
  return NextResponse.json({ok:true});
}
