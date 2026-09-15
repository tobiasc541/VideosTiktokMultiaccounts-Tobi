import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../lib/auth";
import { deleteOwnedTikTokAccount, listOwnedTikTokAccounts } from "../../../../lib/tiktok-ownership";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    return NextResponse.json({ accounts: await listOwnedTikTokAccounts(session.userId) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "No se pudieron leer las cuentas." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });
  try {
    await deleteOwnedTikTokAccount(session.userId, id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "No se pudo eliminar la cuenta." }, { status: 403 });
  }
}
