import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, isLoggedIn } from "../lib/auth";
import { listAccounts } from "../lib/tiktok";
import Dashboard from "./ui/Dashboard";
import TopViralDemo from "./ui/TopViralDemo";
import "./ui/dashboard-addons.css";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!(await isLoggedIn())) redirect("/login");
  if (await getAdminSession()) redirect("/admin");
  const accounts = await listAccounts();
  return <div className="dashboardPageWrap">
    <Dashboard initialAccounts={accounts} />

    <nav className="dashboardSideExtras" aria-label="Cuenta y soporte">
      <Link href="/mi-plan"><span>◇</span><b>Planes</b></Link>
      <Link href="/soporte"><span>?</span><b>Soporte 24/7</b></Link>
    </nav>

    <div className="dashboardTopContent">
      <TopViralDemo />
    </div>
  </div>;
}
