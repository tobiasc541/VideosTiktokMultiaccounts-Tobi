import {redirect} from "next/navigation";
import {getCustomerSession} from "../../lib/auth";
import Inbox from "./Inbox";
import "./inbox.css";

export const dynamic="force-dynamic";

export default async function Page(){
 const s=await getCustomerSession();
 if(!s) redirect("/login");
 return <Inbox/>;
}
