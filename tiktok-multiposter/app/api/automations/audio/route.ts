import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/auth";
import { supabaseAdmin } from "../../../../lib/supabase-admin";

export const maxDuration = 60;
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

export async function POST(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const form = await req.formData();
    const file = form.get("audio");
    if (!(file instanceof File)) return NextResponse.json({ error: "No se recibió el audio." }, { status: 400 });
    if (file.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: "El audio es demasiado largo. Grabá un mensaje más corto." }, { status: 413 });
    const ext = file.type.includes("mp4") ? "m4a" : file.type.includes("ogg") ? "ogg" : "webm";
    const path = `automation-audio/${session.userId}/${crypto.randomUUID()}.${ext}`;
    const client = supabaseAdmin();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error } = await client.storage.from("scheduled-media").upload(path, bytes, { contentType: file.type || "audio/webm", upsert: false });
    if (error) throw error;
    return NextResponse.json({ ok: true, path, name: `Audio VYRAL.${ext}` });
  } catch (e: any) {
    console.error("[VYRAL Voice][admin] upload failure", e?.message || e);
    return NextResponse.json({ error: "No pudimos guardar el audio en este momento. Intentá nuevamente." }, { status: 500 });
  }
}
