import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerSession } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabase-admin";
import { PLAN_CONFIG, currentUsageMonth, isPlanId } from "../../lib/plans";
import UpgradeCalculator from "./UpgradeCalculator";
import AccountSecurityForm from "./AccountSecurityForm";
import "./plan.css";
import "./upgrade.css";

export const dynamic = "force-dynamic";

export default async function MyPlanPage({ searchParams }: { searchParams: Promise<{ cancel?: string; upgrade?: string }> }) {
  const session = await getCustomerSession();
  if (!session) redirect("/login");
  const q = await searchParams;

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(session.userId);
  const meta = data.user?.user_metadata || {};
  const email = data.user?.email || session.email;
  const planId = String(meta.plan || session.plan || "");
  const plan = isPlanId(planId) ? PLAN_CONFIG[planId] : null;
  const periodEnd = meta.subscription_current_period_end || meta.current_period_end || null;
  const status = String(meta.subscription_status || (plan ? "active" : "none"));
  const cancelRequested = Boolean(meta.cancel_requested_at);
  const cancelApproved = Boolean(meta.cancel_approved_at);
  const upgradeStatus = String(meta.upgrade_request_status || "");
  const accountNotice = String(meta.account_notice || "");
  const month = currentUsageMonth();
  const used = meta.video_usage_month === month ? Number(meta.videos_used_month || 0) : 0;
  const limit = plan?.monthlyVideos || 0;
  const remaining = Math.max(0, limit - used);
  const daysLeft = periodEnd ? Math.max(0, Math.ceil((new Date(String(periodEnd)).getTime() - Date.now()) / 86400000)) : null;

  return (
    <main className="myPlanPage">
      <div className="myPlanGlow" />
      <section className="myPlanShell">
        <header className="myPlanTop">
          <div><div className="myPlanBrand">V<span>Y</span>RAL</div><small>MI CUENTA</small></div>
          <Link href="/" className="myPlanBack">← Volver al panel</Link>
        </header>

        <div className="myAccountHero">
          <div><span className="myPlanBadge">TU CUENTA VYRAL</span><h1>Cuenta, seguridad y plan.</h1><p>Todo lo esencial de tu acceso, tu suscripción y tu capacidad en un mismo lugar.</p></div>
          <div className="myAccountHeroEmail"><span>SESIÓN ACTIVA</span><strong>{email}</strong></div>
        </div>

        <AccountSecurityForm email={email} />

        <div className="myPlanHero">
          <div><span className="myPlanBadge">PLAN ACTUAL</span><h1>{plan ? plan.name : "Sin plan activo"}</h1><p>{plan ? `${plan.price} / mes · Hasta ${plan.accounts} cuentas` : "Elegí un plan para activar VYRAL."}</p></div>
          <div className={`myPlanStatus ${status}`}><i />{status === "active" ? "ACTIVO" : status === "manual_upgrade" ? "ACCESO MANUAL" : status === "canceling" ? "CANCELACIÓN APROBADA" : status.toUpperCase()}</div>
        </div>

        {q.cancel === "1" && <div className="myPlanNotice">Solicitud enviada al soporte. Te responderemos en menos de 24 horas.</div>}
        {q.upgrade === "requested" && <div className="myPlanNotice">Solicitud de cambio enviada. La revisaremos y te notificaremos desde tu panel.</div>}
        {accountNotice && <div className="myPlanNotice">{accountNotice}</div>}
        {daysLeft !== null && daysLeft <= 1 && daysLeft > 0 && <div className="myPlanNotice urgent">Tu acceso vence mañana. Podés renovar ahora para evitar que VYRAL se bloquee al finalizar el período.</div>}
        {cancelApproved && periodEnd && <div className="myPlanNotice">Tu solicitud fue aprobada. Tu plan terminará el {new Date(String(periodEnd)).toLocaleDateString("es-AR")}. Hasta ese día podés seguir usando VYRAL normalmente.</div>}

        <div className="myPlanGrid">
          <section className="myPlanCard"><small>VIDEOS ESTE MES</small><strong>{used} / {limit || "—"}</strong><p>{plan ? `Te quedan ${remaining} créditos de video. Un video cargado cuenta como 1 crédito aunque lo distribuyas a varias cuentas.` : "Activá un plan para obtener créditos."}</p></section>
          <section className="myPlanCard"><small>RENOVACIÓN / FIN</small><strong>{periodEnd ? new Date(String(periodEnd)).toLocaleDateString("es-AR") : "Ciclo demo / sin fecha sincronizada"}</strong><p>{cancelApproved || status === "manual_upgrade" ? "Tu acceso se cerrará al finalizar esta fecha." : "La fecha exacta aparecerá cuando la suscripción esté sincronizada."}</p></section>
          <section className="myPlanCard"><small>ESTADO</small><strong>{upgradeStatus === "pending" ? "Cambio de saldo en revisión" : cancelApproved ? "Cancelación aprobada" : cancelRequested ? "Solicitud en revisión" : plan ? "Suscripción activa" : "Sin suscripción"}</strong><p>{upgradeStatus === "pending" ? "Tu solicitud está esperando decisión del administrador." : cancelRequested && !cancelApproved ? "Tu solicitud está en manos del equipo de soporte." : "Podés administrar tu plan desde este mismo panel."}</p></section>
          <section className="myPlanCard"><small>SOPORTE</small><strong>24/7</strong><p>Consultas y seguimiento directo desde tu cuenta VYRAL.</p><Link href="/soporte">Abrir soporte ↗</Link></section>
        </div>

        {plan && <section className="myPlanDetails"><div><small>INCLUYE</small><h2>{plan.name}</h2></div><div className="myPlanFeatures"><span>✓ Hasta {plan.accounts} cuentas</span><span>✓ {plan.monthlyVideos} videos por mes</span><span>✓ Publicación multicuentas</span><span>✓ Historial</span><span>✓ Soporte 24/7</span>{plan.analytics && <span>✓ Analytics</span>}{plan.advancedAnalytics && <span>✓ VYRAL Intelligence avanzado</span>}{plan.ai && <span>✓ VYRAL AI</span>}</div></section>}

        <section className="myPlanActions"><div><small>CAMBIAR PLAN</small><h2>¿Necesitás más capacidad?</h2><p>Podés subir de plan en cualquier momento. VYRAL te muestra cuánto valor te queda en el ciclo actual antes de decidir.</p></div><div className="myPlanButtons"><Link href="/planes" className="upgrade">Cambiar plan ↗</Link>{plan && !cancelRequested && <form action="/api/account/request-cancel" method="post"><button type="submit">Solicitar cancelación</button></form>}</div></section>

        {plan && isPlanId(planId) && <UpgradeCalculator current={planId} periodEnd={periodEnd ? String(periodEnd) : null} pending={upgradeStatus === "pending"} />}

        <div className="myPlanFine">Cuando el período termina, VYRAL bloquea el acceso funcional y te lleva nuevamente a selección de plan para reactivar el servicio. Conservamos la sesión para que puedas renovar sin volver a registrarte.</div>
      </section>
    </main>
  );
}
