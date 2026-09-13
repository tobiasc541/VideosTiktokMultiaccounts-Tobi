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
  privacy_level_options: string[];
};

type Result = {
  accountId: string;
  name: string;
  state: "preparing" | "uploading" | "processing" | "done" | "error";
  message?: string;
  publishId?: string;
};

type Section = "dashboard" | "publish" | "accounts" | "history" | "analytics";

type HoverPoint = {
  index: number;
  views: number;
} | null;

const exampleViews = [
  13200, 17400, 15100, 22100, 25200, 23500, 28800, 33100, 30600, 38400,
  35400, 40800, 44400, 41400, 49200, 45600, 52800, 48600, 55800, 52200,
  60000, 54600, 57600, 50400, 54000, 46800, 51600, 55200, 53400, 58200
];

function privacyLabel(v: string) {
  const map: Record<string, string> = {
    PUBLIC_TO_EVERYONE: "Público",
    MUTUAL_FOLLOW_FRIENDS: "Amigos",
    FOLLOWER_OF_CREATOR: "Seguidores",
    SELF_ONLY: "Solo yo"
  };
  return map[v] || v;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("es-AR").format(value);
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
    if (![200, 201, 206].includes(res.status)) {
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
  const [hoverPoint, setHoverPoint] = useState<HoverPoint>(null);

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
    if (!next.length) return;

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
      if (!common.length) {
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

  const dashboardMetrics = (
    <div className="vdMetrics">
      {[
        ["Vistas totales", "284.750", "+18,4% vs. período anterior", "01"],
        ["Me gusta", "31.420", "11,0% sobre vistas", "02"],
        ["Comentarios", "2.840", "Interacciones acumuladas", "03"],
        ["Alcance extra", "+192%", "Vs. mejor cuenta individual", "04"]
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
      {!accounts.length && <div className="vdEmpty">Todavía no conectaste ninguna cuenta.</div>}
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

      {dashboardMetrics}

      <div className="vdOverviewGrid">
        <button className="vdOverviewCard" onClick={() => setActiveSection("publish")}>
          <span className="vdLabel">PUBLICAR</span>
          <strong>Crear una nueva publicación</strong>
          <p>Subí un video, elegí las cuentas y publicá desde un solo flujo.</p>
          <b>Ir a Publicar ↗</b>
        </button>
        <button className="vdOverviewCard" onClick={() => setActiveSection("accounts")}>
          <span className="vdLabel">RED</span>
          <strong>{accounts.length} cuentas conectadas</strong>
          <p>Gestioná las cuentas que forman parte de tu red de distribución.</p>
          <b>Ver Cuentas ↗</b>
        </button>
        <button className="vdOverviewCard" onClick={() => setActiveSection("history")}>
          <span className="vdLabel">HISTORIAL</span>
          <strong>{results.length} actividades recientes</strong>
          <p>Revisá estados, errores y publicaciones procesadas.</p>
          <b>Ver Historial ↗</b>
        </button>
        <button className="vdOverviewCard" onClick={() => setActiveSection("analytics")}>
          <span className="vdLabel">ANALYTICS</span>
          <strong>284.750 vistas combinadas</strong>
          <p>Rendimiento consolidado, alcance adicional y comparativas por cuenta.</p>
          <b>Abrir Analytics ↗</b>
        </button>
      </div>

      <div className="vdGrid vdWide">
        <section className="vdCard">
          <div className="vdCardHead">
            <div><div className="vdLabel">RENDIMIENTO</div><h2>Últimos 30 días</h2></div>
            <span className="vdExampleBadge">EJEMPLO</span>
          </div>
          <div className="vdMiniStats">
            <div><span>Vistas</span><b>284.750</b></div>
            <div><span>Seguidores</span><b>+4.680</b></div>
            <div><span>Compartidos</span><b>8.210</b></div>
          </div>
        </section>
        <section className="vdCard">
          <div className="vdCardHead">
            <div><div className="vdLabel">IMPACTO VYRAL</div><h2>Distribución multicuentas</h2></div>
            <span className="vdExampleBadge">EJEMPLO</span>
          </div>
          <div className="vdImpactCompare compact">
            <div><span>Mejor cuenta individual</span><b>118.400</b></div>
            <div><span>Vistas adicionales</span><b>+166.350</b></div>
            <div><span>Multiplicador</span><b>2,40×</b></div>
          </div>
        </section>
      </div>
    </>;
  }

  function renderInteractiveChart() {
    return (
      <section className="vdCard vdChartCard">
        <div className="vdCardHead">
          <div><div className="vdLabel">RENDIMIENTO · EJEMPLO</div><h2>Vistas combinadas · últimos 30 días</h2></div>
          <span className="vdExampleBadge">EJEMPLO</span>
        </div>
        <div className="vdChartWrap">
          <div className="vdChartAxis"><span>60K</span><span>40K</span><span>20K</span><span>0</span></div>
          <div className="vdBars vdExampleBars" onMouseLeave={() => setHoverPoint(null)}>
            {exampleViews.map((views, i) => (
              <div
                className={`vdBar ${hoverPoint?.index === i ? "isHover" : ""}`}
                key={i}
                style={{ height: `${Math.max(8, Math.round((views / 60000) * 100))}%` }}
                onMouseEnter={() => setHoverPoint({ index: i, views })}
                tabIndex={0}
                onFocus={() => setHoverPoint({ index: i, views })}
                onBlur={() => setHoverPoint(null)}
                aria-label={`Día ${i + 1}: ${formatNumber(views)} vistas`}
              />
            ))}
          </div>
          {hoverPoint && (
            <div
              className="vdChartTooltip"
              style={{ left: `${((hoverPoint.index + 0.5) / exampleViews.length) * 100}%` }}
            >
              <span>Día {hoverPoint.index + 1}</span>
              <strong>{formatNumber(hoverPoint.views)} vistas</strong>
            </div>
          )}
        </div>
        <div className="vdChartDates"><span>Día 1</span><span>Día 10</span><span>Día 20</span><span>Día 30</span></div>
      </section>
    );
  }

  function renderSection() {
    if (activeSection === "dashboard") return renderDashboard();

    if (activeSection === "publish") {
      return <>
        <div className="vdEyebrow">PUBLICAR</div>
        <h1 className="vdSectionTitle">Nueva publicación</h1>
        <div className="vdSectionSub">Prepará un video y distribuílo en las cuentas que elijas.</div>
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
            <div className="vdSectionSub">Administrá la red de cuentas conectadas a VYRAL.</div>
          </div>
          <a href="/api/tiktok/connect"><button className="vdConnect">+ Conectar TikTok</button></a>
        </div>
        <section className="vdCard">
          <div className="vdCardHead">
            <div><div className="vdLabel">RED</div><h2>{accounts.length} cuentas conectadas</h2></div>
          </div>
          {accountList}
        </section>
      </>;
    }

    if (activeSection === "history") {
      return <>
        <div className="vdEyebrow">HISTORIAL</div>
        <h1 className="vdSectionTitle">Historial de publicaciones</h1>
        <div className="vdSectionSub">Envíos, estados y errores de tus publicaciones.</div>
        <section className="vdCard">
          {!results.length
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

    const exampleMetrics = [
      ["Vistas totales", "284.750", "+18,4% vs. período anterior"],
      ["Me gusta", "31.420", "11,0% sobre vistas"],
      ["Comentarios", "2.840", "Interacciones acumuladas"],
      ["Compartidos", "8.210", "2,9% sobre vistas"],
      ["Seguidores", "+4.680", "Crecimiento en 30 días"],
      ["Alcance extra VYRAL", "+192%", "Vs. mejor cuenta individual"]
    ];

    const accountExamples = [
      ["@vyral.main", "118.400", "12.840", "1.020"],
      ["@vyral.media", "82.650", "9.730", "870"],
      ["@vyral.lab", "53.200", "5.940", "590"],
      ["@vyral.clips", "30.500", "2.910", "360"]
    ];

    return <>
      <div className="vdTop">
        <div>
          <div className="vdEyebrow">ANALYTICS</div>
          <h1 className="vdSectionTitle">Todo tu rendimiento, en un solo lugar.</h1>
        </div>
        <span className="vdExampleBadge">DATOS DE EJEMPLO</span>
      </div>

      <div className="vdExampleMetrics">
        {exampleMetrics.map(([t, v, m]) => (
          <div className="vdExampleMetric" key={t}>
            <span>{t}</span>
            <strong>{v}</strong>
            <small>{m}</small>
          </div>
        ))}
      </div>

      <div className="vdAnalyticsMain">
        {renderInteractiveChart()}
        <section className="vdCard">
          <div className="vdCardHead">
            <div><div className="vdLabel">IMPACTO VYRAL · EJEMPLO</div><h2>¿Qué aportó la distribución?</h2></div>
          </div>
          <div className="vdImpactHero">
            <span>Alcance combinado</span>
            <strong>284.750</strong>
            <small>vistas entre 4 cuentas</small>
          </div>
          <div className="vdImpactCompare">
            <div><span>Mejor cuenta individual</span><b>118.400</b></div>
            <div><span>Vistas adicionales</span><b>+166.350</b></div>
            <div><span>Multiplicador de distribución</span><b>2,40×</b></div>
          </div>
        </section>
      </div>

      <section className="vdCard vdExampleTable">
        <div className="vdCardHead">
          <div><div className="vdLabel">CUENTAS · EJEMPLO</div><h2>Rendimiento por cuenta</h2></div>
          <span className="vdExampleBadge">EJEMPLO</span>
        </div>
        <div className="vdTableHead"><span>Cuenta</span><span>Vistas</span><span>Me gusta</span><span>Comentarios</span></div>
        {accountExamples.map((row) => (
          <div className="vdTableRow" key={row[0]}>
            <strong>{row[0]}</strong><span>{row[1]}</span><span>{row[2]}</span><span>{row[3]}</span>
          </div>
        ))}
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
