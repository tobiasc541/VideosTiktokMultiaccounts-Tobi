import crypto from "crypto";
import { env } from "./env";

export type OAuthState={provider:"instagram"|"tiktok";userId:string;email:string;plan?:string;nonce:string;iat:number};

export function createOAuthState(input:Omit<OAuthState,"nonce"|"iat">){
 const value:OAuthState={...input,nonce:crypto.randomBytes(24).toString("base64url"),iat:Date.now()};
 const payload=Buffer.from(JSON.stringify(value)).toString("base64url");
 const sig=crypto.createHmac("sha256",env("APP_PASSWORD")).update(payload).digest("base64url");
 return `${payload}.${sig}`;
}
export function readOAuthState(state:string|null,provider:OAuthState["provider"]){
 if(!state)return null;const [payload,sig]=state.split(".");if(!payload||!sig)return null;
 const expected=crypto.createHmac("sha256",env("APP_PASSWORD")).update(payload).digest("base64url");
 if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return null;
 try{const v=JSON.parse(Buffer.from(payload,"base64url").toString("utf8")) as OAuthState;
  if(v.provider!==provider||!v.userId||!v.email||!v.nonce||!v.iat||Date.now()-v.iat>10*60*1000)return null;
  return v;
 }catch{return null}
}