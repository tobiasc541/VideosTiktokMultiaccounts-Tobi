import Link from "next/link";
import "../legal.css";

export const metadata = {
  title: "Política de Privacidad | VYRAL",
  description: "Política de Privacidad de VYRAL."
};

export default function PrivacyPage() {
  return (
    <main className="vyralLegalPage">
      <div className="vyralLegalGlow" />
      <div className="vyralLegalWrap">
        <nav className="vyralLegalNav">
          <Link href="/login" className="vyralLegalBrand">V<span>Y</span>RAL</Link>
          <Link href="/login" className="vyralLegalExit">← Salir</Link>
        </nav>

        <header className="vyralLegalHero">
          <small>PRIVACIDAD / VYRAL</small>
          <h1>Política de<br/><em>Privacidad.</em></h1>
          <p>Qué información utiliza VYRAL, para qué la necesita y cómo protegemos tu operación.</p>\n          <p><strong>VYRAL es operado por TOBIAS CARRIZO TRADING LLC, una limited liability company constituida en New Mexico, Estados Unidos.</strong></p>
          <div className="vyralLegalMeta"><span>Última actualización</span><strong>13 de septiembre de 2026</strong></div>
        </header>

        <section className="vyralLegalContent">
          <article><span>01</span><div><h2>Información que procesamos</h2><p>Al crear una cuenta o conectar plataformas compatibles, VYRAL puede procesar datos básicos de perfil, identificadores de cuenta, permisos y tokens de autorización. También procesamos el contenido, descripciones, configuraciones e instrucciones que enviás voluntariamente mediante el dashboard.</p></div></article>
          <article><span>02</span><div><h2>Cómo utilizamos la información</h2><p>La información se utiliza para autenticar tu cuenta, mostrar las cuentas conectadas, ejecutar las funciones que solicitás, procesar publicaciones autorizadas, mantener el servicio, mejorar su funcionamiento, prevenir abusos y resolver problemas técnicos.</p></div></article>
          <article><span>03</span><div><h2>Autorización de TikTok y otras plataformas</h2><p>Las conexiones se realizan mediante los flujos oficiales de autorización disponibles. VYRAL no solicita ni almacena tu contraseña de TikTok. El acceso queda limitado a los permisos que autorices expresamente y puede ser revocado mediante los controles disponibles en cada plataforma.</p></div></article>
          <article><span>04</span><div><h2>Proveedores del servicio</h2><p>Para operar VYRAL podemos utilizar proveedores externos de infraestructura, bases de datos, autenticación, correo electrónico, pagos y APIs de redes sociales. Estos proveedores pueden procesar la información técnica necesaria para prestar sus servicios y se rigen por sus propias políticas.</p></div></article>
          <article><span>05</span><div><h2>Compartir información</h2><p>No vendemos tu información personal. Los datos solo se comparten cuando es necesario para ejecutar funciones solicitadas, operar VYRAL, cumplir obligaciones legales, proteger el servicio y sus usuarios o comunicarnos con una plataforma que vos hayas conectado.</p></div></article>
          <article><span>06</span><div><h2>Conservación y seguridad</h2><p>Conservamos la información durante el tiempo razonablemente necesario para prestar el servicio, cumplir obligaciones aplicables y mantener la seguridad de la plataforma. Aplicamos medidas técnicas y organizativas razonables, aunque ningún servicio conectado a Internet puede garantizar seguridad absoluta.</p></div></article>
          <article><span>07</span><div><h2>Tus decisiones y control</h2><p>Vos decidís qué cuentas conectar, qué contenido publicar y qué permisos conceder. Podés revocar permisos desde las plataformas correspondientes y dejar de utilizar VYRAL cuando quieras, sujeto a las condiciones de tu suscripción.</p></div></article>
          <article><span>08</span><div><h2>Menores de edad</h2><p>VYRAL no está dirigido a menores que no estén habilitados legalmente para utilizar las plataformas conectadas o aceptar estas condiciones. El usuario debe cumplir los requisitos de edad y autorización establecidos por la legislación y por cada servicio externo.</p></div></article>
          <article><span>09</span><div><h2>Cambios en esta política</h2><p>Esta política puede actualizarse a medida que VYRAL incorpore funciones, integraciones o nuevos requisitos legales. La fecha indicada al comienzo de esta página identifica la versión vigente.</p></div></article>
          <article><span>10</span><div><h2>Contacto</h2><p>Las consultas o solicitudes relacionadas con privacidad pueden dirigirse al equipo responsable de VYRAL mediante los canales de contacto habilitados por el servicio.</p></div></article>
        </section>

        <footer className="vyralLegalFooter">
          <div className="vyralLegalPowered"><span>OPERADO POR</span><strong>TOBIAS CARRIZO TRADING LLC</strong><small>1209 Mountain Road Pl NE, Ste R, Albuquerque, NM 87110, United States</small></div>
          <div><Link href="/terms">Términos y condiciones</Link><Link href="/login">Volver al login</Link></div>
        </footer>
      </div>
    </main>
  );
}
