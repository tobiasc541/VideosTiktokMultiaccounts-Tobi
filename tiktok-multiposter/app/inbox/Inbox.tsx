"use client";

import { FormEvent, useEffect, useState } from "react";

type Handoff = {
  id: string;
  contact_id: string;
  contact_username?: string | null;
  reason?: string | null;
  lead_score: number;
  last_message?: string | null;
  status: string;
};

type Message = {
  id: string;
  body: string;
  direction: "in" | "out";
  sender_type: "contact" | "ai" | "human" | "system";
};

export default function Inbox() {
  const [handoffs, setHandoffs] = useState<Handoff[]>([]);
  const [selected, setSelected] = useState<Handoff | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  async function loadHandoffs() {
    const response = await fetch("/api/inbox", { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    setHandoffs(data.handoffs || []);
  }

  async function loadThread(handoff: Handoff) {
    setSelected(handoff);
    const response = await fetch(
      "/api/inbox?contact=" + encodeURIComponent(handoff.contact_id),
      { cache: "no-store" }
    );
    if (!response.ok) return;
    const data = await response.json();
    setMessages(data.messages || []);
  }

  useEffect(() => {
    void loadHandoffs();
    const timer = window.setInterval(() => void loadHandoffs(), 8000);
    return () => window.clearInterval(timer);
  }, []);

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || !message.trim() || sending) return;
    setSending(true);
    try {
      const response = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          handoffId: selected.id,
          message: message.trim(),
        }),
      });
      if (!response.ok) return;
      setMessage("");
      await loadThread(selected);
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="vi">
      <header>
        <small>VYRAL INBOX</small>
        <h1>Conversaciones que necesitan una persona.</h1>
        <p>
          La IA deriva automáticamente leads calientes y personas que piden
          hablar con un humano.
        </p>
      </header>

      <div className="viGrid">
        <aside>
          {handoffs.length ? (
            handoffs.map((handoff) => (
              <button
                type="button"
                className={selected?.id === handoff.id ? "on" : ""}
                onClick={() => void loadThread(handoff)}
                key={handoff.id}
              >
                <b>@{handoff.contact_username || handoff.contact_id}</b>
                <span>{handoff.reason || "Requiere atención"}</span>
                <i>Lead {handoff.lead_score}/100</i>
              </button>
            ))
          ) : (
            <div className="empty">No hay conversaciones pendientes.</div>
          )}
        </aside>

        <section>
          {selected ? (
            <>
              <div className="viThreadHead">
                <div>
                  <b>@{selected.contact_username || selected.contact_id}</b>
                  <span>Instagram · atención humana</span>
                </div>
                <strong>{selected.lead_score}/100</strong>
              </div>

              <div className="viMessages">
                {messages.map((item) => (
                  <div key={item.id} className={"msg " + item.direction}>
                    <small>
                      {item.sender_type === "human"
                        ? "VOS"
                        : item.direction === "out"
                          ? "VYRAL IA"
                          : "CONTACTO"}
                    </small>
                    {item.body}
                  </div>
                ))}
              </div>

              <form onSubmit={send}>
                <input
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="Respondé desde VYRAL…"
                />
                <button type="submit" disabled={sending}>
                  {sending ? "ENVIANDO…" : "ENVIAR →"}
                </button>
              </form>
            </>
          ) : (
            <div className="choose">Elegí una conversación.</div>
          )}
        </section>
      </div>
    </main>
  );
}
