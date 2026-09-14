import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerSession } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabase-admin";
import { PLAN_CONFIG, currentUsageMonth, isPlanId } from "../../lib/plans";
import UpgradeCalculator from "./UpgradeCalculator";
import "./plan.css";
import "./upgrade.css";

export const dynamic = "force-dynamic";

export default async function MyPlanPage({ searchParams }: { searchParams: Promise<{ cancel?: string }> }) {
  const session = await getCustomerSession();
  if (!session) redirect("/login");
  const q = await searchParams;

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(session.userId);
  const meta = data.user?.user_metadata || {};
  const planId = String(meta.plan || session.plan || "");
  const plan = isPlanId(planId) ? PLAN_CONFIG[planId] : null;
  const periodEnd = meta.subscription_current_period_end || meta.current_period_end || null;
  const status = String(meta.subscription_status || (plan ? "active" : "none"));
  const cancelRequested = Boolean(meta.cancel_requested_at);
  const cancelApproved = Boolean(meta.cancel_approved_at);
  const month = currentUsageMonth();
  const used = meta.video_usage_month === month ? Number(meta.videos_used_month || 0) : 0;
  const limit = plan?.monthlyVideos || 0;
  const remaining = Math.max(0, limit - used);

  return (
    <main className="myPlanPage">
      <div className="myPlanGlow" />
      <section className="myPlanShell">
        <header className="myPlanTop">
          <div><div className="myPlanBrand">V<span>Y</span>RAL</div><small>MI SUSCRIPCIÓN</small></div>
          <Link href="/" className="myPlanBack">← Volver al panel</Link>
        </header>

        <div className="myPlanHero">
          <div><span className="myPlanBadge">PLAN ACTUAL</span><h1>{plan ? plan.name : "Sin plan activo"}</h1><p>{plan ? `${plan.price} / mes · Hasta ${plan.accounts} cuentas` : "Elegí un plan para activar VYRAL."}</p></div>
          <div className={`myPlanStatus ${status}`}><i />{status === "active" ? "ACTIVO" : status === "canceling" ? "CANCELACIÓN APROBADA" : status.toUpperCase()}</div>
        </div>

        {q.cancel === "1" && <div className="myPlanNotice">Solicitud enviada al soporte. Te responderemos en menos de 24 horas.</div>}
        {cancelApproved && periodEnd && <div className="myPlanNotice">Tu solicitud fue aprobada. Tu plan terminará el {new Date(periodEnd).toLocaleDateString("es-AR")}. Hasta ese día podés seguir usando VYRAL normalmente.</div>}

        <div className="myPlanGrid">
          <section className="myPlanCard"><small>VIDEOS ESTE MES</small><strong>{used} / {limit || "—"}</strong><p>{plan ? `Te quedan ${remaining} créditos de video. Un video cargado cuenta como 1 crédito aunque lo distribuyas a varias cuentas.` : "Activá un plan para obtener créditos."}</p></section>
          <section className="myPlanCard"><small>RENOVACIÓN / FIN</small><strong>{periodEnd ? new Date(periodEnd).toLocaleDateString("es-AR") : "Pendiente de sincronización"}</strong><p>{cancelApproved ? "Tu acceso se cerrará al finalizar esta fecha." : "La fecha exacta se sincronizará con el proveedor de pagos."}</p></section>
          <section className="myPlanCard"><small>ESTADO</small><strong>{cancelApproved ? "Cancelación aprobada" : cancelRequested ? "Solicitud en revisión" : plan ? "Suscripción activa" : "Sin suscripción"}</strong><p>{cancelRequested && !cancelApproved ? "Tu solicitud está en manos del equipo de soporte." : "Podés administrar tu plan desde este mismo panel."}</p></section>
          <section className="myPlanCard"><small>SOPORTE</small><strong>24/7</strong><p>Consultas y seguimiento directo desde tu cuenta VYRAL.</p><Link href="/soporte">Abrir soporte ↗</Link></section>
        </div>

        {plan && <section className="myPlanDetails"><div><small>INCLUYE</small><h2>{plan.name}</h2></div><div className="myPlanFeatures"><span>✓ Hasta {plan.accounts} cuentas</span><span>✓ {plan.monthlyVideos} videos por mes</span><span>✓ Publicación multicuentas</span><span>✓ Historial</span><span>✓ Soporte 24/7</span>{plan.analytics && <span>✓ Analytics</span>}{plan.advancedAnalytics && <span>✓ VYRAL Intelligence avanzado</span>}{plan.ai && <span>✓ VYRAL AI</span>}</div></section>}

        <section className="myPlanActions"><div><small>CAMBIAR PLAN</small><h2>¿Necesitás más capacidad?</h2><p>Podés subir de plan en cualquier momento. VYRAL te muestra cuánto valor te queda en el ciclo actual antes de decidir.</p></div><div className="myPlanButtons"><Link href="/planes" className="upgrade">Cambiar plan ↗</Link>{plan && !cancelRequested && <form action="/api/account/request-cancel" method="post"><button type="submit">Solicitar cancelación</button></form>}</div></section>

        {plan && isPlanId(planId) && <UpgradeCalculator current={planId} periodEnd={periodEnd ? String(periodEnd) : null} />}

        <div className="myPlanFine">Cuando una cancelación es aprobada, mantenés acceso hasta el final del período. Después VYRAL te lleva nuevamente a selección de plan para reactivar el servicio.</div>
      </section>
    </main>
  );
}
