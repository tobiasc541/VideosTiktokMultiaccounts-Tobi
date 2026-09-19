import crypto from "crypto";
import { NextResponse } from "next/server";
import { env } from "../../../../../lib/env";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
export async function GET(req:Request){
 const u=new URL(req.url),mode=u.searchParams.get("hub.mode"),token=u.searchParams.get("hub.verify_token"),challenge=u.searchParams.get("hub.challenge");
 if(mode==="subscribe"&&token===env("META_WEBHOOK_VERIFY_TOKEN")&&challenge)return new NextResponse(challenge,{status:200,headers:{"Content-Type":"text/plain"}});
 return new NextResponse("Forbidden",{status:403});
}
export async function POST(req:Request){
 const raw=await req.text(),sig=req.headers.get("x-hub-signature-256")||"";
 const expected="sha256="+crypto.createHmac("sha256",env("META_INSTAGRAM_APP_SECRET")).update(raw).digest("hex");
 if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))return new NextResponse("Invalid signature",{status:401});
 let payload:any;try{payload=JSON.parse(raw)}catch{return new NextResponse("Bad request",{status:400})}
 const db=supabaseAdmin();const q=await db.from("meta_webhook_events").insert({platform:"instagram",event_type:String(payload.object||"instagram"),payload});
 if(q.error)console.error("Meta webhook persistence:",q.error.message);
 return NextResponse.json({ok:true});
}