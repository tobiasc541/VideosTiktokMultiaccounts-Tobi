import Link from "next/link";
import { redirect } from "next/navigation";
import { isLoggedIn } from "../../lib/auth";
import "./landing.css";
import "./landing-polish.css";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; admin?: string; verified?: string }> }) {
  if (await isLoggedIn()) redirect("/");
  const q = await searchParams;
  const adminMode = q.admin === "1";

  return (
    <main className="vyralPublicPage">
      <div className="loginExperience" id="inicio">
        <div className="loginGlow loginGlowOne" /><div className="loginGlow loginGlowTwo" /><div className="loginGrid" /><div className="vyralScanline" />
        <section className="loginHero" aria-label="VYRAL">
          <div className="vyralWordmark" aria-label="VYRAL">V<span>Y</span>RAL</div>
          <div className="loginHeroCopy">
            <div className="loginEyebrow"><span>CREÁ</span><i /><span>DISTRIBUÍ</span><i /><span>CRECÉ</span></div>
            <h1 className="loginHeadline">Publicá una vez.<br/><span>Convertí tiempo en</span><br/><em>más oportunidades.</em></h1>
            <p className="loginLead">Un solo flujo para llevar tu contenido a todas tus cuentas. Menos tareas repetitivas, más tiempo para crear, vender y hacer crecer tu negocio.</p>
            <div className="loginStats"><div className="loginStat"><strong>01</strong><span>Video</span></div><div className="loginStatDivider"/><div className="loginStat"><strong>∞</strong><span>Oportunidades</span></div><div className="loginStatDivider"/><div className="loginStat"><strong>1</strong><span>Dashboard</span></div></div>
          </div>
          <div className="loginHeroFooter"><div className="poweredBy"><span>Powered by</span><strong>Tobias Carrizo</strong></div><a className="vyralScrollCue" href="#producto" aria-label="Descubrir VYRAL"><span>DESCUBRÍ VYRAL</span><i>↓</i></a></div>
        </section>
        <section className="loginAccess"><div className="loginAccessInner"><div className="loginMobileBrand">VYRAL</div><div className="loginCardHeading"><span className="loginMiniLabel">{adminMode ? "ACCESO INTERNO" : "TU CUENTA VYRAL"}</span><h2>{adminMode ? "Acceso interno." : "Bienvenido."}</h2><p>{adminMode ? "Ingresá con la clave administrativa." : "Ingresá para continuar con tu operación."}</p></div>
          {q.verified === "1" && !adminMode && <div className="loginSuccessBox">Correo verificado. Ya podés ingresar a tu cuenta.</div>}
          {adminMode ? (
            <form className="loginForm" action="/api/login" method="post">{q.error && <div className="errorBox">La contraseña ingresada es incorrecta.</div>}<div><label className="loginLabel" htmlFor="password">Contraseña</label><div className="loginFieldWrap"><input id="password" className="loginField" type="password" name="password" placeholder="Ingresá tu contraseña" autoComplete="current-password" autoFocus required/><span className="loginFieldIcon">→</span></div></div><button className="loginButton" type="submit"><span>Ingresar al dashboard</span><span className="loginButtonArrow">↗</span></button></form>
          ) : (
            <form className="loginForm" action="/api/account/login" method="post">
              {q.error === "account" && <div className="errorBox">El correo o la contraseña no son correctos.</div>}
              {q.error === "unverified" && <div className="errorBox">Primero tenés que verificar tu correo.</div>}
              <div><label className="loginLabel" htmlFor="email">Correo electrónico</label><div className="loginFieldWrap"><input id="email" className="loginField" type="email" name="email" placeholder="vos@empresa.com" autoComplete="email" required/><span className="loginFieldIcon">@</span></div></div>
              <div><label className="loginLabel" htmlFor="password">Contraseña</label><div className="loginFieldWrap"><input id="password" className="loginField" type="password" name="password" placeholder="Ingresá tu contraseña" autoComplete="current-password" required/><span className="loginFieldIcon">→</span></div></div>
              <button className="loginButton" type="submit"><span>Ingresar a VYRAL</span><span className="loginButtonArrow">↗</span></button>
            </form>
          )}
          {!adminMode && <div className="loginSignup"><span>¿Todavía no tenés cuenta?</span><Link href="/registro">Registrate en VYRAL →</Link><div><i>01</i><b>Creá tu cuenta</b><i>02</i><b>Verificá tu cuenta</b><i>03</i><b>Seleccioná tu plan</b><i>04</i><b>Disfrutá de la viralidad</b></div></div>}
          <div className="loginSecurity"><span className="loginSecurityIcon">◆</span><div><strong>Acceso protegido</strong><p>Tu panel y tus cuentas permanecen en un entorno privado.</p></div></div>
          <div className="loginLegal">{adminMode ? <Link href="/login">Volver</Link> : <Link href="/login?admin=1">Acceso interno</Link>}<span>·</span><Link href="/terms">Términos</Link><span>·</span><Link href="/privacy">Privacidad</Link></div>
        </div></section>
      </div>

      <section className="vyralTicker" aria-label="Capacidades de VYRAL"><div className="vyralTickerTrack"><span>MULTICUENTA</span><i>◆</i><span>UN SOLO FLUJO</span><i>◆</i><span>ANALYTICS</span><i>◆</i><span>VYRAL AI</span><i>◆</i><span>DISTRIBUCIÓN</span><i>◆</i><span>MULTICUENTA</span><i>◆</i><span>UN SOLO FLUJO</span><i>◆</i><span>ANALYTICS</span><i>◆</i><span>VYRAL AI</span><i>◆</i><span>DISTRIBUCIÓN</span><i>◆</i></div></section>

      <section className="vyralSection vyralIntro" id="producto"><div className="vyralSectionIndex">01 / EL SISTEMA</div><div className="vyralIntroGrid"><div><div className="vyralKicker">MENOS REPETICIÓN. MÁS DISTRIBUCIÓN.</div><h2>Una publicación.<br/><em>Todo tu ecosistema.</em></h2></div><div className="vyralIntroCopy"><p>VYRAL transforma un proceso repetitivo en una sola acción. Preparás una vez, elegís tu red de cuentas y distribuís desde un mismo lugar.</p><div className="vyralMicroStats"><span><b>01</b> carga</span><span><b>N</b> cuentas</span><span><b>∞</b> escala</span></div></div></div></section>

      <section className="vyralSection vyralNetworkSection">
        <div className="vyralNetworkCopy"><div className="vyralSectionIndex">02 / MULTICUENTA</div><div className="vyralKicker">DISTRIBUCIÓN CENTRALIZADA</div><h2>Un video entra.<br/><em>Tu red se activa.</em></h2><p>Seleccioná las cuentas que quieras. VYRAL organiza el flujo y ejecuta cada publicación desde un solo dashboard.</p><div className="vyralFeaturePills"><span>Selección múltiple</span><span>Privacidad por TikTok</span><span>Estado por cuenta</span></div></div>
        <div className="vyralNetworkVisual" aria-label="Ejemplo visual de distribución multicuentas">
          <div className="vyralOrbit orbitOne"/><div className="vyralOrbit orbitTwo"/><div className="vyralPulse"/><div className="vyralOrbitDot dot1"/><div className="vyralOrbitDot dot2"/><div className="vyralOrbitDot dot3"/>
          <div className="vyralTechThread thread1"><i/><i/><i/></div><div className="vyralTechThread thread2"><i/><i/><i/></div><div className="vyralTechThread thread3"><i/><i/><i/></div><div className="vyralTechThread thread4"><i/><i/><i/></div>
          <div className="vyralPhoneCore">
            <div className="vyralPhoneSpeaker"/><div className="vyralPhoneScreen">
              <video autoPlay muted loop playsInline preload="auto" aria-label="Video de demostración VYRAL" src="/ScreenRecording_09-13-2026%2019-08-49_1.mp4"/>
              <div className="vyralVideoShade"/><div className="vyralVideoBottom"><span>01 VIDEO</span><strong>04 DESTINOS</strong></div>
            </div><div className="vyralPhoneButton"/>
          </div>
          <div className="vyralNode node1"><i>01</i><b>@tobi.main</b><span>PUBLICADO</span></div><div className="vyralNode node2"><i>02</i><b>@tobi.media</b><span>PUBLICADO</span></div><div className="vyralNode node3"><i>03</i><b>@tobi.lab</b><span>PUBLICADO</span></div><div className="vyralNode node4"><i>04</i><b>@tobi.clips</b><span>PUBLICADO</span></div>
        </div>
      </section>

      <section className="vyralSection vyralStepsSection"><div className="vyralSectionIndex">03 / FLUJO</div><div className="vyralStepsHead"><div><div className="vyralKicker">DE CERO A PUBLICADO</div><h2>Cuatro pasos.<br/><em>Cero caos.</em></h2></div><p>Todo lo importante vive dentro del mismo recorrido. Sin saltar entre cuentas. Sin repetir el mismo trabajo.</p></div><div className="vyralSteps"><article><span>01</span><div className="vyralStepIcon">＋</div><h3>Conectá</h3><p>Sumá las cuentas que forman tu red.</p></article><article><span>02</span><div className="vyralStepIcon">▶</div><h3>Prepará</h3><p>Subí el video y definí su publicación.</p></article><article><span>03</span><div className="vyralStepIcon">⌁</div><h3>Distribuí</h3><p>Elegí múltiples destinos y lanzá.</p></article><article><span>04</span><div className="vyralStepIcon">↗</div><h3>Medí</h3><p>Leé el impacto conjunto de toda la red.</p></article></div></section>

      <section className="vyralSection vyralAnalyticsSection"><div className="vyralAnalyticsMock"><div className="mockTop"><div><small>VYRAL / ANALYTICS</small><strong>Rendimiento de red</strong></div><span>30 DÍAS</span></div><div className="mockMetrics"><div><small>VISTAS</small><b>284.750</b><em>+18,4%</em></div><div><small>ME GUSTA</small><b>31.420</b><em>+11,2%</em></div><div><small>ALCANCE EXTRA</small><b>+192%</b><em>VYRAL</em></div></div><div className="mockChart"><i style={{height:"24%"}}/><i style={{height:"38%"}}/><i style={{height:"31%"}}/><i style={{height:"49%"}}/><i style={{height:"57%"}}/><i style={{height:"52%"}}/><i style={{height:"68%"}}/><i style={{height:"62%"}}/><i style={{height:"78%"}}/><i style={{height:"72%"}}/><i style={{height:"91%"}}/><i style={{height:"84%"}}/><i style={{height:"100%"}}/><i style={{height:"92%"}}/></div><div className="mockSweep"/></div><div className="vyralAnalyticsCopy"><div className="vyralSectionIndex">04 / ANALYTICS</div><div className="vyralKicker">TODO EN UNA SOLA LECTURA</div><h2>No mires cuentas.<br/><em>Mirá el impacto.</em></h2><p>Entendé vistas, interacción, crecimiento y el alcance adicional que genera distribuir el mismo contenido en múltiples cuentas.</p><div className="vyralMetricLine"><span>Mejor cuenta individual</span><b>118.400</b></div><div className="vyralMetricLine accent"><span>Vistas adicionales por distribución</span><b>+166.350</b></div></div></section>

      <section className="vyralSection vyralAiSection"><div className="vyralAiAura"/><div className="vyralAiCopy"><div className="vyralSectionIndex">05 / VYRAL AI</div><div className="vyralKicker">LA PRÓXIMA CAPA</div><h2>Tu descripción,<br/><em>pensada para rendir.</em></h2><p className="vyralAiLead">VYRAL AI va a ayudarte a transformar una idea simple en distintas versiones de caption listas para publicar.</p><div className="vyralAiMiniStats"><span>03 estilos</span><span>01 click</span><span>∞ variantes</span></div></div><div className="vyralAiCard"><div className="aiCardTop"><span>✦ VYRAL AI</span><i>GENERANDO</i></div><div className="aiPrompt">Quiero una descripción corta, directa y con potencial viral para un video de producto.</div><div className="aiAnswer"><span className="aiCursor">|</span><p>Tu próximo favorito acaba de aparecer. Mirá hasta el final y decime si vos también lo usarías. ✦</p><div><b>#parati</b><b>#viral</b><b>#tiktok</b></div></div><div className="aiVariants"><span>VIRAL</span><span>COMERCIAL</span><span>NATURAL</span></div></div></section>

      <section className="vyralSection vyralFinal"><div className="vyralFinalGrid"/><div className="vyralFinalMark">V<span>Y</span>RAL</div><div className="vyralKicker">CREÁ — DISTRIBUÍ — CRECÉ</div><h2>Un solo lugar.<br/><em>Mucho más alcance.</em></h2><p>Centralizá tu operación y convertí cada publicación en una oportunidad de multiplicar tu presencia.</p><Link href="/registro" className="vyralFinalCta">Crear mi cuenta <span>↗</span></Link></section>
      <footer className="vyralFooter"><div className="vyralFooterBrand">V<span>Y</span>RAL</div><p>Sistema de distribución de contenido</p><div><Link href="/terms">Términos</Link><Link href="/privacy">Privacidad</Link></div></footer>
    </main>
  );
}
