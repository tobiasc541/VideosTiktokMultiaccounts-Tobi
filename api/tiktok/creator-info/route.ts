import { NextResponse } from "next/server";
import { isLoggedIn } from "../../../../lib/auth";
import { creatorInfo } from "../../../../lib/tiktok";

export async function GET(req: Request) {
  if (!(await isLoggedIn())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("accountId");
  if (!id) return NextResponse.json({ error: "Falta accountId" }, { status: 400 });

  try {
    return NextResponse.json(await creatorInfo(id));
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error TikTok" }, { status: 500 });
  }
}
