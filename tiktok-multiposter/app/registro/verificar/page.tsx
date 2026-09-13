import Link from "next/link";
import "../auth-flow.css";

export default async function VerifyPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const q = await searchParams;
  const email = q.email || "tu correo";
  return (
    <main className="vyralAuthPage">
      <section className="vyralAuthShell">
        <aside className="vyralAuthAside">
          <div className="vyralAuthBrand">V<span>Y</span>RAL</div>
          <div><h1>Un paso más.<em>Confirmá que sos vos.</em></h1><p>La verificación protege tu cuenta y deja preparado tu acceso antes de elegir el plan.</p></div>
          <div className="vyralAuthSteps"><span>01 Cuenta</span><span className="active">02 Verificación</span><span>03 Plan</span></div>
        </aside>
        <div className="vyralAuthCard">
          <div className="vyralVerifyIcon">✉</div>
          <div className="vyralAuthCardHead"><small>VERIFICACIÓN DE CORREO</small><h2>Revisá tu bandeja.</h2><p>Te enviamos un correo de confirmación a <strong>{email}</strong>. Abrilo y confirmá tu cuenta para continuar.</p></div>
          <div className="vyralAuthSuccess">Cuando confirmes el correo, vas a volver a VYRAL y podrás iniciar sesión para elegir tu plan.</div>
          <Link className="vyralAuthButton" style={{textDecoration:"none",marginTop:18}} href="/login"><span>Ir a iniciar sesión</span><span>↗</span></Link>
          <p className="vyralAuthFine" style={{marginTop:18}}>Si no lo ves, revisá Spam o Correo no deseado. El remitente será el servicio de autenticación configurado para VYRAL.</p>
        </div>
      </section>
    </main>
  );
}
