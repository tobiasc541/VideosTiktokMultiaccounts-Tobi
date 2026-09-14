"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import "../registro/auth-flow.css";

export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const accessToken = hash.get("access_token") || query.get("access_token") || query.get("token") || "";
    setToken(accessToken);
    setInvalid(!accessToken);
  }, []);

  return (
    <main className="vyralAuthPage">
      <section className="vyralAuthShell">
        <aside className="vyralAuthAside">
          <div className="vyralAuthBrand">V<span>Y</span>RAL</div>
          <div>
            <h1>Nueva contraseña.<em>Nuevo acceso.</em></h1>
            <p>Elegí una contraseña nueva para recuperar tu cuenta y volver a VYRAL.</p>
          </div>
          <div className="vyralAuthSteps"><span>01 Correo</span><span>02 Enlace seguro</span><span className="active">03 Nueva contraseña</span></div>
        </aside>
        <div className="vyralAuthCard">
          <div className="vyralAuthCardHead"><small>RESTABLECER ACCESO</small><h2>Creá tu nueva contraseña.</h2><p>Usá al menos 8 caracteres.</p></div>
          {invalid ? (
            <>
              <div className="vyralAuthError">Este enlace de recuperación no es válido o ya venció. Pedí uno nuevo para continuar.</div>
              <Link className="vyralAuthBack" href="/olvide-contrasena">← Pedir un nuevo enlace</Link>
            </>
          ) : (
            <form className="vyralAuthForm" action="/api/account/reset-password" method="post">
              <input type="hidden" name="accessToken" value={token} />
              <div className="vyralAuthGrid">
                <div className="vyralAuthField"><label htmlFor="password">Nueva contraseña</label><input id="password" name="password" type="password" placeholder="Mínimo 8 caracteres" autoComplete="new-password" minLength={8} required /></div>
                <div className="vyralAuthField"><label htmlFor="confirmPassword">Repetir contraseña</label><input id="confirmPassword" name="confirmPassword" type="password" placeholder="Repetí tu contraseña" autoComplete="new-password" minLength={8} required /></div>
              </div>
              <button className="vyralAuthButton" type="submit"><span>Guardar nueva contraseña</span><span>↗</span></button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
