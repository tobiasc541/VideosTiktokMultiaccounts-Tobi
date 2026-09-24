import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { publishToTarget, type PublishTarget } from "../../../../lib/publishing/adapters";

export const maxDuration = 300;

const PLATFORM_GAP_MS: Record<PublishTarget["platform"], number> = {
  tiktok: 12_000,
  instagram: 8_000,
  facebook: 6_000,
};
const RETRYABLE = /429|rate.?limit|too many|temporar|timeout|5\d\d|internal/i;
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

async function publishSafely(target:PublishTarget,payload:any){
  let last:unknown;
  for(let attempt=0;attempt<3;attempt++){
    try{return await publishToTarget(target,payload)}
    catch(e:any){
      last=e;
      if(!RETRYABLE.test(String(e?.message||e))||attempt===2)throw e;
      await sleep(5_000*Math.pow(2,attempt));
    }
  }
  throw last;
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const client = supabaseAdmin();
  const due = await client.from("scheduled_publications")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(10);
  if (due.error) return NextResponse.json({ error: due.error.message }, { status: 500 });

  const processed: any[] = [];
  for (const job of due.data || []) {
    const claim = await client.from("scheduled_publications")
      .update({ status: "processing", attempts: Number(job.attempts || 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", job.id).eq("status", "scheduled").select("id").maybeSingle();
    if (claim.error || !claim.data) continue;

    try {
      const download = await client.storage.from(job.storage_bucket).download(job.storage_path);
      if (download.error || !download.data) throw new Error(download.error?.message || "No se pudo recuperar el video.");
      const bytes = new Uint8Array(await download.data.arrayBuffer());
      const targets = (Array.isArray(job.targets) ? job.targets : []) as PublishTarget[];
      const results: Record<string, unknown> = {};
      let waiting = false;
      let failed = false;
      const lastPlatformRun:Partial<Record<PublishTarget["platform"],number>>={};

      for (const target of targets) {
        const key = `${target.platform}:${target.accountId}`;
        const gap=PLATFORM_GAP_MS[target.platform]||8_000;
        const wait=Math.max(0,gap-(Date.now()-(lastPlatformRun[target.platform]||0)));
        if(wait)await sleep(wait);
        try {
          const result = await publishSafely(target, {
            caption: job.caption,
            privacyLevel: job.privacy_level,
            video: { bytes, size: bytes.byteLength, mimeType: job.mime_type || "video/mp4" }
          });
          lastPlatformRun[target.platform]=Date.now();
          results[key] = result;
          if ((result as any).awaitingApi) waiting = true;
        } catch (e: any) {
          lastPlatformRun[target.platform]=Date.now();
          failed = true;
          results[key] = { ok: false, error: e?.message || "Error de publicación" };
        }
      }

      const status = failed ? "partial" : waiting ? "awaiting_api" : "published";
      await client.from("scheduled_publications").update({
        status,
        platform_results: results,
        last_error: failed ? "Una o más plataformas fallaron." : null,
        published_at: status === "published" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      }).eq("id", job.id);
      processed.push({ id: job.id, status });
    } catch (e: any) {
      await client.from("scheduled_publications").update({
        status: "failed", last_error: e?.message || "Error del worker", updated_at: new Date().toISOString()
      }).eq("id", job.id);
      processed.push({ id: job.id, status: "failed" });
    }
  }

  return NextResponse.json({ ok: true, processed });
}
