import { redirect } from "next/navigation";
import { getAdminSession, isLoggedIn } from "../lib/auth";
import { listAccounts } from "../lib/tiktok";
import Dashboard from "./ui/Dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  if (!(await isLoggedIn())) redirect("/login");
  if (await getAdminSession()) redirect("/admin");
  const accounts = await listAccounts();
  return <Dashboard initialAccounts={accounts} />;
}
