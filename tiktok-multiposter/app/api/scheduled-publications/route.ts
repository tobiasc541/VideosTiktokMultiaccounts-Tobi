import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase-admin";

const BUCKET = "scheduled-media";
const ALLOWED = new Set(["video/mp4", "video/quicktime", "video/webm"]);

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    const scheduledAt = String(form.get("scheduledAt") || "");
    const timezone = String(form.get("timezone") || "UTC");
    const caption = String(form.get("caption") || "").trim();
    const privacyLevel = String(form.get("privacyLevel") || "");
    const targetsRaw = String(form.get("targets") || "[]");
    const platformsRaw = String(form.get("platforms") || "[\"tiktok\"]");

    if (!(file instanceof File) || !scheduledAt || !caption) {
      return NextResponse.json({ error: "Faltan el video, la descripción o la fecha programada." }, { status: 400 });
    }
    if (!ALLOWED.has(file.type)) return NextResponse.json({ error: "Usá MP4, MOV/QuickTime o WebM." }, { status: 400 });

    const when = new Date(scheduledAt);
    if (!Number.isFinite(when.getTime()) || when.getTime() <= Date.now() + 30_000) {
      return NextResponse.json({ error: "Elegí una fecha al menos 30 segundos en el futuro." }, { status: 400 });
    }

    const targets = JSON.parse(targetsRaw);
    const platforms = JSON.parse(platformsRaw);
    if (!Array.isArray(targets) || !targets.length) return NextResponse.json({ error: "Seleccioná al menos una cuenta." }, { status: 400 });
    if (!Array.isArray(platforms) || !platforms.length) return NextResponse.json({ error: "Seleccioná al menos una plataforma." }, { status: 400 });

    const client = supabaseAdmin();
    const ext = (file.name.split(".").pop() || "mp4").replace(/[^a-z0-9]/gi, "").toLowerCase() || "mp4";
    const id = crypto.randomUUID();
    const storagePath = `${session.userId}/${id}/video.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const upload = await client.storage.from(BUCKET).upload(storagePath, bytes, {
      contentType: file.type || "video/mp4",
      upsert: false
    });
    if (upload.error) throw new Error(`No se pudo guardar el video: ${upload.error.message}`);

    const insert = await client.from("scheduled_publications").insert({
      id,
      user_id: session.userId,
      scheduled_at: when.toISOString(),
      timezone,
      caption,
      privacy_level: privacyLevel || null,
      platforms,
      targets,
      storage_bucket: BUCKET,
      storage_path: storagePath,
      mime_type: file.type || null,
      file_name: file.name,
      file_size: file.size,
      status: "scheduled"
    }).select("id, scheduled_at, status").single();

    if (insert.error) {
      await client.storage.from(BUCKET).remove([storagePath]);
      throw new Error(`No se pudo crear la programación: ${insert.error.message}`);
    }

    return NextResponse.json({ ok: true, publication: insert.data });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "No se pudo programar la publicación." }, { status: 500 });
  }
}

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const client = supabaseAdmin();
  const q = await client.from("scheduled_publications")
    .select("id,scheduled_at,timezone,caption,platforms,targets,status,last_error,platform_results,created_at")
    .eq("user_id", session.userId)
    .order("scheduled_at", { ascending: false })
    .limit(100);
  if (q.error) return NextResponse.json({ error: q.error.message }, { status: 500 });
  return NextResponse.json({ publications: q.data || [] });
}
