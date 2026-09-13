"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import "./dashboard.css";

type Account = {
  id: string;
  open_id: string;
  display_name: string;
  avatar_url: string | null;
};

type CreatorInfo = {
  creator_username?: string;
  creator_nickname?: string;
  privacy_level_options: string[];
  comment_disabled?: boolean;
  duet_disabled?: boolean;
  stitch_disabled?: boolean;
  max_video_post_duration_sec?: number;
};

type Result = {
  accountId: string;
  name: string;
  state: "preparing" | "uploading" | "processing" | "done" | "error";
  message?: string;
  publishId?: string;
};

type Section = "dashboard" | "publish" | "accounts" | "history" | "analytics";

function privacyLabel(v: string) {
  const map: Record<string, string> = {
    PUBLIC_TO_EVERYONE: "Público",
    MUTUAL_FOLLOW_FRIENDS: "Amigos",
    FOLLOWER_OF_CREATOR: "Seguidores",
    SELF_ONLY: "Solo yo"
  };
  return map[v] || v;
}

async function jsonFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
  return json;
}

async function uploadFileInChunks(
  file: File,
  uploadUrl: string,
  chunkSize: number,
  totalChunkCount: number,
  onProgress: (pct: number) => void
) {
  const total = file.size;
  for (let i = 0; i < totalChunkCount; i++) {
    const start = i * chunkSize;
    const isLast = i === totalChunkCount - 1;
    const endExclusive = isLast ? total : Math.min(start + chunkSize, total);
    const chunk = file.slice(start, endExclusive);
    const end = endExclusive - 1;
    const res = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "video/mp4",
        "Content-Range": `bytes ${start}-${end}/${total}`
      },
      body: chunk
    });
    if (!(res.status === 200 || res.status === 201 || res.status === 206)) {
      const text = await res.text().catch(() => "");
      throw new Error(`Falló la subida a TikTok (${res.status}) ${text}`.trim());
    }
    onProgress(Math.round(((i + 1) / totalChunkCount) * 100));
  }
}

