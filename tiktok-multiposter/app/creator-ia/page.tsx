import { redirect } from "next/navigation";
import Link from "next/link";
import { getCustomerSession } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabase-admin";
import CreatorAIStudio from "./CreatorAIStudio";
import "./creator-ai.css";
export const dynamic="force-dynamic";
export default async function CreatorAIPage(){
 const session=await getCustomerSession(); if(!session)redirect("/login");
 const {data}=await supabaseAdmin().auth.admin.getUserById(session.userId);
 const plan=String(data.user?.user_metadata?.plan||session.plan||"");
 const enabled=plan==="escala"||plan==="ai";
 return <><div style={{position:"fixed",right:22,bottom:22,zIndex:9999}}><Link href="/creator-ia/ebook" style={{display:"inline-flex",alignItems:"center",gap:8,padding:"13px 18px",borderRadius:999,background:"#7c5cff",color:"#fff",fontWeight:900,textDecoration:"none",boxShadow:"0 12px 35px #0008"}}>✦ EBOOK IA <span style={{fontSize:10,opacity:.8}}>NUEVO</span></Link></div><CreatorAIStudio enabled={enabled} reelsEnabled={plan==="ai"}/></>;
}
