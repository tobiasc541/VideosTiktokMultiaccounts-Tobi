import Link from "next/link";
import "./auth-flow.css";
import TurnstileField from "../components/TurnstileField";

const errors: Record<string, string> = {
  campos: "Completá todos los campos para continuar.",
  password: "La contraseña debe tener 12 caracteres como mínimo e incluir mayúscula, minúscula, número y símbolo.",
  captcha: "Completá la verificación de seguridad para continuar.",
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
            <p>Tu espacio en VYRAL empieza acá. Después verificás tu correo, seleccionás tu plan y entrás al panel.</p>
          </div>
          <div className="vyralAuthSteps"><span className="active">01 Creá tu cuenta</span><span>02 Verificá tu cuenta</span><span>03 Seleccioná tu plan</span><span>04 Disfrutá de la viralidad</span></div>
        </aside>
        <div className="vyralAuthCard">
          <div className="vyralAuthCardHead"><small>NUEVA CUENTA</small><h2>Registrate en VYRAL.</h2><p>Completá tus datos para crear tu acceso.</p></div>
          {q.error && <div className="vyralAuthError">{errors[q.error] || errors.registro}</div>}
          <form className="vyralAuthForm" action="/api/account/signup" method="post">
            <div className="vyralAuthField"><label htmlFor="name">Nombre</label><input id="name" name="name" type="text" placeholder="Tu nombre" autoComplete="name" required /></div>
            <div className="vyralAuthField"><label htmlFor="email">Correo electrónico</label><input id="email" name="email" type="email" placeholder="vos@empresa.com" autoComplete="email" required /></div>
            <div className="vyralAuthGrid">
              <div className="vyralAuthField"><label htmlFor="password">Contraseña</label><input id="password" name="password" type="password" placeholder="Mínimo 12 + mayúscula, número y símbolo" autoComplete="new-password" minLength={12} required /></div>
              <div className="vyralAuthField"><label htmlFor="confirmPassword">Repetir contraseña</label><input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repetí tu contraseña" autoComplete="new-password" minLength={12} required /></div>
            </div>
            <TurnstileField action="signup" />
            <label className="vyralAuthFine"><input type="checkbox" required /> Acepto los <Link href="/terms">Términos</Link> y la <Link href="/privacy">Política de privacidad</Link>.</label>
            <button className="vyralAuthButton" type="submit"><span>Crear mi cuenta</span><span>↗</span></button>
          </form>
          <Link className="vyralAuthBack" href="/login">← Ya tengo cuenta</Link>
        </div>
      </section>
    </main>
  );
}
