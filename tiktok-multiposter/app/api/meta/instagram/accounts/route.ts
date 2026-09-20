import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";

const VER=process.env.META_GRAPH_API_VERSION||"v24.0";
// Keep the account-level subscription minimal and documented for the two
// features VYRAL actually needs. Extra/unsupported fields can make the whole
// subscribed_apps POST fail atomically.
const REQUIRED_FIELDS=["comments","messages","messaging_postbacks"];

async function jsonFetch(url:URL,init?:RequestInit){
  const r=await fetch(url,{...init,cache:"no-store"});
  const j=await r.json().catch(()=>({}));
  return {r,j};
}

async function ensureWebhookSubscription(a:any){
  try{
    const postUrl=new URL(`https://graph.instagram.com/${VER}/${a.instagram_user_id}/subscribed_apps`);
    postUrl.searchParams.set("subscribed_fields",REQUIRED_FIELDS.join(","));
    postUrl.searchParams.set("access_token",a.access_token);
    const {r:post,j:postJson}=await jsonFetch(postUrl,{method:"POST"});
    if(!post.ok||postJson.success!==true){
      return {ok:false,fields:[],missing:REQUIRED_FIELDS,error:String(postJson?.error?.message||`Instagram HTTP ${post.status}`)};
    }

    const getUrl=new URL(`https://graph.instagram.com/${VER}/${a.instagram_user_id}/subscribed_apps`);
    getUrl.searchParams.set("access_token",a.access_token);
    const {r:get,j:getJson}=await jsonFetch(getUrl);
    if(!get.ok||getJson.error){
      return {ok:false,fields:[],missing:REQUIRED_FIELDS,error:String(getJson?.error?.message||`Instagram HTTP ${get.status}`)};
    }
    const fields=Array.from(new Set((getJson?.data||[]).flatMap((x:any)=>Array.isArray(x?.subscribed_fields)?x.subscribed_fields:[]).map(String))) as string[];
    const missing=REQUIRED_FIELDS.filter(x=>!fields.includes(x));
    return {ok:missing.length===0,fields,missing,error:missing.length?`Faltan suscripciones: ${missing.join(", ")}`:null};
  }catch(e:any){
    return {ok:false,fields:[],missing:REQUIRED_FIELDS,error:String(e?.message||e)};
  }
}

async function readLatestComments(a:any){
  try{
    const mediaUrl=new URL(`https://graph.instagram.com/${VER}/${a.instagram_user_id}/media`);
    mediaUrl.searchParams.set("fields","id,timestamp");
    mediaUrl.searchParams.set("limit","5");
    mediaUrl.searchParams.set("access_token",a.access_token);
    const {r:mr,j:mj}=await jsonFetch(mediaUrl);
    if(!mr.ok||mj.error)throw new Error(mj?.error?.message||`Instagram HTTP ${mr.status}`);
    const media=Array.isArray(mj.data)?mj.data:[];
    const latest=media[0];
    if(!latest?.id)return {ok:true,mediaId:null,comments:[],error:null};

    const commentsUrl=new URL(`https://graph.instagram.com/${VER}/${latest.id}/comments`);
    commentsUrl.searchParams.set("fields","id,text,timestamp,username");
    commentsUrl.searchParams.set("limit","20");
    commentsUrl.searchParams.set("access_token",a.access_token);
    const {r:cr,j:cj}=await jsonFetch(commentsUrl);
    if(!cr.ok||cj.error)throw new Error(cj?.error?.message||`Instagram HTTP ${cr.status}`);
    const comments=(Array.isArray(cj.data)?cj.data:[]).map((x:any)=>({
      id:String(x.id||""),text:String(x.text||"").slice(0,200),timestamp:x.timestamp||null,username:x.username||null
    }));
    return {ok:true,mediaId:String(latest.id),comments,error:null};
  }catch(e:any){
    return {ok:false,mediaId:null,comments:[],error:String(e?.message||e)};
  }
}

export async function GET(){
  const session=await getCustomerSession();
  if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
  const db=supabaseAdmin();
  const q=await db.from("meta_instagram_accounts")
    .select("id,user_id,instagram_user_id,username,display_name,account_type,created_at,access_token")
    .eq("user_id",session.userId).order("created_at",{ascending:true});
  if(q.error)return NextResponse.json({error:q.error.message},{status:500});

  const checked=await Promise.all((q.data||[]).map(async(a:any)=>{
    const [subscription,media]=await Promise.all([ensureWebhookSubscription(a),readLatestComments(a)]);
    await db.from("instagram_webhook_diagnostics").upsert({
      account_id:a.id,user_id:a.user_id,checked_at:new Date().toISOString(),graph_version:VER,
      subscription_ok:subscription.ok,subscribed_fields:subscription.fields,missing_fields:subscription.missing,
      subscription_error:subscription.error,media_read_ok:media.ok,latest_media_id:media.mediaId,
      latest_comments:media.comments,media_error:media.error
    },{onConflict:"account_id"});
    return {subscription,media:{ok:media.ok,error:media.error,latest_media_id:media.mediaId,comment_count:media.comments.length}};
  }));

  const accounts=(q.data||[]).map(({access_token,user_id,...a}:any,i:number)=>({
    ...a,webhook_subscription:checked[i].subscription,webhook_diagnostic:checked[i].media
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
