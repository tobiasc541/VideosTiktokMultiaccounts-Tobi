import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, getCustomerSession, isLoggedIn } from "../lib/auth";
import { supabaseAdmin } from "../lib/supabase-admin";
import { isPlanId } from "../lib/plans";
import { listAccounts } from "../lib/tiktok";
import Dashboard from "./ui/Dashboard";
import TopViralDemo from "./ui/TopViralDemo";
import DashboardExtrasController from "./ui/DashboardExtrasController";
import CreditBadge from "./ui/CreditBadge";
import "./ui/dashboard-addons.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!(await isLoggedIn())) redirect("/login");
  if (await getAdminSession()) redirect("/admin");

  const session = await getCustomerSession();
  if (!session) redirect("/login");

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(session.userId);
  const meta = data.user?.user_metadata || {};
  const planId = String(meta.plan || session.plan || "");
  const periodEnd = meta.subscription_current_period_end || meta.current_period_end || null;

  if (periodEnd && new Date(periodEnd).getTime() <= Date.now()) {
    const next = { ...meta } as Record<string, unknown>;
    delete next.plan;
    next.subscription_status = "expired";
    await client.auth.admin.updateUserById(session.userId, { user_metadata: next });
    redirect("/planes?expired=1");
  }

  if (!isPlanId(planId)) redirect("/planes");

  const accounts = await listAccounts();
  return <div className="dashboardPageWrap">
    <Dashboard initialAccounts={accounts} />
    <DashboardExtrasController />

    <nav className="dashboardSideExtras" aria-label="Cuenta y soporte">
      <Link href="/mi-plan"><span>◇</span><b>Planes</b></Link>
      <Link href="/ayuda"><span>✦</span><b>Preguntas frecuentes</b></Link>
      <Link href="/soporte"><span>?</span><b>Soporte 24/7</b></Link>
      <CreditBadge />
    </nav>

    <div className="dashboardTopContent">
      <TopViralDemo />
    </div>
  </div>;
}
