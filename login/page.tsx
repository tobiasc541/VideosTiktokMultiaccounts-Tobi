import { redirect } from "next/navigation";
import { isLoggedIn } from "../../lib/auth";

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>
}) {
  if (await isLoggedIn()) redirect("/");
  const q = await searchParams;

  return (
    <main className="loginWrap">
      <form className="panel login" action="/api/login" method="post">
        <div className="brand" style={{ marginBottom: 20 }}>
          <div className="logo">MP</div>
          Multi Poster
        </div>
        <h1>Entrar</h1>
        <p className="muted">Panel privado para tus cuentas de TikTok.</p>
        {q.error && <div className="errorBox">Contraseña incorrecta.</div>}
        <div style={{ height: 12 }} />
        <label className="label">Contraseña</label>
        <input className="field" type="password" name="password" autoFocus required />
        <div style={{ height: 14 }} />
        <button className="btn" type="submit" style={{ width: "100%" }}>
          Entrar
        </button>
      </form>
    </main>
  );
}
