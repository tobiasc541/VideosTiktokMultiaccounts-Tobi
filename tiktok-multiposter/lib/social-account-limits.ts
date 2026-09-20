import {getCustomerSession} from "./auth";
import {PLAN_CONFIG,isPlanId,type PlanId} from "./plans";
import {supabaseAdmin} from "./supabase-admin";

export async function socialAccountContext(){
 const session=await getCustomerSession(); if(!session)return null;
 const db=supabaseAdmin(); const {data}=await db.auth.admin.getUserById(session.userId);
 const raw=String(data.user?.user_metadata?.plan||session.plan||"");
 if(!isPlanId(raw))return null;
 const plan=raw as PlanId,limit=PLAN_CONFIG[plan].accounts;
 const [tt,ig,fb]=await Promise.all([
  db.from("tiktok_accounts").select("id",{count:"exact",head:true}).eq("user_id",session.userId),
  db.from("meta_instagram_accounts").select("id",{count:"exact",head:true}).eq("user_id",session.userId),
  db.from("meta_facebook_pages").select("id",{count:"exact",head:true}).eq("user_id",session.userId)
 ]);
 const counts={tiktok:tt.count||0,instagram:ig.count||0,facebook:fb.count||0};
 return {session,db,plan,limit,counts,total:counts.tiktok+counts.instagram+counts.facebook};
}
