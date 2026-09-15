import { NextResponse } from "next/server";
import { isLoggedIn } from "../../../../lib/auth";
import { deleteAccount, listAccounts } from "../../../../lib/tiktok";

export async function GET() {
  if (!(await isLoggedIn())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  try {
    const accounts = await listAccounts();
    return NextResponse.json({ accounts });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "No se pudieron leer las cuentas." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  if (!(await isLoggedIn())) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Falta id" }, { status: 400 });

  await deleteAccount(id);
  return NextResponse.json({ ok: true });
}
