"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./meta-instagram-accounts.css";

type InstagramAccount = {
  id: string;
  instagram_user_id: string;
  username: string | null;
  display_name: string | null;
  account_type: string | null;
};

type FacebookPage = {
  id: string;
  page_id: string;
  page_name: string | null;
  category: string | null;
};

export default function MetaInstagramAccounts() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [publishMount, setPublishMount] = useState<HTMLElement | null>(null);
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [facebook, setFacebook] = useState<FacebookPage[]>([]);
  const [selectedInstagram, setSelectedInstagram] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [limit, setLimit] = useState(0);
  const [repairing, setRepairing] = useState<string | null>(null);

  async function loadAccounts() {
    setLoading(true);
    try {
      const [instagramResponse, facebookResponse] = await Promise.all([
        fetch("/api/meta/instagram/accounts", { cache: "no-store" }),
        fetch("/api/meta/facebook/accounts", { cache: "no-store" }),
      ]);

      if (instagramResponse.ok) {
        const data = await instagramResponse.json();
        const next: InstagramAccount[] = Array.isArray(data.accounts) ? data.accounts : [];
        setAccounts(next);
        window.dispatchEvent(
          new CustomEvent("vyral:instagram-accounts", { detail: { count: next.length } }),
        );
      }

      if (facebookResponse.ok) {
        const data = await facebookResponse.json();
        setFacebook(Array.isArray(data.accounts) ? data.accounts : []);
        setLimit(Number(data.limit || 0));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAccounts();

    const timer = window.setInterval(() => {
      const main = document.querySelector(".vdMain");
      const title = main?.querySelector(".vdSectionTitle")?.textContent || "";

      if (main && title.includes("Tus cuentas conectadas")) {
        let element = main.querySelector(".vyralMetaAccountsMount") as HTMLElement | null;
        if (!element) {
          element = document.createElement("div");
          element.className = "vyralMetaAccountsMount";
          main.appendChild(element);
        }
        setMount(element);
      } else {
        setMount(null);
      }

      if (main && title.includes("Nueva publicación")) {
        const cards = main.querySelectorAll(".vdGrid > .vdCard");
        const destination = cards[1] as HTMLElement | undefined;
        if (destination) {
          let element = destination.querySelector(".vyralMetaPublishMount") as HTMLElement | null;
          if (!element) {
            element = document.createElement("div");
            element.className = "vyralMetaPublishMount";
            destination.appendChild(element);
          }
          setPublishMount(element);
        } else {
          setPublishMount(null);
        }
      } else {
        setPublishMount(null);
      }
    }, 300);

    return () => window.clearInterval(timer);
  }, []);

  async function removeFacebook(id: string) {
    if (!window.confirm("¿Desconectar esta página de Facebook de VYRAL?")) return;
    const response = await fetch(
      "/api/meta/facebook/accounts?id=" + encodeURIComponent(id),
      { method: "DELETE" },
    );
    if (response.ok) setFacebook((current) => current.filter((account) => account.id !== id));
  }

  async function removeInstagram(id: string) {
    if (!window.confirm("¿Desconectar esta cuenta de Instagram de VYRAL?")) return;
    const response = await fetch(
      "/api/meta/instagram/accounts?id=" + encodeURIComponent(id),
      { method: "DELETE" },
    );
    if (response.ok) setAccounts((current) => current.filter((account) => account.id !== id));
  }

  async function repairInstagram(id: string) {
    setRepairing(id);
    try {
      const response = await fetch("/api/meta/instagram/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "repair_webhook", id }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "No se pudo reparar la recepción de mensajes.");
      window.alert("Mensajería de Instagram resincronizada con Meta. Ya podés probar un DM.");
      await loadAccounts();
    } catch (error: any) {
      window.alert(error?.message || "No se pudo reparar la recepción de mensajes.");
    } finally {
      setRepairing(null);
    }
  }

  function toggleInstagram(id: string) {
    setSelectedInstagram((current) => {
      const next = current.includes(id)
        ? current.filter((accountId) => accountId !== id)
        : [...current, id];

      window.dispatchEvent(
        new CustomEvent("vyral:instagram-selection", { detail: { ids: next } }),
      );
      return next;
    });
  }

  const accountsPortal = mount
    ? createPortal(
        <>
          <section className="vmiWrap">
            <div className="vmiHead">
              <div>
                <div className="vmiTitleLine">
                  <img className="vmiBrandIcon" src="/instagram.png" alt="Instagram" />
                  <div>
                    <small>INSTAGRAM</small>
                    <h2>Instagram ({accounts.length})</h2>
                  </div>
                </div>
                <p>
                  Conectá varias cuentas profesionales. Cada usuario autoriza sus propias cuentas
                  directamente con Meta.
                </p>
              </div>
            </div>

            <div className="vmiGrid">
              {loading ? (
                <div className="vmiEmpty">Cargando cuentas…</div>
              ) : accounts.length ? (
                accounts.map((account) => (
                  <article className="vmiAccount" key={account.id}>
                    <div className="vmiIcon">
                      <img src="/instagram.png" alt="" />
                    </div>
                    <div>
                      <strong>@{account.username || account.instagram_user_id}</strong>
                      <span>{account.display_name || "Cuenta profesional"}</span>
                      <small>
                        {account.account_type === "MEDIA_CREATOR" ? "CREADOR" : "PROFESIONAL"} ·
                        CONECTADA
                      </small>
                    </div>
                    <div style={{display:"flex",gap:8,alignItems:"center"}}>
                      <button
                        onClick={() => void repairInstagram(account.id)}
                        disabled={repairing === account.id}
                        title="Reconstruir la suscripción de mensajes con Meta sin desconectar la cuenta"
                        aria-label="Reparar mensajería"
                      >
                        {repairing === account.id ? "…" : "↻"}
                      </button>
                      <button onClick={() => void removeInstagram(account.id)} aria-label="Desconectar">
                        ×
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="vmiEmpty">
                  Todavía no conectaste Instagram.{" "}
                </div>
              )}
            </div>
          </section>

          <section className="vmiWrap vmiFacebook">
            <div className="vmiHead">
              <div>
                <div className="vmiTitleLine">
                  <img className="vmiBrandIcon" src="/facebook.png" alt="Facebook" />
                  <div>
                    <small>FACEBOOK</small>
                    <h2>Facebook ({facebook.length})</h2>
                  </div>
                </div>
                <p>
                  Páginas de Facebook conectadas a VYRAL. Tu plan admite {limit || "—"} cuentas
                  en total.
                </p>
              </div>
            </div>

            <div className="vmiGrid">
              {facebook.length ? (
                facebook.map((page) => (
                  <article className="vmiAccount" key={page.id}>
                    <div className="vmiIcon">
                      <img src="/facebook.png" alt="" />
                    </div>
                    <div>
                      <strong>{page.page_name || page.page_id}</strong>
                      <span>{page.category || "Página de Facebook"}</span>
                      <small>CONECTADA</small>
                    </div>
                    <button onClick={() => void removeFacebook(page.id)} aria-label="Desconectar">
                      ×
                    </button>
                  </article>
                ))
              ) : (
                <div className="vmiFacebookEmpty">
                  <img className="vmiBrandIcon" src="/facebook.png" alt="Facebook" />
                  <div>
                    <b>Sin páginas conectadas</b>
                  </div>
                </div>
              )}
            </div>
          </section>
        </>,
        mount,
      )
    : null;

  const publishPortal = publishMount
    ? createPortal(
        <div className="vmiPublishNetworks">
          <section className="vmiPublishNetwork instagram">
            <div className="vmiPublishNetworkHead">
              <img src="/instagram.png" alt="Instagram" />
              <div>
                <small>INSTAGRAM</small>
                <strong>Instagram ({accounts.length})</strong>
              </div>
            </div>

            {loading ? (
              <span className="vmiPublishMuted">Cargando cuentas…</span>
            ) : accounts.length ? (
              accounts.map((account) => (
                <div className="vmiPublishAccount" key={account.id}>
                  <input
                    type="checkbox"
                    checked={selectedInstagram.includes(account.id)}
                    onChange={() => toggleInstagram(account.id)}
                  />
                  <img src="/instagram.png" alt="" />
                  <div>
                    <b>@{account.username || account.instagram_user_id}</b>
                    <span>{account.display_name || "Cuenta profesional"}</span>
                  </div>
                </div>
              ))
            ) : (
              <span className="vmiPublishMuted">Sin cuentas conectadas</span>
            )}
          </section>

          <section className="vmiPublishNetwork facebook">
            <div className="vmiPublishNetworkHead">
              <img src="/facebook.png" alt="Facebook" />
              <div>
                <small>FACEBOOK</small>
                <strong>Facebook ({facebook.length})</strong>
              </div>
            </div>

            {facebook.length ? (
              facebook.map((page) => (
                <div className="vmiPublishAccount" key={page.id}>
                  <img src="/facebook.png" alt="" />
                  <div>
                    <b>{page.page_name || page.page_id}</b>
                    <span>{page.category || "Página de Facebook"}</span>
                  </div>
                </div>
              ))
            ) : (
              <span className="vmiPublishMuted">Sin páginas conectadas</span>
            )}
          </section>
        </div>,
        publishMount,
      )
    : null;

  return (
    <>
      {accountsPortal}
      {publishPortal}
    </>
  );
}
