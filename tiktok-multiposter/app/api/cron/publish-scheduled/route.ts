import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase-admin";
import { publishToTarget, type PublishTarget } from "../../../../lib/publishing/adapters";

export const maxDuration = 300;

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

      for (const target of targets) {
        const key = `${target.platform}:${target.accountId}`;
        try {
          const result = await publishToTarget(target, {
            caption: job.caption,
            privacyLevel: job.privacy_level,
            video: { bytes, size: bytes.byteLength, mimeType: job.mime_type || "video/mp4" }
          });
          results[key] = result;
          if ((result as any).awaitingApi) waiting = true;
        } catch (e: any) {
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
