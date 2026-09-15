import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, getCustomerSession, isLoggedIn } from "../lib/auth";
import { supabaseAdmin } from "../lib/supabase-admin";
import { isPlanId } from "../lib/plans";
import { listOwnedTikTokAccounts } from "../lib/tiktok-ownership";
import Dashboard from "./ui/Dashboard";
import TopViralDemo from "./ui/TopViralDemo";
import DashboardExtrasController from "./ui/DashboardExtrasController";
import CreditBadge from "./ui/CreditBadge";
import AnalyticsFilterPanel from "./ui/AnalyticsFilterPanel";
import PlanFeatureGate from "./ui/PlanFeatureGate";
import PremiumAnalyticsPanel from "./ui/PremiumAnalyticsPanel";
import UploadPhonePreview from "./ui/UploadPhonePreview";
import PublishScheduleControls from "./ui/PublishScheduleControls";
import NotificationCenter from "./ui/NotificationCenter";
import DashboardNoticeBridge from "./ui/DashboardNoticeBridge";
import PublicationHistory from "./ui/PublicationHistory";
import AutomationStudio from "./ui/AutomationStudio";
import ProductTour from "./ui/ProductTour";
import "./ui/dashboard-addons.css";
import "./ui/premium-analytics.css";
import "./ui/plan-gates-extra.css";
import "./ui/analytics-layout-fix.css";
import "./ui/dashboard-motion.css";

export const dynamic = "force-dynamic";
export default async function Home(){
 if(!(await isLoggedIn()))redirect("/login"); if(await getAdminSession())redirect("/admin"); const session=await getCustomerSession();if(!session)redirect("/login");const client=supabaseAdmin();const {data}=await client.auth.admin.getUserById(session.userId);const meta=data.user?.user_metadata||{};const planId=String(meta.plan||session.plan||"");const periodEnd=meta.subscription_current_period_end||meta.current_period_end||null;if(periodEnd&&new Date(String(periodEnd)).getTime()<=Date.now()){const next={...meta} as Record<string,unknown>;delete next.plan;next.subscription_status="expired";next.account_notice="Tu período terminó. Elegí un plan para volver a activar VYRAL.";await client.auth.admin.updateUserById(session.userId,{user_metadata:next});redirect("/planes?expired=1")}if(!isPlanId(planId))redirect("/planes");const starter=planId==="inicio";const daysLeft=periodEnd?Math.max(0,Math.ceil((new Date(String(periodEnd)).getTime()-Date.now())/86400000)):null;const accounts=await listOwnedTikTokAccounts(session.userId);
 return <div className={`dashboardPageWrap plan-${planId} ${starter?"starterPlan":"premiumPlan"}`}><Dashboard initialAccounts={accounts}/><UploadPhonePreview/><PublishScheduleControls/><NotificationCenter daysLeft={daysLeft} planId={planId} accountCount={accounts.length}/><DashboardNoticeBridge/><PublicationHistory/><AutomationStudio/><ProductTour/><DashboardExtrasController/><PlanFeatureGate starter={starter}/>{daysLeft!==null&&daysLeft<=1&&daysLeft>0&&<div className="subscriptionExpiryBanner"><div><small>RENOVACIÓN</small><strong>Tu plan vence mañana.</strong><span>Renová ahora para mantener el acceso sin interrupciones.</span></div><Link href="/mi-plan#upgrade">Administrar plan ↗</Link></div>}<nav className="dashboardSideExtras" aria-label="Cuenta y soporte"><Link href="/mi-plan"><span>◇</span><b>Tu cuenta</b></Link><Link href="/creadores"><span>✦</span><b>Creator Viral</b></Link><Link href="/ayuda"><span>?</span><b>Preguntas frecuentes</b></Link><Link href="/soporte"><span>↗</span><b>Soporte 24/7</b></Link><CreditBadge/></nav><section className="dashboardPostFlow"><div className={`dashboardTopContent ${starter?"starterLockedFeature":""}`}><TopViralDemo/>{starter&&<div className="starterFeatureOverlay"><div className="starterGateIcon">✦</div><small>TOP CONTENT · PREMIUM</small><h2>Descubrí qué contenido está impulsando tu crecimiento.</h2><p>Los 5 videos más virales y sus métricas se desbloquean desde el plan Crecimiento.</p><Link href="/mi-plan#upgrade">Cambiar plan ↗</Link></div>}</div><div className="dashboardPostMetrics"><section className="vdCard"><div className="vdCardHead"><div><div className="vdLabel">RENDIMIENTO</div><h2>Últimos 30 días</h2></div></div><div className="vdMiniStats"><div><span>Vistas</span><b>284.750</b></div><div><span>Seguidores</span><b>+4.680</b></div><div><span>Compartidos</span><b>8.210</b></div></div></section><section className="vdCard"><div className="vdCardHead"><div><div className="vdLabel">IMPACTO VYRAL</div><h2>Distribución multicuentas</h2></div></div><div className="vdImpactCompare compact"><div><span>Mejor cuenta individual</span><b>118.400</b></div><div><span>Vistas adicionales</span><b>+166.350</b></div><div><span>Multiplicador</span><b>2,40×</b></div></div></section></div></section><div className={starter?"starterAnalyticsFilterLocked":""}><AnalyticsFilterPanel/></div><PremiumAnalyticsPanel planId={planId}/></div>;
}
