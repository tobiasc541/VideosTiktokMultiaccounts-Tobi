import Link from "next/link";
import "./auth-flow.css";

const errors: Record<string, string> = {
  campos: "Completá todos los campos para continuar.",
  password: "La contraseña debe tener al menos 8 caracteres.",
  coincidencia: "Las contraseñas no coinciden.",
  existe: "Ya existe una cuenta con ese correo. Probá iniciar sesión.",
  registro: "No pudimos crear la cuenta. Intentá nuevamente en unos minutos."
};

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const q = await searchParams;
  return (
    <main className="vyralAuthPage">
      <section className="vyralAuthShell">
        <aside className="vyralAuthAside">
          <div className="vyralAuthBrand">V<span>Y</span>RAL</div>
          <div>
            <h1>Creá tu cuenta.<em>Activá tu red.</em></h1>
            <p>Tu espacio en VYRAL empieza acá. Después verificás tu correo, elegís el plan y entrás al panel.</p>
          </div>
          <div className="vyralAuthSteps"><span className="active">01 Cuenta</span><span>02 Verificación</span><span>03 Plan</span></div>
        </aside>
        <div className="vyralAuthCard">
          <div className="vyralAuthCardHead"><small>NUEVA CUENTA</small><h2>Registrate en VYRAL.</h2><p>Completá tus datos para crear tu acceso.</p></div>
          {q.error && <div className="vyralAuthError">{errors[q.error] || errors.registro}</div>}
          <form className="vyralAuthForm" action="/api/account/signup" method="post">
            <div className="vyralAuthField"><label htmlFor="name">Nombre</label><input id="name" name="name" type="text" placeholder="Tu nombre" autoComplete="name" required /></div>
            <div className="vyralAuthField"><label htmlFor="email">Correo electrónico</label><input id="email" name="email" type="email" placeholder="vos@empresa.com" autoComplete="email" required /></div>
            <div className="vyralAuthGrid">
              <div className="vyralAuthField"><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password" minLength={8} required /></div>
              <div className="vyralAuthField"><label htmlFor="confirmPassword">Repetir contraseña</label><input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repetí tu contraseña" autoComplete="new-password" minLength={8} required /></div>
            </div>
            <label className="vyralAuthFine"><input type="checkbox" required /> Acepto los <Link href="/terms">Términos</Link> y la <Link href="/privacy">Política de privacidad</Link>.</label>
            <button className="vyralAuthButton" type="submit"><span>Crear mi cuenta</span><span>↗</span></button>
          </form>
          <Link className="vyralAuthBack" href="/login">← Ya tengo cuenta</Link>
        </div>
      </section>
    </main>
  );
}
