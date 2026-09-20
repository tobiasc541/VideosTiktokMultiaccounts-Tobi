"use client";

import Link from "next/link";
import CreditBadge from "./CreditBadge";

export type VyralSection="dashboard"|"publish"|"accounts"|"history"|"analytics"|"automations"|"coach";

export default function VyralSidebar({active,onSection,showInbox=true}:{active:VyralSection|"inbox";onSection?:(section:VyralSection)=>void;showInbox?:boolean}){
 const go=(section:VyralSection)=>{if(onSection){onSection(section);return}window.location.href="/?section="+section};
 const item=(section:VyralSection,icon:string,label:string,extra?:string)=><button type="button" className={active===section?"active":""} onClick={()=>go(section)}><span>{icon}</span><span>{label}</span>{extra&&<span className="vdSoon">{extra}</span>}</button>;
 return <aside className="vdSidebar vyralSharedSidebar">
  <div className="vdLogo">V<b>Y</b>RAL</div>
  <nav className="vdNav">
   {item("dashboard","⌂","Panel")}
   {item("publish","↗","Publicar")}
   {item("accounts","◎","Cuentas")}
   {item("history","▥","Historial")}
   {item("analytics","⌁","Analytics")}
   {item("coach","✦","VYRAL Coach","AI")}
   {item("automations","◫","Automatizaciones")}
   {showInbox&&<Link className={active==="inbox"?"active":""} href="/inbox"><span>◉</span><span>VYRAL Inbox</span></Link>}
   <Link href="/mi-plan"><span>◇</span><span>Tu cuenta</span></Link>
   <Link href="/creadores"><span>✦</span><span>Creator Viral</span></Link>
   <Link href="/ayuda"><span>?</span><span>Preguntas frecuentes</span></Link>
   <Link href="/soporte"><span>↗</span><span>Soporte 24/7</span></Link>
  </nav>
  <div className="vyralSharedCredits"><CreditBadge/></div>
  <div className="vdSideBottom"><form action="/api/logout" method="post"><button className="vdLogout">Cerrar sesión</button></form></div>
 </aside>
}