import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerSession } from "../../lib/auth";
import FaqAssistant from "./FaqAssistant";
import "./faq.css";

export default async function HelpPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/login");
  return (
    <main className="faqPage">
      <section className="faqShell">
        <header className="faqTop"><div><div className="faqBrand">V<span>Y</span>RAL</div><small>CENTRO DE AYUDA</small></div><Link href="/">← Volver al panel</Link></header>
        <div className="faqHero"><span>RESPUESTA INSTANTÁNEA</span><h1>Preguntá primero.<br/><em>Escalá cuando haga falta.</em></h1><p>VYRAL Help responde al instante las dudas básicas. Si no alcanza, pasás a Soporte 24/7 con un agente.</p></div>
        <FaqAssistant />
      </section>
    </main>
  );
}
