import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../../lib/auth";
import {supabaseAdmin} from "../../../../../lib/supabase-admin";
export const dynamic="force-dynamic";
const GRAPH="https://graph.instagram.com",VER=process.env.META_GRAPH_API_VERSION||"v24.0";
export async function GET(){
 const session=await getCustomerSession();if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
 const db=supabaseAdmin(),q=await db.from("meta_instagram_accounts").select("id,username,instagram_user_id,access_token").eq("user_id",session.userId);
 const items:any[]=[];
 for(const a of q.data||[]){try{const u=new URL(`${GRAPH}/${VER}/${a.instagram_user_id}/media`);u.searchParams.set("fields","id,caption,media_type,media_product_type,permalink,timestamp,thumbnail_url,media_url");u.searchParams.set("limit","50");u.searchParams.set("access_token",a.access_token);const r=await fetch(u,{cache:"no-store"}),j=await r.json().catch(()=>({}));if(r.ok&&!j.error)for(const m of j.data||[])items.push({...m,account_id:a.id,username:a.username})}catch{}}
 items.sort((a,b)=>String(b.timestamp||"").localeCompare(String(a.timestamp||"")));
 return NextResponse.json({media:items.slice(0,100)});
}