import {redirect} from "next/navigation";
import {getCustomerSession} from "../../lib/auth";
import VyralSidebar from "../ui/VyralSidebar";
import "../ui/dashboard.css";
import "../ui/dashboard-addons.css";
import "./inbox.css";

export const dynamic="force-dynamic";

export default async function Page(){
 const s=await getCustomerSession();
 if(!s) redirect("/login");
 return <div className="viShell">
  <VyralSidebar active="inbox" showInbox={false}/>
  <main className="vi" style={{display:"grid",placeItems:"center",minHeight:"100vh"}}>
   <section style={{textAlign:"center",maxWidth:620,padding:"48px 28px"}}>
    <div style={{fontSize:34,opacity:.55,filter:"blur(1px)",marginBottom:22}}>◉</div>
    <small style={{letterSpacing:".22em",color:"#59f3ec"}}>VYRAL INBOX</small>
    <h1 style={{fontSize:"clamp(38px,6vw,72px)",margin:"14px 0 12px"}}>Próximamente.</h1>
    <p style={{opacity:.58,lineHeight:1.7}}>Estamos preparando el nuevo centro de conversaciones de VYRAL. Mensajes, automatizaciones y atención comercial van a convivir en una sola bandeja.</p>
    <a href="/" style={{display:"inline-block",marginTop:28,padding:"12px 18px",border:"1px solid rgba(89,243,236,.35)",borderRadius:10,color:"#59f3ec",textDecoration:"none"}}>VOLVER AL PANEL →</a>
   </section>
  </main>
 </div>;
}
