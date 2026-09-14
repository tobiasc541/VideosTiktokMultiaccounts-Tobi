import Link from "next/link";
import "../registro/auth-flow.css";

export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ sent?: string; email?: string; error?: string }> }) {
  const q = await searchParams;
  return (
    <main className="vyralAuthPage">
      <section className="vyralAuthShell">
        <aside className="vyralAuthAside">
          <div className="vyralAuthBrand">V<span>Y</span>RAL</div>
          <div>
            <h1>Recuperá tu acceso.<em>Volvé a crear.</em></h1>
            <p>Ingresá el correo de tu cuenta y te enviaremos un enlace seguro para crear una nueva contraseña.</p>
          </div>
          <div className="vyralAuthSteps"><span className="active">01 Correo</span><span>02 Enlace seguro</span><span>03 Nueva contraseña</span></div>
        </aside>
        <div className="vyralAuthCard">
          <div className="vyralAuthCardHead"><small>RECUPERACIÓN DE CUENTA</small><h2>¿Olvidaste tu contraseña?</h2><p>Te mandamos el acceso de recuperación por correo.</p></div>
          {q.sent === "1" ? (
            <>
              <div className="vyralAuthSuccess">Si existe una cuenta asociada a <strong>{q.email || "ese correo"}</strong>, vas a recibir un email con el enlace para restablecer tu contraseña. Revisá también Spam.</div>
              <Link className="vyralAuthBack" href="/login">← Volver al login</Link>
            </>
          ) : (
            <>
              {q.error && <div className="vyralAuthError">Ingresá un correo válido para continuar.</div>}
              <form className="vyralAuthForm" action="/api/account/forgot-password" method="post">
                <div className="vyralAuthField"><label htmlFor="email">Correo electrónico</label><input id="email" name="email" type="email" placeholder="vos@empresa.com" autoComplete="email" required /></div>
                <button className="vyralAuthButton" type="submit"><span>Enviar enlace de recuperación</span><span>↗</span></button>
              </form>
              <Link className="vyralAuthBack" href="/login">← Recordé mi contraseña</Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
