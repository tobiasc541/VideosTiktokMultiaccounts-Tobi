import Link from "next/link";
import "../legal.css";

export const metadata = {
  title: "Términos y Condiciones | VYRAL",
  description: "Términos y Condiciones de uso de VYRAL."
};

export default function TermsPage() {
  return (
    <main className="vyralLegalPage">
      <div className="vyralLegalGlow" />
      <div className="vyralLegalWrap">
        <nav className="vyralLegalNav">
          <Link href="/login" className="vyralLegalBrand">V<span>Y</span>RAL</Link>
          <Link href="/login" className="vyralLegalExit">← Salir</Link>
        </nav>

        <header className="vyralLegalHero">
          <small>LEGAL / VYRAL</small>
          <h1>Términos y<br/><em>Condiciones.</em></h1>
          <p>Las reglas que mantienen VYRAL simple, seguro y transparente para todos.</p>
          <div className="vyralLegalMeta"><span>Última actualización</span><strong>13 de septiembre de 2026</strong></div>
        </header>

        <section className="vyralLegalContent">
          <article><span>01</span><div><h2>Sobre VYRAL</h2><p>VYRAL es una plataforma web que permite a usuarios autorizados conectar sus propias cuentas de redes sociales compatibles, preparar contenido y distribuirlo desde un flujo centralizado mediante las herramientas y APIs oficiales disponibles.</p></div></article>
          <article><span>02</span><div><h2>Tu cuenta y autorización</h2><p>Solo podés conectar cuentas que sean de tu propiedad o que estés autorizado a administrar. Las autorizaciones de plataformas externas se realizan mediante sus mecanismos oficiales. VYRAL no solicita ni almacena las contraseñas de tus cuentas de TikTok.</p></div></article>
          <article><span>03</span><div><h2>Tu contenido</h2><p>Sos responsable por los videos, textos, hashtags, marcas, música y cualquier otro material que publiques mediante VYRAL. Debés contar con los derechos y permisos necesarios y cumplir la legislación aplicable y las normas de cada plataforma.</p></div></article>
          <article><span>04</span><div><h2>Uso permitido</h2><p>No está permitido utilizar VYRAL para actividades ilegales, acceso no autorizado a cuentas de terceros, spam, suplantación de identidad, infracciones de propiedad intelectual, distribución de software malicioso o intentos de eludir restricciones y medidas de seguridad.</p></div></article>
          <article><span>05</span><div><h2>Planes, pagos y suscripciones</h2><p>Los planes pagos se facturan según el precio y la periodicidad informados al momento de la contratación. Las funciones y límites disponibles dependen del plan activo. Los pagos pueden ser procesados por proveedores externos sujetos a sus propios términos.</p></div></article>
          <article><span>06</span><div><h2>Servicios de terceros</h2><p>VYRAL depende de servicios externos para funciones como autenticación, infraestructura, almacenamiento, pagos y publicación. Algunas funciones pueden cambiar, demorarse o dejar de estar disponibles si dichos proveedores modifican sus APIs, permisos, políticas o disponibilidad.</p></div></article>
          <article><span>07</span><div><h2>Disponibilidad y resultados</h2><p>Trabajamos para mantener el servicio disponible y confiable, pero no garantizamos disponibilidad ininterrumpida ni el éxito de cada publicación. VYRAL tampoco garantiza una cantidad específica de vistas, alcance, interacción, seguidores, ventas o viralidad.</p></div></article>
          <article><span>08</span><div><h2>Suspensión o finalización</h2><p>El acceso podrá restringirse o finalizarse ante uso indebido, incumplimientos de estos términos, requerimientos legales o de plataformas externas, falta de pago o situaciones que generen riesgos de seguridad, legales u operativos.</p></div></article>
          <article><span>09</span><div><h2>Cambios en estos términos</h2><p>Podemos actualizar estos términos cuando evolucione VYRAL, cambien sus integraciones o existan nuevas exigencias legales. La fecha publicada en esta página identifica la versión vigente.</p></div></article>
          <article><span>10</span><div><h2>Contacto</h2><p>Las consultas relacionadas con estos términos pueden dirigirse al equipo responsable de VYRAL mediante los canales de contacto habilitados por el servicio.</p></div></article>
        </section>

        <footer className="vyralLegalFooter">
          <div className="vyralLegalPowered"><span>POWERED BY</span><strong>Tobias Carrizo</strong></div>
          <div><Link href="/privacy">Política de privacidad</Link><Link href="/login">Volver al login</Link></div>
        </footer>
      </div>
    </main>
  );
}
