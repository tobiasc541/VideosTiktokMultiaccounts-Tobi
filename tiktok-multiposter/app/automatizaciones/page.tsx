import { redirect } from "next/navigation";
import { getCustomerSession } from "../../lib/auth";
import AutomationManager from "./AutomationManager";
import "./automations.css";
export const dynamic="force-dynamic";
export default async function AutomationsPage(){const session=await getCustomerSession();if(!session)redirect("/login");return <AutomationManager/>;}