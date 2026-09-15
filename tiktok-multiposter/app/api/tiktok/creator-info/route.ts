import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/auth";
import { creatorInfo } from "../../../../lib/tiktok";
import { assertTikTokAccountOwner } from "../../../../lib/tiktok-ownership";

export async function GET(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("accountId");
  if (!id) return NextResponse.json({ error: "Falta accountId" }, { status: 400 });
  try {
    await assertTikTokAccountOwner(session.userId, id);
    return NextResponse.json(await creatorInfo(id));
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Error TikTok" }, { status: 403 });
  }
}
