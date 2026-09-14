import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminSession, isLoggedIn } from "../lib/auth";
import { listAccounts } from "../lib/tiktok";
import Dashboard from "./ui/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!(await isLoggedIn())) redirect("/login");
  if (await getAdminSession()) redirect("/admin");
  const accounts = await listAccounts();
  return <>
    <Dashboard initialAccounts={accounts} />
    <Link href="/soporte" style={{position:"fixed",right:22,bottom:22,zIndex:1000,textDecoration:"none",background:"linear-gradient(135deg,#e8fffe,#75f6f0)",color:"#071013",fontWeight:900,fontSize:12,padding:"12px 16px",borderRadius:999,boxShadow:"0 16px 45px rgba(0,0,0,.35)"}}>Soporte 24/7 ↗</Link>
  </>;
}
