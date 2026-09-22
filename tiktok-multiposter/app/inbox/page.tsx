import {redirect} from "next/navigation";
import {getCustomerSession} from "../../lib/auth";
import Inbox from "./Inbox";
import "./inbox.css";

export const dynamic="force-dynamic";

export default async function Page(){
 const s=await getCustomerSession();
 if(!s) redirect("/login");
 // Inbox is part of the authenticated VYRAL workspace. Do not redirect users
 // based on stale user_metadata plan values; feature/API authorization is
 // enforced server-side where required.
 return <Inbox/>;
}
