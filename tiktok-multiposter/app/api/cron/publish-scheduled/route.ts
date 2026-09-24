import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { publishToTarget, type PublishTarget } from "../../../../lib/publishing/adapters";

export const maxDuration = 300;

const PLATFORM_GAP_MS: Record<PublishTarget["platform"], number> = { tiktok: 12_000, instagram: 8_000, facebook: 6_000 };
const RETRYABLE = /429|rate.?limit|too many|temporar|timeout|5\d\d|internal/i;
const MAX_JOBS_PER_RUN=20;
const MAX_TARGETS_PER_JOB_PER_RUN=3;
const RUN_BUDGET_MS=240_000;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

async function publishSafely(target:PublishTarget,payload:any){
  let last:unknown;
  for(let attempt=0;attempt<3;attempt++){
    try{return await publishToTarget(target,payload)}
    catch(e:any){last=e;if(!RETRYABLE.test(String(e?.message||e))||attempt===2)throw e;await sleep(5_000*Math.pow(2,attempt))}
  }
  throw last;
}

export async function GET(req: Request) {
  const started=Date.now();
  const secret=process.env.CRON_SECRET;
  if(!secret||req.headers.get("authorization")!==`Bearer ${secret}`)return NextResponse.json({error:"No autorizado"},{status:401});
  const client=supabaseAdmin();

  // Pull a wider window, then choose fairly so one heavy customer cannot starve everybody else.
  const due=await client.from("scheduled_publications").select("*").eq("status","scheduled")
    .lte("scheduled_at",new Date().toISOString()).order("scheduled_at",{ascending:true}).limit(100);
  if(due.error)return NextResponse.json({error:due.error.message},{status:500});
  const chosen:any[]=[],perUser=new Map<string,number>();
  for(const job of due.data||[]){
    const uid=String(job.user_id||"");
    const n=perUser.get(uid)||0;
    if(n>=1)continue;
    perUser.set(uid,n+1);chosen.push(job);
    if(chosen.length>=MAX_JOBS_PER_RUN)break;
  }

  const processed:any[]=[];
  const lastPlatformRun:Partial<Record<PublishTarget["platform"],number>>={};
  for(const job of chosen){
    if(Date.now()-started>RUN_BUDGET_MS)break;
    const claim=await client.from("scheduled_publications").update({status:"processing",attempts:Number(job.attempts||0)+1,updated_at:new Date().toISOString()})
      .eq("id",job.id).eq("status","scheduled").select("*").maybeSingle();
    if(claim.error||!claim.data)continue;
    const live=claim.data;
    try{
      const download=await client.storage.from(live.storage_bucket).download(live.storage_path);
      if(download.error||!download.data)throw new Error(download.error?.message||"No se pudo recuperar el video.");
      const bytes=new Uint8Array(await download.data.arrayBuffer());
      const targets=(Array.isArray(live.targets)?live.targets:[]) as PublishTarget[];
      const results={...((live.platform_results&&typeof live.platform_results==="object")?live.platform_results:{})} as Record<string,any>;
      const pending=targets.filter(t=>!results[`${t.platform}:${t.accountId}`]?.ok).slice(0,MAX_TARGETS_PER_JOB_PER_RUN);

      for(const target of pending){
        if(Date.now()-started>RUN_BUDGET_MS)break;
        const key=`${target.platform}:${target.accountId}`,gap=PLATFORM_GAP_MS[target.platform]||8_000;
        const wait=Math.max(0,gap-(Date.now()-(lastPlatformRun[target.platform]||0)));if(wait)await sleep(wait);
        try{
          const result=await publishSafely(target,{caption:live.caption,privacyLevel:live.privacy_level,video:{bytes,size:bytes.byteLength,mimeType:live.mime_type||"video/mp4"}});
          lastPlatformRun[target.platform]=Date.now();results[key]=result;
        }catch(e:any){
          lastPlatformRun[target.platform]=Date.now();results[key]={ok:false,error:e?.message||"Error de publicación",retryable:RETRYABLE.test(String(e?.message||e))};
        }
      }

      const remaining=targets.filter(t=>!results[`${t.platform}:${t.accountId}`]?.ok);
      const permanentFailure=remaining.some(t=>results[`${t.platform}:${t.accountId}`]&&results[`${t.platform}:${t.accountId}`].retryable===false);
      const waiting=Object.values(results).some((x:any)=>x?.awaitingApi);
      const status=remaining.length?(permanentFailure?"partial":"scheduled"):(waiting?"awaiting_api":"published");
      await client.from("scheduled_publications").update({
        status,platform_results:results,last_error:permanentFailure?"Una o más plataformas fallaron de forma permanente.":null,
        published_at:status==="published"?new Date().toISOString():null,updated_at:new Date().toISOString()
      }).eq("id",live.id);
      processed.push({id:live.id,status,completed:targets.length-remaining.length,total:targets.length});
    }catch(e:any){
      const retry=Number(live.attempts||0)<5;
      await client.from("scheduled_publications").update({status:retry?"scheduled":"failed",last_error:e?.message||"Error del worker",updated_at:new Date().toISOString()}).eq("id",live.id);
      processed.push({id:live.id,status:retry?"scheduled":"failed"});
    }
  }
  return NextResponse.json({ok:true,processed,queued:(due.data||[]).length,elapsedMs:Date.now()-started});
}