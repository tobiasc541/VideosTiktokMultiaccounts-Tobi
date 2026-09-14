import { redirect } from "next/navigation";
import { getCustomerSession } from "../../lib/auth";
import "../registro/auth-flow.css";
import "./plans-polish.css";

const plans = [
  {
    id: "inicio",
    name: "Inicio",
    price: "US$ 1,99",
    cadence: "/ mes",
    accounts: "Hasta 2 cuentas",
    description: "Para empezar con VYRAL y centralizar publicaciones de forma simple.",
    features: ["Hasta 2 cuentas conectadas", "Publicación multicuentas", "Panel centralizado", "Historial de publicaciones"],
    unavailable: ["Sin Analytics", "Sin VYRAL AI"],
    checkout: "https://vyralmulticuentas.lemonsqueezy.com/checkout/buy/084513ad-2a9c-453a-ae56-1ee76c73bb40"
  },
  {
    id: "pro",
    name: "Crecimiento",
    price: "US$ 6,99",
    cadence: "/ mes",
    accounts: "Hasta 5 cuentas",
    description: "Para creadores y negocios que quieren multiplicar alcance y medir lo que funciona.",
    features: ["Hasta 5 cuentas conectadas", "Publicación multicuentas", "Analytics unificados", "VYRAL AI", "Historial completo"],
    unavailable: [], featured: true,
    checkout: "https://vyralmulticuentas.lemonsqueezy.com/checkout/buy/1637355e-15b2-49ca-8bd1-1d5137d8e30b"
  },
  {
    id: "escala",
    name: "Escala",
    price: "US$ 19,99",
    cadence: "/ mes",
    accounts: "Hasta 30 cuentas",
    description: "Para operaciones que quieren maximizar distribución, volumen y oportunidades de crecimiento.",
    features: ["Hasta 30 cuentas conectadas", "Publicación multicuentas", "Analytics unificados", "VYRAL AI", "Historial completo", "Prioridad en nuevas funciones"],
    unavailable: [],
    checkout: "https://vyralmulticuentas.lemonsqueezy.com/checkout/buy/fbf20548-29e5-40af-8627-b52224bb3ed8"
  }
];

export default async function PlansPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await getCustomerSession();
  if (!session) redirect("/login");
  const q = await searchParams;

  return (
    <main className="vyralPlansPage">
      <div className="vyralPlansWrap">
        <header className="vyralPlansTop">
          <div className="vyralAuthBrand">V<span>Y</span>RAL</div>
          <small>PASO 03 / PLAN</small>
          <h1>Elegí cuántas cuentas querés activar.</h1>
          <p>A más cuentas conectadas, más puntos de distribución para cada video. Podés empezar simple y escalar cuando lo necesites.</p>
          <div className="vyralPlansClaim">Hacerse viral nunca fue tan fácil.</div>
          <div className="vyralSocialCluster" aria-label="Redes compatibles">
            <span className="vyralSocialLine" />
            <div className="vyralSocialNode"><img src="/tiktok.png" alt="TikTok" /></div>
            <div className="vyralSocialNode"><img src="/instagram.png" alt="Instagram" /></div>
            <div className="vyralSocialNode"><img src="/facebook.png" alt="Facebook" /></div>
            <span className="vyralSocialLine" />
          </div>
        </header>
        {q.error && <div className="vyralAuthError" style={{maxWidth:600,margin:"0 auto 18px",textAlign:"center"}}>No pudimos iniciar el pago. Probá nuevamente.</div>}
        <section className="vyralPlanGrid">
          {plans.map((plan) => (
            <article className={`vyralPlanCard${plan.featured ? " featured" : ""}`} key={plan.id}>
              {plan.featured && <div className="vyralPlanBadge">MÁS ELEGIDO</div>}
              <small>PLAN VYRAL</small><h2>{plan.name}</h2>
              <div className="vyralPlanPrice"><strong>{plan.price}</strong><span>{plan.cadence}</span></div>
              <div className="vyralPlanAccounts">{plan.accounts}</div>
              <p>{plan.description}</p>
              <div className="vyralPlanFeatures">
                {plan.features.map((feature) => <span key={feature}>{feature}</span>)}
                {plan.unavailable.map((feature) => <span className="off" key={feature}>{feature}</span>)}
              </div>
              <a className="vyralPlanCheckout" href={plan.checkout}>Elegir {plan.name} →</a>
            </article>
          ))}
        </section>
        <footer className="vyralPlansTrust">
          <div className="vyralTrustLinks">
            <span className="vyralSecure">⌁ Pago seguro</span>
            <a href="/terms">Términos y condiciones</a>
            <span>·</span>
            <a href="/privacy">Política de privacidad</a>
          </div>
          <p>Facturación mensual. Tu plan se activa después de confirmar el pago.</p>
          <div className="vyralPlansPowered"><span>Powered by</span><strong>Tobias Carrizo</strong></div>
        </footer>
      </div>
    </main>
  );
}
