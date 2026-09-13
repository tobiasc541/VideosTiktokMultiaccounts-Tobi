import { NextResponse } from "next/server";
import { isLoggedIn } from "../../../../lib/auth";
import { initVideoPost } from "../../../../lib/tiktok";

export async function POST(req: Request) {
  if (!(await isLoggedIn())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const body = await req.json();
    if (!body.accountId || !body.caption || !body.privacyLevel || !body.videoSize) {
      return NextResponse.json({ error: "Faltan datos de publicación." }, { status: 400 });
    }

    const result = await initVideoPost({
      accountId: body.accountId,
      caption: String(body.caption),
      privacyLevel: String(body.privacyLevel),
      videoSize: Number(body.videoSize)
    });

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error TikTok" }, { status: 500 });
  }
}
