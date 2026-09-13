import { NextResponse } from "next/server";
import { isLoggedIn } from "../../../../lib/auth";
import { fetchPostStatus } from "../../../../lib/tiktok";

export async function GET(req: Request) {
  if (!(await isLoggedIn())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const url = new URL(req.url);
  const accountId = url.searchParams.get("accountId");
  const publishId = url.searchParams.get("publishId");
  if (!accountId || !publishId) {
    return NextResponse.json({ error: "Faltan parámetros." }, { status: 400 });
  }

  try {
    return NextResponse.json(await fetchPostStatus(accountId, publishId));
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error TikTok" }, { status: 500 });
  }
}
