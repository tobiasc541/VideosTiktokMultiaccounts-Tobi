import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerSession } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabase-admin";
import "./plan.css";

export const dynamic = "force-dynamic";

const planMap: Record<string, { name: string; price: string; accounts: string; features: string[] }> = {
  inicio: { name: "Inicio", price: "US$ 1,99 / mes", accounts: "Hasta 2 cuentas", features: ["Publicación multicuentas", "Panel centralizado", "Historial", "Soporte 24/7"] },
  pro: { name: "Crecimiento", price: "US$ 6,99 / mes", accounts: "Hasta 5 cuentas", features: ["Publicación multicuentas", "Analytics", "VYRAL AI", "Historial completo", "Soporte 24/7"] },
  escala: { name: "Escala", price: "US$ 19,99 / mes", accounts: "Hasta 30 cuentas", features: ["Publicación multicuentas", "Analytics", "VYRAL AI", "Historial completo", "Prioridad en nuevas funciones", "Soporte 24/7"] }
};

export default async function MyPlanPage({ searchParams }: { searchParams: Promise<{ cancel?: string }> }) {
  const session = await getCustomerSession();
  if (!session) redirect("/login");
  const q = await searchParams;

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(session.userId);
  const meta = data.user?.user_metadata || {};
  const planId = String(meta.plan || session.plan || "");
  const plan = planMap[planId];
  const periodEnd = meta.subscription_current_period_end || meta.current_period_end || null;
  const status = String(meta.subscription_status || (plan ? "active" : "none"));
  const cancelRequested = Boolean(meta.cancel_requested_at);

  return (
    <main className="myPlanPage">
      <div className="myPlanGlow" />
      <section className="myPlanShell">
        <header className="myPlanTop">
          <div><div className="myPlanBrand">V<span>Y</span>RAL</div><small>MI SUSCRIPCIÓN</small></div>
          <Link href="/" className="myPlanBack">← Volver al panel</Link>
        </header>

        <div className="myPlanHero">
          <div>
            <span className="myPlanBadge">PLAN ACTUAL</span>
            <h1>{plan ? plan.name : "Sin plan activo"}</h1>
            <p>{plan ? `${plan.price} · ${plan.accounts}` : "Elegí un plan para activar VYRAL."}</p>
          </div>
          <div className={`myPlanStatus ${status}`}><i />{status === "active" ? "ACTIVO" : status.toUpperCase()}</div>
        </div>

        {q.cancel === "1" && <div className="myPlanNotice">Recibimos tu solicitud de cancelación. También quedó registrada en Soporte 24/7.</div>}

        <div className="myPlanGrid">
          <section className="myPlanCard">
            <small>RENOVACIÓN</small>
            <strong>{periodEnd ? new Date(periodEnd).toLocaleDateString("es-AR") : "Pendiente de sincronización"}</strong>
            <p>{periodEnd ? "Tu acceso continúa hasta esta fecha si cancelás." : "La fecha exacta aparecerá cuando sincronizemos la suscripción con el proveedor de pagos."}</p>
          </section>
          <section className="myPlanCard">
            <small>ESTADO</small>
            <strong>{cancelRequested ? "Cancelación solicitada" : plan ? "Suscripción activa" : "Sin suscripción"}</strong>
            <p>{cancelRequested ? "Tu solicitud ya está en manos del equipo de soporte." : "Podés administrar tu plan desde este mismo panel."}</p>
          </section>
          <section className="myPlanCard">
            <small>SOPORTE</small>
            <strong>24/7</strong>
            <p>Consultas y seguimiento directo desde tu cuenta VYRAL.</p>
            <Link href="/soporte">Abrir soporte ↗</Link>
          </section>
        </div>

        {plan && <section className="myPlanDetails">
          <div><small>INCLUYE</small><h2>{plan.name}</h2></div>
          <div className="myPlanFeatures">{plan.features.map((f) => <span key={f}>✓ {f}</span>)}</div>
        </section>}

        <section className="myPlanActions">
          <div><small>CAMBIAR PLAN</small><h2>¿Necesitás más cuentas?</h2><p>Podés revisar los otros planes cuando quieras.</p></div>
          <div className="myPlanButtons"><Link href="/planes" className="upgrade">Ver planes ↗</Link>{plan && !cancelRequested && <form action="/api/account/request-cancel" method="post"><button type="submit">Solicitar cancelación</button></form>}</div>
        </section>

        <div className="myPlanFine">La cancelación no se considera completada hasta que el estado de tu suscripción figure como cancelado. Mientras terminamos de integrar la baja automática con el proveedor de pagos, la solicitud queda registrada para gestión manual.</div>
      </section>
    </main>
  );
}
