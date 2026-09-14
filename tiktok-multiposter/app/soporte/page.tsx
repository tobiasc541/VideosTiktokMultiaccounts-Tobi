import Link from "next/link";
import { redirect } from "next/navigation";
import { getCustomerSession } from "../../lib/auth";
import { supabaseAdmin } from "../../lib/supabase-admin";
import AutoRefresh from "../components/AutoRefresh";
import "./support.css";

export const dynamic = "force-dynamic";

type SupportMessage = { id: string; from: "user" | "admin"; text: string; createdAt: string };

export default async function SupportPage() {
  const session = await getCustomerSession();
  if (!session) redirect("/login");

  const client = supabaseAdmin();
  const { data } = await client.auth.admin.getUserById(session.userId);
  const meta = data.user?.user_metadata || {};
  const messages = Array.isArray(meta.support_messages) ? meta.support_messages as SupportMessage[] : [];
  const status = String(meta.support_status || "new");
  const lastClosedAt = meta.support_last_closed_at ? new Date(meta.support_last_closed_at) : null;

  return (
    <main className="supportPage">
      <AutoRefresh everyMs={5000} />
      <div className="supportGlow" />
      <section className="supportShell">
        <header className="supportTop">
          <div><div className="supportBrand">V<span>Y</span>RAL</div><small>SOPORTE 24/7 · ACTUALIZACIÓN AUTOMÁTICA</small></div>
          <Link href="/" className="supportBack">← Volver al panel</Link>
        </header>

        <div className="supportHero">
          <div>
            <span className="supportBadge">ASISTENCIA DIRECTA</span>
            <h1>Estamos para ayudarte.<br/><em>Sin vueltas.</em></h1>
            <p>Dejanos tu consulta. Esta conversación se actualiza sola cada 5 segundos cuando llega una respuesta.</p>
          </div>
          <div className="supportStatus"><span>Estado</span><strong>{status === "answered" ? "Respondido" : status === "open" ? "En revisión" : "Listo para recibir tu consulta"}</strong></div>
        </div>

        {lastClosedAt && !messages.length && <div className="supportClosedNotice"><strong>Consulta cerrada correctamente.</strong><span>El equipo dio por finalizado el caso el {lastClosedAt.toLocaleString("es-AR")}. Si necesitás algo más, podés abrir una nueva consulta desde acá.</span></div>}

        <section className="supportGrid">
          <div className="supportComposer">
            <div className="supportLabel">NUEVA CONSULTA</div>
            <form action="/api/support/message" method="post">
              <label>Asunto</label>
              <input name="subject" placeholder="Ej: Problema al conectar una cuenta" maxLength={100} required />
              <label>Mensaje</label>
              <textarea name="message" placeholder="Contanos qué pasó, qué estabas intentando hacer y qué necesitás resolver." maxLength={2000} required />
              <button type="submit">Enviar consulta <span>↗</span></button>
            </form>
            <div className="supportPromise"><b>24/7</b><span>Tu consulta queda registrada en tu cuenta y llega al panel interno de soporte.</span></div>
          </div>

          <div className="supportThread">
            <div className="supportThreadHead"><div><small>CONVERSACIÓN ACTIVA · LIVE</small><h2>Chat con VYRAL</h2></div><span>{messages.length} mensajes</span></div>
            {!messages.length ? <div className="supportEmpty">No tenés ninguna consulta abierta. Cuando envíes una nueva, la conversación aparecerá acá.</div> : (
              <div className="supportMessages">
                {messages.map((m) => <div className={`supportMessage ${m.from}`} key={m.id}><small>{m.from === "admin" ? "VYRAL SUPPORT" : "VOS"}</small><p>{m.text}</p><span>{new Date(m.createdAt).toLocaleString("es-AR")}</span></div>)}
              </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
