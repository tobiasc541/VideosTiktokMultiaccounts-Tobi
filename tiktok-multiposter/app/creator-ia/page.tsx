import { redirect } from "next/navigation";
import { getCustomerSession } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabase-admin";
import CreatorAIStudio from "./CreatorAIStudio";
import "./creator-ai.css";
export const dynamic="force-dynamic";
export default async function CreatorAIPage(){
 const session=await getCustomerSession(); if(!session)redirect("/login");
 const {data}=await supabaseAdmin().auth.admin.getUserById(session.userId);
 const plan=String(data.user?.user_metadata?.plan||session.plan||"");
 return <CreatorAIStudio enabled={plan==="escala"||plan==="ai"} reelsEnabled={plan==="ai"}/>;
}
