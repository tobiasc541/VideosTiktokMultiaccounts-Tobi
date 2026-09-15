import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/auth";
import { fetchPostStatus } from "../../../../lib/tiktok";
import { assertTikTokAccountOwner } from "../../../../lib/tiktok-ownership";

export async function GET(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const url = new URL(req.url);
  const accountId = url.searchParams.get("accountId");
  const publishId = url.searchParams.get("publishId");
  if (!accountId || !publishId) return NextResponse.json({ error: "Faltan parámetros." }, { status: 400 });
  try {
    await assertTikTokAccountOwner(session.userId, accountId);
    return NextResponse.json(await fetchPostStatus(accountId, publishId));
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error TikTok" }, { status: 403 });
  }
}
