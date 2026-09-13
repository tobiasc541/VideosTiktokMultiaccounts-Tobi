import { redirect } from "next/navigation";
import { getCustomerSession } from "../../lib/auth";
import "../registro/auth-flow.css";

const plans = [
  {
    id: "inicio",
    name: "Inicio",
    description: "Para empezar a centralizar tu distribución y trabajar desde un solo lugar.",
    features: ["Publicación multicuentas", "Panel centralizado", "Historial de publicaciones"]
  },
  {
    id: "pro",
    name: "Pro",
    description: "Para creadores y negocios que publican con frecuencia y quieren operar con más velocidad.",
    features: ["Todo lo de Inicio", "Analytics unificados", "VYRAL AI", "Flujo prioritario"],
    featured: true
  },
  {
    id: "escala",
    name: "Escala",
    description: "Para operaciones con múltiples marcas, equipos o un volumen de publicación más alto.",
    features: ["Todo lo de Pro", "Operación de mayor volumen", "Soporte prioritario", "Funciones avanzadas"]
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
          <h1>Elegí cómo querés crecer.</h1>
          <p>Tu cuenta ya está lista. Seleccioná el nivel que mejor acompañe tu operación. Los precios y la facturación se incorporarán en la siguiente etapa.</p>
        </header>
        {q.error && <div className="vyralAuthError" style={{maxWidth:600,margin:"0 auto 18px",textAlign:"center"}}>No pudimos guardar el plan. Probá nuevamente.</div>}
        <section className="vyralPlanGrid">
          {plans.map((plan) => (
            <article className={`vyralPlanCard${plan.featured ? " featured" : ""}`} key={plan.id}>
              {plan.featured && <div className="vyralPlanBadge">RECOMENDADO</div>}
              <small>PLAN VYRAL</small>
              <h2>{plan.name}</h2>
              <p>{plan.description}</p>
              <div className="vyralPlanFeatures">{plan.features.map((feature) => <span key={feature}>{feature}</span>)}</div>
              <form action="/api/account/plan" method="post">
                <input type="hidden" name="plan" value={plan.id} />
                <button type="submit">Elegir {plan.name} →</button>
              </form>
            </article>
          ))}
        </section>
        <p className="vyralPlansNote"><b>Sin cobro en este paso.</b> Primero estamos dejando listo el recorrido de cuenta, verificación y selección de plan.</p>
      </div>
    </main>
  );
}
