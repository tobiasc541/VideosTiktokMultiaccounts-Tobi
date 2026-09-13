import Link from "next/link";
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
    <main className="loginExperience">
      <div className="loginGlow loginGlowOne" />
      <div className="loginGlow loginGlowTwo" />
      <div className="loginGrid" />

      <section className="loginHero" aria-label="VYRAL">
        <div className="vyralWordmark" aria-label="VYRAL">
          V<span>Y</span>RAL
        </div>

        <div className="loginHeroCopy">
          <div className="loginEyebrow">
            <span>CREATE</span>
            <i />
            <span>DISTRIBUTE</span>
            <i />
            <span>GROW</span>
          </div>

          <h1 className="loginHeadline">
            Publicá una vez.
            <br />
            <span>Convertí tiempo en</span>
            <br />
            <em>más oportunidades.</em>
          </h1>

          <p className="loginLead">
            Un solo flujo para llevar tu contenido a todas tus cuentas. Menos tareas repetitivas,
            más tiempo para crear, vender y hacer crecer tu negocio.
          </p>

          <div className="loginStats">
            <div className="loginStat">
              <strong>01</strong>
              <span>Video</span>
            </div>
            <div className="loginStatDivider" />
            <div className="loginStat">
              <strong>∞</strong>
              <span>Oportunidades</span>
            </div>
            <div className="loginStatDivider" />
            <div className="loginStat">
              <strong>1</strong>
              <span>Dashboard</span>
            </div>
          </div>
        </div>

        <div className="loginHeroFooter">
          <div className="poweredBy">
            <span>Powered by</span>
            <strong>Tobias Carrizo</strong>
          </div>
        </div>
      </section>

      <section className="loginAccess">
        <div className="loginAccessInner">
          <div className="loginMobileBrand">VYRAL</div>

          <div className="loginCardHeading">
            <span className="loginMiniLabel">ACCESO PRIVADO</span>
            <h2>Bienvenido.</h2>
            <p>Ingresá a tu centro de publicación.</p>
          </div>

          <form className="loginForm" action="/api/login" method="post">
            {q.error && <div className="errorBox">La contraseña ingresada es incorrecta.</div>}

            <div>
              <label className="loginLabel" htmlFor="password">Contraseña</label>
              <div className="loginFieldWrap">
                <input
                  id="password"
                  className="loginField"
                  type="password"
                  name="password"
                  placeholder="Ingresá tu contraseña"
                  autoComplete="current-password"
                  autoFocus
                  required
                />
                <span className="loginFieldIcon">→</span>
              </div>
            </div>

            <button className="loginButton" type="submit">
              <span>Ingresar al dashboard</span>
              <span className="loginButtonArrow">↗</span>
            </button>
          </form>

          <div className="loginSecurity">
            <span className="loginSecurityIcon">◆</span>
            <div>
              <strong>Acceso protegido</strong>
              <p>Tu panel y tus cuentas permanecen en un entorno privado.</p>
            </div>
          </div>

          <div className="loginLegal">
            <Link href="/terms">Términos</Link>
            <span>·</span>
            <Link href="/privacy">Privacidad</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
