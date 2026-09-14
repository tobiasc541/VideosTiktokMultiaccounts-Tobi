import { redirect } from "next/navigation";
import { getAdminSession } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabase-admin";
import AutoRefresh from "../components/AutoRefresh";
import Giveaway from "./Giveaway";
import "./admin.css";

export const dynamic = "force-dynamic";

type SupportMessage = { id: string; from: "user" | "admin"; text: string; createdAt: string };

function planLabel(plan?: string) {
  if (plan === "inicio") return "Inicio";
  if (plan === "pro") return "Crecimiento";
  if (plan === "escala") return "Escala";
  return "Sin plan";
}

export default async function AdminPage() {
  const admin = await getAdminSession();
  if (!admin) redirect("/login");

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.listUsers({ page: 1, perPage: 200 });
  const users = data.users || [];
  const tickets = users.filter((u) => Array.isArray(u.user_metadata?.support_messages) && u.user_metadata.support_messages.length > 0);
  const openTickets = tickets.filter((u) => u.user_metadata?.support_status === "open").length;
  const paidUsers = users.filter((u) => Boolean(u.user_metadata?.plan)).length;
  const cancellations = users.filter((u)=>Boolean(u.user_metadata?.cancel_requested_at) && !u.user_metadata?.cancel_approved_at).length;
  const giveawayUsers = users.filter(u=>u.email).map(u=>({ id:u.id, email:u.email || "", name:u.user_metadata?.full_name || "Usuario VYRAL" }));

  return (
    <main className="adminPage">
      <AutoRefresh everyMs={5000}/>
      <aside className="adminSidebar">
        <div className="adminLogo">V<b>Y</b>RAL</div>
        <div className="adminRole">SUPER ADMIN</div>
        <nav><a href="#overview">Overview</a><a href="#support">Soporte</a><a href="#giveaway">Sorteos</a><a href="#users">Usuarios</a></nav>
        <div className="adminSideBottom"><span>{admin.email}</span><form action="/api/logout" method="post"><button>Cerrar sesión</button></form></div>
      </aside>

      <section className="adminMain">
        <header className="adminHeader" id="overview"><div><small>CONTROL CENTER</small><h1>Tu operación, <em>bajo control.</em></h1><p>Usuarios, planes, soporte y sorteos desde un solo panel privado.</p></div><div className="adminLive"><i/> LIVE · 5S</div></header>

        <section className="adminStats">
          <article><span>01</span><small>USUARIOS</small><strong>{users.length}</strong><p>Cuentas registradas</p></article>
          <article><span>02</span><small>CON PLAN</small><strong>{paidUsers}</strong><p>Usuarios con plan asignado</p></article>
          <article><span>03</span><small>TICKETS ABIERTOS</small><strong>{openTickets}</strong><p>Actualización automática</p></article>
          <article><span>04</span><small>CANCELACIONES</small><strong>{cancellations}</strong><p>Esperando tu decisión</p></article>
        </section>

        <section className="adminSection" id="support">
          <div className="adminSectionHead"><div><small>SOPORTE 24/7 · LIVE</small><h2>Bandeja de consultas</h2></div><span>{openTickets} abiertas</span></div>
          {!tickets.length ? <div className="adminEmpty">Todavía no hay consultas de usuarios.</div> : tickets.map((user) => {
            const messages = (user.user_metadata.support_messages || []) as SupportMessage[];
            const last = messages[messages.length - 1];
            const status = String(user.user_metadata.support_status || "open");
            const cancelPending = Boolean(user.user_metadata?.cancel_requested_at) && !user.user_metadata?.cancel_approved_at;
            return <article className="adminTicket" key={user.id}>
              <div className="adminTicketTop"><div><strong>{user.email}</strong><span>{user.user_metadata?.full_name || "Usuario VYRAL"} · {planLabel(user.user_metadata?.plan)}</span></div><div className={`adminTicketStatus ${status}`}>{status === "open" ? "PENDIENTE" : status === "answered" ? "RESPONDIDO" : "CERRADO"}</div></div>
              <h3>{user.user_metadata?.support_subject || "Consulta de soporte"}</h3>
              {cancelPending && <div style={{border:"1px solid rgba(255,185,85,.25)",background:"rgba(255,185,85,.05)",padding:12,borderRadius:10,marginBottom:12}}><strong style={{fontSize:11}}>Solicitud de cancelación pendiente</strong><p style={{fontSize:9,color:"#8c96a1"}}>El usuario está esperando tu aprobación. Si aprobás, conservará acceso hasta el final del período y después tendrá que elegir un plan nuevamente.</p><form action="/api/admin/cancel-decision" method="post" style={{display:"flex",gap:8}}><input type="hidden" name="userId" value={user.id}/><button name="decision" value="approve">Aprobar cancelación</button><button className="ghost" name="decision" value="reject">Rechazar</button></form></div>}
              <div className="adminConversation">{messages.slice(-10).map((m) => <div className={`adminBubble ${m.from}`} key={m.id}><small>{m.from === "admin" ? "VOS" : user.email}</small><p>{m.text}</p><span>{new Date(m.createdAt).toLocaleString("es-AR")}</span></div>)}</div>
              <form className="adminReply" action="/api/admin/support-reply" method="post"><input type="hidden" name="userId" value={user.id}/><textarea name="message" placeholder="Escribí tu respuesta al usuario…" maxLength={2000} required/><div><button name="action" value="reply">Responder ↗</button><button className="ghost" name="action" value="close">Cerrar consulta</button></div></form>
              {last && <div className="adminLast">Último mensaje: {new Date(last.createdAt).toLocaleString("es-AR")}</div>}
            </article>;
          })}
        </section>

        <div id="giveaway"><Giveaway users={giveawayUsers}/></div>

        <section className="adminSection" id="users">
          <div className="adminSectionHead"><div><small>USUARIOS</small><h2>Gestión de cuentas</h2></div><span>Hasta 200 cuentas</span></div>
          <div className="adminUserTable"><div className="adminUserHead"><span>Usuario</span><span>Estado</span><span>Plan</span><span>Último acceso</span><span>Acciones</span></div>
            {users.map((u) => <div className="adminUserRow" key={u.id}>
              <div><strong>{u.user_metadata?.full_name || "Sin nombre"}</strong><small>{u.email}</small></div>
              <span className={u.email_confirmed_at ? "ok" : "warn"}>{u.email_confirmed_at ? "Verificado" : "Sin verificar"}</span>
              <strong>{planLabel(u.user_metadata?.plan)}</strong>
              <small>{u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString("es-AR") : "Nunca"}</small>
              <div className="adminUserActions"><form action="/api/admin/user-plan" method="post"><input type="hidden" name="userId" value={u.id}/><select name="plan" defaultValue={u.user_metadata?.plan || ""}><option value="">Sin plan</option><option value="inicio">Inicio</option><option value="pro">Crecimiento</option><option value="escala">Escala</option></select><button>Guardar</button></form><form action="/api/admin/send-reset" method="post"><input type="hidden" name="email" value={u.email || ""}/><button className="secondary">Enviar reset</button></form></div>
            </div>)}
          </div>
        </section>
      </section>
    </main>
  );
}
