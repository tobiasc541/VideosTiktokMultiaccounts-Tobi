import crypto from "crypto";
import {NextResponse} from "next/server";
import {supabaseAdmin} from "../../../../lib/supabase-admin";
import {publishToTarget,type PublishTarget} from "../../../../lib/publishing/adapters";
export const maxDuration=300;
const RETRYABLE=/429|rate.?limit|too many|temporar|timeout|5\d\d|internal/i, BATCH=24, BUDGET=240000;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function publishSafely(target:PublishTarget,payload:any){let last:any;for(let a=0;a<3;a++){try{return await publishToTarget(target,payload)}catch(e:any){last=e;if(!RETRYABLE.test(String(e?.message||e))||a===2)throw e;await sleep(3000*Math.pow(2,a))}}throw last}
export async function GET(req:Request){
 const started=Date.now(),secret=process.env.CRON_SECRET;if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"No autorizado"},{status:401});
 const db=supabaseAdmin(),worker=crypto.randomUUID();
 const claim=await db.rpc("claim_publish_target_jobs",{p_limit:BATCH,p_worker:worker,p_lease_seconds:240});
 if(claim.error)return NextResponse.json({error:claim.error.message},{status:500});
 const jobs=claim.data||[],cache=new Map<string,{row:any,bytes:Uint8Array}>(),out:any[]=[];
 // Different accounts/tokens may run concurrently. Each account still has only one job in this batch.
 const unique:any[]=[];const seen=new Set<string>();
 for(const j of jobs){const k=`${j.platform}:${j.account_id}`;if(seen.has(k)){await db.from("publish_target_jobs").update({status:"retry",next_attempt_at:new Date(Date.now()+15000).toISOString(),lease_until:null,worker_id:null,updated_at:new Date().toISOString()}).eq("id",j.id);continue}seen.add(k);unique.push(j)}
 for(let i=0;i<unique.length&&Date.now()-started<BUDGET;i+=6){
  await Promise.all(unique.slice(i,i+6).map(async(j:any)=>{
   try{
    let media=cache.get(j.publication_id);
    if(!media){const q=await db.from("scheduled_publications").select("*").eq("id",j.publication_id).single();if(q.error||!q.data)throw new Error(q.error?.message||"Publicación inexistente");const d=await db.storage.from(q.data.storage_bucket).download(q.data.storage_path);if(d.error||!d.data)throw new Error(d.error?.message||"No se pudo recuperar el video");media={row:q.data,bytes:new Uint8Array(await d.data.arrayBuffer())};cache.set(j.publication_id,media)}
    const target={platform:j.platform,accountId:j.account_id,name:j.account_name} as PublishTarget;
    const r:any=await publishSafely(target,{caption:media.row.caption,privacyLevel:media.row.privacy_level,video:{bytes:media.bytes,size:media.bytes.byteLength,mimeType:media.row.mime_type||"video/mp4"}});
    const status=r?.awaitingApi?"awaiting_api":r?.ok?"published":"retry";
    await db.from("publish_target_jobs").update({status,result:r||{},last_error:r?.message||null,published_at:status==="published"?new Date().toISOString():null,lease_until:null,worker_id:null,next_attempt_at:status==="retry"?new Date(Date.now()+60000).toISOString():j.next_attempt_at,updated_at:new Date().toISOString()}).eq("id",j.id);
    out.push({id:j.id,status});
   }catch(e:any){const retry=j.attempts<5&&RETRYABLE.test(String(e?.message||e));await db.from("publish_target_jobs").update({status:retry?"retry":"failed",last_error:String(e?.message||e).slice(0,1000),next_attempt_at:new Date(Date.now()+Math.min(300000,15000*Math.pow(2,Math.max(0,j.attempts-1)))).toISOString(),lease_until:null,worker_id:null,updated_at:new Date().toISOString()}).eq("id",j.id);out.push({id:j.id,status:retry?"retry":"failed"})}
  }));
 }
 const pubs=[...new Set(unique.map((j:any)=>j.publication_id))];
 for(const id of pubs){const q=await db.from("publish_target_jobs").select("status,result,last_error,platform,account_id").eq("publication_id",id);if(q.error)continue;const rows=q.data||[],pending=rows.some((x:any)=>["queued","retry","processing"].includes(x.status)),failed=rows.some((x:any)=>x.status==="failed"),waiting=rows.some((x:any)=>x.status==="awaiting_api"),done=rows.length>0&&rows.every((x:any)=>["published","failed","awaiting_api"].includes(x.status));const status=pending?"scheduled":failed?"partial":waiting?"awaiting_api":done?"published":"scheduled";const results=Object.fromEntries(rows.map((x:any)=>[`${x.platform}:${x.account_id}`,x.result||{error:x.last_error}]));await db.from("scheduled_publications").update({status,platform_results:results,last_error:failed?"Una o más cuentas no pudieron publicar.":null,published_at:status==="published"?new Date().toISOString():null,updated_at:new Date().toISOString()}).eq("id",id)}
 return NextResponse.json({ok:true,worker,claimed:jobs.length,processed:out.length,results:out,elapsedMs:Date.now()-started});
}