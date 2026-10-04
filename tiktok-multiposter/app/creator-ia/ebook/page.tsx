import {redirect} from "next/navigation";
import Link from "next/link";
import {getCustomerSession} from "../../../lib/auth";
import {supabaseAdmin} from "../../../lib/supabase-admin";
import EbookStudio from "../EbookStudio";
import "../creator-ai.css";
export const dynamic="force-dynamic";
export default async function EbookPage(){const session=await getCustomerSession();if(!session)redirect("/login");const {data}=await supabaseAdmin().auth.admin.getUserById(session.userId);const plan=String(data.user?.user_metadata?.plan||session.plan||"");if(plan!=="escala"&&plan!=="ai")redirect("/mi-plan#upgrade");return <main className="cai"><header><Link href="/creator-ia">← Creator IA</Link><b>VYRAL <i>EBOOK IA</i></b><span>IMAGE-FIRST · BETA</span></header><section className="caiHero"><small>EDITORIAL ENGINE · 1 PÁGINA = 1 IMAGEN</small><h1>De un solo brief a un ebook que <em>impacta.</em></h1><p>Blueprint, dirección de arte, páginas independientes y coherencia visual automática.</p></section><EbookStudio/></main>}