export default function Dashboard({ initialAccounts }: { initialAccounts: Account[] }) {
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState(initialAccounts);
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [selected, setSelected] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [privacyOptions, setPrivacyOptions] = useState<string[]>([]);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [fatal, setFatal] = useState("");
  const [pendingRemove, setPendingRemove] = useState<Account | null>(null);
  const [queryNoticeVisible, setQueryNoticeVisible] = useState(true);

  const connected = searchParams.get("connected") === "1";
  const oauthError = searchParams.get("oauth_error");
  const selectedAccounts = useMemo(
    () => accounts.filter((a) => selected.includes(a.id)),
    [accounts, selected]
  );

  function dismissQueryNotice() {
    setQueryNoticeVisible(false);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }

  async function toggleAccount(id: string) {
    setFatal("");
    const next = selected.includes(id)
      ? selected.filter((x) => x !== id)
      : [...selected, id];
    setSelected(next);
    setPrivacy("");
    setPrivacyOptions([]);
    if (next.length === 0) return;

    setLoadingInfo(true);
    try {
      const infos: CreatorInfo[] = [];
      for (const accountId of next) {
        infos.push(
          await jsonFetch(`/api/tiktok/creator-info?accountId=${encodeURIComponent(accountId)}`)
        );
      }
      let common = infos[0]?.privacy_level_options || [];
      for (const info of infos.slice(1)) {
        common = common.filter((p) => info.privacy_level_options.includes(p));
      }
      setPrivacyOptions(common);
      if (common.length === 0) {
        setFatal("Las cuentas seleccionadas no comparten una opción de privacidad compatible.");
      }
    } catch (e: any) {
      setFatal(e.message || "No se pudo consultar TikTok.");
    } finally {
      setLoadingInfo(false);
    }
  }

  async function removeAccount(id: string) {
    try {
      await jsonFetch(`/api/tiktok/accounts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      setAccounts((x) => x.filter((a) => a.id !== id));
      setSelected((x) => x.filter((a) => a !== id));
      setPendingRemove(null);
    } catch (e: any) {
      setPendingRemove(null);
      setFatal(e.message || "No se pudo desconectar la cuenta.");
    }
  }

  function updateResult(accountId: string, patch: Partial<Result>) {
    setResults((old) =>
      old.map((r) => (r.accountId === accountId ? { ...r, ...patch } : r))
    );
  }

  async function publish() {
    setFatal("");
    if (!file) return setFatal("Elegí un archivo MP4, MOV o WebM.");
    if (!caption.trim()) return setFatal("Escribí una descripción.");
    if (!selected.length) return setFatal("Seleccioná al menos una cuenta.");
    if (!privacy) return setFatal("Elegí la privacidad.");
    if (!["video/mp4", "video/quicktime", "video/webm"].includes(file.type)) {
      return setFatal("Usá MP4, MOV/QuickTime o WebM.");
    }

    setPublishing(true);
    setResults(
      selectedAccounts.map((a) => ({
        accountId: a.id,
        name: a.display_name,
        state: "preparing"
      }))
    );

    for (const account of selectedAccounts) {
      try {
        updateResult(account.id, { state: "preparing", message: "Preparando publicación…" });
        const init = await jsonFetch("/api/tiktok/init-post", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accountId: account.id,
            caption: caption.trim(),
            privacyLevel: privacy,
            videoSize: file.size
          })
        });
        updateResult(account.id, {
          state: "uploading",
          publishId: init.publishId,
          message: "Subiendo 0%…"
        });
        await uploadFileInChunks(
          file,
          init.uploadUrl,
          init.chunkSize,
          init.totalChunkCount,
          (pct) => updateResult(account.id, { message: `Subiendo ${pct}%…` })
        );
        updateResult(account.id, {
          state: "processing",
          message: "TikTok está procesando el video…"
        });

        let finished = false;
        for (let tries = 0; tries < 12; tries++) {
          await new Promise((r) => setTimeout(r, 5000));
          const status = await jsonFetch(
            `/api/tiktok/status?accountId=${encodeURIComponent(account.id)}&publishId=${encodeURIComponent(init.publishId)}`
          );
          const s = String(status.status || status.publish_status || "").toUpperCase();
          if (["PUBLISH_COMPLETE", "SUCCESS", "COMPLETED"].includes(s)) {
            updateResult(account.id, { state: "done", message: "Publicado correctamente." });
            finished = true;
            break;
          }
          if (["FAILED", "PUBLISH_FAILED", "ERROR"].includes(s)) {
            throw new Error(
              status.fail_reason || status.error_message || "TikTok rechazó la publicación."
            );
          }
        }
        if (!finished) {
          updateResult(account.id, {
            state: "processing",
            message: "Video enviado. TikTok continúa procesándolo."
          });
        }
      } catch (e: any) {
        updateResult(account.id, {
          state: "error",
          message: e.message || "Error desconocido."
        });
      }
    }
    setPublishing(false);
  }

  const metrics = (
    <div className="vdMetrics">
      {[
        ["Vistas totales", "—", "Disponible al activar Analytics", "01"],
        ["Me gusta", "—", "Todas tus cuentas", "02"],
        ["Comentarios", "—", "Interacciones acumuladas", "03"],
        ["Alcance extra", "—", "Vs. mejor cuenta individual", "04"]
      ].map(([title, value, meta, number]) => (
        <div className="vdMetric" key={title}>
          <div className="vdMetricHead"><span>{title}</span><span>{number}</span></div>
          <div className="vdMetricValue">{value}</div>
          <div className="vdMetricMeta">{meta}</div>
        </div>
      ))}
    </div>
  );

  const accountList = (
    <div className="vdAccountList">
      {accounts.length === 0 && <div className="vdEmpty">Todavía no conectaste ninguna cuenta.</div>}
      {accounts.map((account) => {
        const checked = selected.includes(account.id);
        return (
          <div className={`vdAccount ${checked ? "selected" : ""}`} key={account.id}>
            <input
              className="vdCheckbox"
              type="checkbox"
              checked={checked}
              onChange={() => toggleAccount(account.id)}
            />
            {account.avatar_url
              ? <img className="vdAvatar" src={account.avatar_url} alt="" />
              : <div className="vdAvatar" />}
            <div className="vdAccountMain">
              <strong>{account.display_name}</strong>
              <span>Conectada</span>
            </div>
            <button
              className="vdRemove"
              onClick={() => setPendingRemove(account)}
              aria-label="Desconectar"
            >×</button>
          </div>
        );
      })}
    </div>
  );

  const publishingCard = (
    <section className="vdCard">
      <div className="vdCardHead">
        <div><div className="vdLabel">Publicación</div><h2>Nueva publicación</h2></div>
        <span className="vdCount">01</span>
      </div>
      <div className="vdUpload">
        <input
          type="file"
          accept="video/mp4,video/quicktime,video/webm"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <strong>{file ? file.name : "+  Subí tu video"}</strong>
        <p>{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "MP4, MOV o WebM"}</p>
      </div>
      <div className="vdField">
        <label>Descripción</label>
        <textarea
          className="vdTextarea"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Escribí la descripción, hashtags, etc."
          maxLength={2200}
        />
      </div>
      <div className="vdField">
        <label>Privacidad</label>
        <select
          className="vdSelect"
          value={privacy}
          disabled={!selected.length || loadingInfo}
          onChange={(e) => setPrivacy(e.target.value)}
        >
          <option value="">{loadingInfo ? "Consultando TikTok…" : "Elegí una opción"}</option>
          {privacyOptions.map((p) => <option value={p} key={p}>{privacyLabel(p)}</option>)}
        </select>
      </div>
      <button
        className="vdPrimary vdPublishBtn"
        disabled={publishing || loadingInfo}
        onClick={publish}
      >
        {publishing ? "Publicando…" : `Publicar en ${selected.length} cuenta${selected.length === 1 ? "" : "s"} ↗`}
      </button>
    </section>
  );

  function renderDashboard() {
    return <>
      <div className="vdTop">
        <div>
          <div className="vdEyebrow">CENTRO DE OPERACIONES</div>
          <h1>Tu contenido. <em>Multiplicado.</em></h1>
          <div className="vdSub">Una vista rápida de tu operación. Entrá a cada módulo para trabajar en detalle.</div>
        </div>
        <a href="/api/tiktok/connect"><button className="vdConnect">+ Conectar TikTok</button></a>
      </div>

      {metrics}

      <div className="vdOverviewGrid">
        <button className="vdOverviewCard" onClick={() => setActiveSection("publish")}>
          <span className="vdLabel">PUBLICAR</span>
          <strong>Crear una nueva publicación</strong>
          <p>Subí un video, elegí las cuentas y publicá desde un solo flujo.</p>
          <b>Ir a Publicar ↗</b>
        </button>
        <button className="vdOverviewCard" onClick={() => setActiveSection("accounts")}>
          <span className="vdLabel">RED</span>
          <strong>{accounts.length} cuenta{accounts.length === 1 ? "" : "s"} conectada{accounts.length === 1 ? "" : "s"}</strong>
          <p>Gestioná las cuentas que forman parte de tu red de distribución.</p>
          <b>Ver Cuentas ↗</b>
        </button>
        <button className="vdOverviewCard" onClick={() => setActiveSection("history")}>
          <span className="vdLabel">HISTORIAL</span>
          <strong>{results.length} actividad{results.length === 1 ? "" : "es"} reciente{results.length === 1 ? "" : "s"}</strong>
          <p>Revisá estados, errores y publicaciones procesadas.</p>
          <b>Ver Historial ↗</b>
        </button>
        <button className="vdOverviewCard" onClick={() => setActiveSection("analytics")}>
          <span className="vdLabel">ANALYTICS</span>
          <strong>Panel preparado para métricas</strong>
          <p>Vistas, likes, comentarios, alcance extra y comparativas por cuenta.</p>
          <b>Abrir Analytics ↗</b>
        </button>
      </div>

      <div className="vdGrid vdWide">
        <section className="vdCard">
          <div className="vdCardHead">
            <div><div className="vdLabel">ESTADO GENERAL</div><h2>Operación VYRAL</h2></div>
            <span className="vdSoonBadge">En línea</span>
          </div>
          <div className="vdSummaryRows">
            <div><span>API de publicación</span><b>Conectada</b></div>
            <div><span>Cuentas TikTok</span><b>{accounts.length}</b></div>
            <div><span>Analytics</span><b>Próximamente</b></div>
          </div>
        </section>
        <section className="vdCard">
          <div className="vdCardHead">
            <div><div className="vdLabel">ACTIVIDAD</div><h2>Último movimiento</h2></div>
            <span className="vdCount">{results.length}</span>
          </div>
          {results.length === 0
            ? <div className="vdEmpty">Todavía no hay actividad reciente.</div>
            : <div className="vdResults">{results.slice(0, 3).map((r) => (
                <div className="vdResult" key={r.accountId}>
                  <div><b>{r.name}</b><div><span>{r.message || r.state}</span></div></div>
                  <span>{r.state === "done" ? "✓" : r.state === "error" ? "!" : "●"}</span>
                </div>
              ))}</div>}
        </section>
      </div>
    </>;
  }

  function renderSection() {
    if (activeSection === "dashboard") return renderDashboard();

    if (activeSection === "publish") {
      return <>
        <div className="vdEyebrow">PUBLICAR</div>
        <h1 className="vdSectionTitle">Nueva publicación</h1>
        <div className="vdSectionSub">Este es el módulo de trabajo: prepará un video y distribuílo en las cuentas que elijas.</div>
        <div className="vdGrid">
          {publishingCard}
          <section className="vdCard">
            <div className="vdCardHead">
              <div><div className="vdLabel">DESTINO</div><h2>Seleccioná cuentas</h2></div>
              <span className="vdCount">{accounts.length}</span>
            </div>
            {accountList}
          </section>
        </div>
      </>;
    }

    if (activeSection === "accounts") {
      return <>
        <div className="vdTop">
          <div>
            <div className="vdEyebrow">CUENTAS</div>
            <h1 className="vdSectionTitle">Tus cuentas conectadas</h1>
            <div className="vdSectionSub">Acá solamente administrás la red de cuentas conectadas a VYRAL.</div>
          </div>
          <a href="/api/tiktok/connect"><button className="vdConnect">+ Conectar TikTok</button></a>
        </div>
        <section className="vdCard">
          <div className="vdCardHead">
            <div><div className="vdLabel">RED</div><h2>{accounts.length} cuenta{accounts.length === 1 ? "" : "s"} conectada{accounts.length === 1 ? "" : "s"}</h2></div>
          </div>
          {accountList}
        </section>
      </>;
    }

    if (activeSection === "history") {
      return <>
        <div className="vdEyebrow">HISTORIAL</div>
        <h1 className="vdSectionTitle">Historial de publicaciones</h1>
        <div className="vdSectionSub">Este módulo muestra envíos, estados y errores. No mezcla estadísticas de rendimiento.</div>
        <section className="vdCard">
          {results.length === 0
            ? <div className="vdEmpty">Todavía no hay publicaciones registradas en esta sesión.</div>
            : results.map((r) => (
                <div className="vdHistoryRow" key={r.accountId}>
                  <div><strong>{r.name}</strong><p>{r.message || r.state}</p></div>
                  <div className="vdHistoryState">{r.state}</div>
                </div>
              ))}
        </section>
      </>;
    }

    return <>
      <div className="vdTop">
        <div>
          <div className="vdEyebrow">ANALYTICS</div>
          <h1 className="vdSectionTitle">Todo tu rendimiento, en un solo lugar.</h1>
          <div className="vdSectionSub">Este módulo será exclusivamente de métricas y comparativas. No se publica contenido desde acá.</div>
        </div>
        <span className="vdSoonBadge">Próximamente</span>
      </div>
      {metrics}
      <div className="vdAnalyticsGrid">
        {[
          ["Rendimiento global", "Vistas, likes, comentarios, compartidos y crecimiento total de todas tus cuentas."],
          ["Rendimiento por cuenta", "Comparación individual para detectar qué cuenta está generando más impacto."],
          ["Alcance extra VYRAL", "Cuánto alcance adicional genera distribuir un mismo contenido en varias cuentas."],
          ["Crecimiento de seguidores", "Variación de seguidores por período y por cuenta conectada."],
          ["Top publicaciones", "Ranking de videos por vistas, engagement, comentarios y compartidos."],
          ["Comparativas 7 / 30 días", "Evolución contra períodos anteriores para medir crecimiento real."]
        ].map(([title, text]) => (
          <div className="vdAnalyticsBox" key={title}>
            <span className="vdSoonBadge">Próximamente</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
      <div className="vdSpacer" />
      <section className="vdCard">
        <div className="vdCardHead">
          <div><div className="vdLabel">VISTA PREVIA</div><h2>Rendimiento últimos 30 días</h2></div>
          <span className="vdSoonBadge">Esperando API</span>
        </div>
        <div className="vdBars">
          {[22,29,40,47,58,64,72,69,80,87,82,96,89,100].map((h,i) => (
            <div className="vdBar" key={i} style={{ height: `${h}%` }} />
          ))}
        </div>
      </section>
    </>;
  }

  return (
    <main className="vyralDash">
      <aside className="vdSidebar">
        <div className="vdLogo">V<b>Y</b>RAL</div>
        <nav className="vdNav">
          <button className={activeSection === "dashboard" ? "active" : ""} onClick={() => setActiveSection("dashboard")}><span>⌂</span><span>Dashboard</span></button>
          <button className={activeSection === "publish" ? "active" : ""} onClick={() => setActiveSection("publish")}><span>↗</span><span>Publicar</span></button>
          <button className={activeSection === "accounts" ? "active" : ""} onClick={() => setActiveSection("accounts")}><span>◎</span><span>Cuentas</span></button>
          <button className={activeSection === "history" ? "active" : ""} onClick={() => setActiveSection("history")}><span>▥</span><span>Historial</span></button>
          <button className={activeSection === "analytics" ? "active" : ""} onClick={() => setActiveSection("analytics")}><span>⌁</span><span>Analytics</span><span className="vdSoon">PRÓX.</span></button>
        </nav>
        <div className="vdSideBottom">
          <div className="vdApi"><i /> API conectada</div>
          <form action="/api/logout" method="post"><button className="vdLogout">Cerrar sesión</button></form>
        </div>
      </aside>

      <section className="vdMain">{renderSection()}</section>

      {fatal && (
        <div className="vdNotice err">
          <button className="vdNoticeClose" onClick={() => setFatal("")} aria-label="Cerrar">×</button>
          <strong>Necesitamos corregir algo</strong>
          <p>{fatal}</p>
        </div>
      )}

      {queryNoticeVisible && connected && !fatal && (
        <div className="vdNotice ok">
          <button className="vdNoticeClose" onClick={dismissQueryNotice} aria-label="Cerrar">×</button>
          <strong>Cuenta conectada</strong>
          <p>TikTok se conectó correctamente a VYRAL.</p>
        </div>
      )}

      {queryNoticeVisible && oauthError && !connected && (
        <div className="vdNotice err">
          <button className="vdNoticeClose" onClick={dismissQueryNotice} aria-label="Cerrar">×</button>
          <strong>No se pudo conectar TikTok</strong>
          <p>{oauthError === "state_mismatch"
            ? "La autorización no pudo validarse. Volvé a tocar Conectar TikTok e intentá nuevamente."
            : decodeURIComponent(oauthError)}</p>
        </div>
      )}

      {pendingRemove && (
        <div className="vdModalBackdrop" onClick={() => setPendingRemove(null)}>
          <div className="vdModal" onClick={(e) => e.stopPropagation()}>
            <div className="vdLabel">VYRAL</div>
            <h3>¿Desconectar esta cuenta?</h3>
            <p>Vas a quitar <b>{pendingRemove.display_name}</b> de tu panel. Podés volver a conectarla cuando quieras.</p>
            <div className="vdModalActions">
              <button className="vdSecondary" onClick={() => setPendingRemove(null)}>Cancelar</button>
              <button className="vdDanger" onClick={() => removeAccount(pendingRemove.id)}>Desconectar</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
