import { redirect } from "next/navigation";
import { getCustomerSession } from "../../lib/auth";
import "../registro/auth-flow.css";

const plans = [
  {
    id: "inicio",
    name: "Inicio",
    price: "US$ 1",
    cadence: "/ mes",
    accounts: "Hasta 2 cuentas",
    description: "Para probar VYRAL y centralizar publicaciones sin funciones avanzadas.",
    features: [
      "Hasta 2 cuentas conectadas",
      "Publicación multicuentas",
      "Panel centralizado",
      "Historial de publicaciones"
    ],
    unavailable: ["Sin Analytics", "Sin VYRAL AI"]
  },
  {
    id: "pro",
    name: "Crecimiento",
    price: "US$ 9,99",
    cadence: "/ mes",
    accounts: "Hasta 5 cuentas",
    description: "Para creadores y negocios que quieren multiplicar alcance y medir lo que funciona.",
    features: [
      "Hasta 5 cuentas conectadas",
      "Publicación multicuentas",
      "Analytics unificados",
      "VYRAL AI",
      "Historial completo"
    ],
    unavailable: [],
    featured: true
  },
  {
    id: "escala",
    name: "Escala",
    price: "US$ 19,99",
    cadence: "/ mes",
    accounts: "Hasta 10 cuentas",
    description: "Para operaciones que quieren maximizar distribución, volumen y oportunidades de crecimiento.",
    features: [
      "Hasta 10 cuentas conectadas",
      "Publicación multicuentas",
      "Analytics unificados",
      "VYRAL AI",
      "Historial completo",
      "Prioridad en nuevas funciones"
    ],
    unavailable: []
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
        </header>
        {q.error && <div className="vyralAuthError" style={{maxWidth:600,margin:"0 auto 18px",textAlign:"center"}}>No pudimos guardar el plan. Probá nuevamente.</div>}
        <section className="vyralPlanGrid">
          {plans.map((plan) => (
            <article className={`vyralPlanCard${plan.featured ? " featured" : ""}`} key={plan.id}>
              {plan.featured && <div className="vyralPlanBadge">MÁS ELEGIDO</div>}
              <small>PLAN VYRAL</small>
              <h2>{plan.name}</h2>
              <div className="vyralPlanPrice"><strong>{plan.price}</strong><span>{plan.cadence}</span></div>
              <div className="vyralPlanAccounts">{plan.accounts}</div>
              <p>{plan.description}</p>
              <div className="vyralPlanFeatures">
                {plan.features.map((feature) => <span key={feature}>{feature}</span>)}
                {plan.unavailable.map((feature) => <span className="off" key={feature}>{feature}</span>)}
              </div>
              <form action="/api/account/plan" method="post">
                <input type="hidden" name="plan" value={plan.id} />
                <button type="submit">Elegir {plan.name} →</button>
              </form>
            </article>
          ))}
        </section>
        <p className="vyralPlansNote"><b>Facturación mensual.</b> La selección de plan ya queda asociada a tu cuenta; el cobro online se conectará en el siguiente paso.</p>
      </div>
    </main>
  );
}
