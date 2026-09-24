import crypto from "crypto";
import { supabaseAdmin } from "./supabase-admin";

export type OAuthState={provider:"instagram"|"tiktok";userId:string;email:string;plan?:string};

const hash=(value:string)=>crypto.createHash("sha256").update(value).digest("hex");

export async function createOAuthState(input:OAuthState){
  const state=crypto.randomBytes(32).toString("base64url");
  const {error}=await supabaseAdmin().from("oauth_transactions").insert({
    state_hash:hash(state),provider:input.provider,user_id:input.userId,email:input.email,
    plan:input.plan||null,expires_at:new Date(Date.now()+10*60*1000).toISOString()
  });
  if(error)throw new Error("No se pudo iniciar OAuth");
  return state;
}

export async function readOAuthState(state:string|null,provider:OAuthState["provider"]){
  if(!state)return null;
  const db=supabaseAdmin();
  // DELETE ... RETURNING makes the state single-use, including failed/replayed callbacks.
  const {data,error}=await db.from("oauth_transactions").delete()
    .eq("state_hash",hash(state)).eq("provider",provider).gt("expires_at",new Date().toISOString())
    .select("provider,user_id,email,plan").maybeSingle();
  if(error||!data)return null;
  return {provider:data.provider as OAuthState["provider"],userId:String(data.user_id),email:String(data.email),plan:data.plan?String(data.plan):undefined};
}
