"use client";

import { useMemo, useState } from "react";

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

  // TikTok define total_chunk_count como floor(video_size/chunk_size).
  // El último bloque absorbe el resto.
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
  const [accounts, setAccounts] = useState(initialAccounts);
  const [selected, setSelected] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [privacyOptions, setPrivacyOptions] = useState<string[]>([]);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [fatal, setFatal] = useState("");

  const selectedAccounts = useMemo(
    () => accounts.filter((a) => selected.includes(a.id)),
    [accounts, selected]
  );

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
        const info = await jsonFetch(`/api/tiktok/creator-info?accountId=${encodeURIComponent(accountId)}`);
        infos.push(info);
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
    if (!confirm("¿Desconectar esta cuenta?")) return;
    await jsonFetch(`/api/tiktok/accounts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    setAccounts((x) => x.filter((a) => a.id !== id));
    setSelected((x) => x.filter((a) => a !== id));
  }

  function updateResult(accountId: string, patch: Partial<Result>) {
    setResults((old) =>
      old.map((r) => (r.accountId === accountId ? { ...r, ...patch } : r))
    );
  }

  async function publish() {
    setFatal("");
    if (!file) return setFatal("Elegí un archivo MP4.");
    if (!caption.trim()) return setFatal("Escribí una descripción.");
    if (!selected.length) return setFatal("Seleccioná al menos una cuenta.");
    if (!privacy) return setFatal("Elegí la privacidad.");

    if (!["video/mp4", "video/quicktime", "video/webm"].includes(file.type)) {
      return setFatal("Usá MP4, MOV/QuickTime o WebM. Para tu caso te recomiendo MP4 H.264.");
    }

    setPublishing(true);
    const seed: Result[] = selectedAccounts.map((a) => ({
      accountId: a.id,
      name: a.display_name,
      state: "preparing"
    }));
    setResults(seed);

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

        // Consultar estado durante ~60 s. Si sigue procesando, no lo marcamos como error.
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
            throw new Error(status.fail_reason || status.error_message || "TikTok rechazó la publicación.");
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

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="brand">
            <div className="logo">MP</div>
            TikTok Multi Poster
          </div>
          <div className="muted" style={{ marginTop: 6 }}>
            Un video, varias cuentas.
          </div>
        </div>
        <div className="row">
          <a href="/api/tiktok/connect"><button className="btn">+ Conectar TikTok</button></a>
          <form action="/api/logout" method="post"><button className="btn secondary">Salir</button></form>
        </div>
      </header>

      {fatal && <div className="errorBox" style={{ marginBottom: 18 }}>{fatal}</div>}

      <div className="grid">
        <section className="panel stack">
          <div>
            <h2 className="sectionTitle">1. Video</h2>
            <div className="drop">
              <input
                type="file"
                accept="video/mp4,video/quicktime,video/webm"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <div className="fileName">
                {file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : "Elegí tu MP4"}
              </div>
            </div>
          </div>

          <div>
            <label className="label">Descripción</label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Escribí la descripción, hashtags, etc."
              maxLength={2200}
            />
            <div className="small" style={{ textAlign:"right", marginTop:6 }}>
              {caption.length}/2200
            </div>
          </div>

          <div>
            <label className="label">Privacidad</label>
            <select
              value={privacy}
              disabled={!selected.length || loadingInfo}
              onChange={(e) => setPrivacy(e.target.value)}
            >
              <option value="">
                {loadingInfo ? "Consultando TikTok…" : "Elegí una opción"}
              </option>
              {privacyOptions.map((p) => (
                <option value={p} key={p}>{privacyLabel(p)}</option>
              ))}
            </select>
          </div>

          <button
            className="btn"
            disabled={publishing || loadingInfo}
            onClick={publish}
          >
            {publishing ? "Publicando…" : `Publicar en ${selected.length || 0} cuenta${selected.length === 1 ? "" : "s"}`}
          </button>

          <div className="notice">
            TikTok exige autorización de cada cuenta y consentimiento antes de publicar. Las apps no auditadas quedan limitadas a publicaciones privadas hasta pasar la auditoría.
          </div>
        </section>

        <section className="panel stack">
          <div>
            <h2 className="sectionTitle">2. Cuentas TikTok</h2>
            <div className="small">Seleccioná dónde querés publicar.</div>
          </div>

          {accounts.length === 0 && (
            <div className="notice">
              Todavía no conectaste ninguna cuenta. Tocá <b>+ Conectar TikTok</b>.
            </div>
          )}

          {accounts.map((account) => {
            const checked = selected.includes(account.id);
            return (
              <div className={`account ${checked ? "selected" : ""}`} key={account.id}>
                <input
                  className="checkbox"
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleAccount(account.id)}
                />
                {account.avatar_url
                  ? <img className="avatar" src={account.avatar_url} alt="" />
                  : <div className="avatar" />}
                <div className="accountMain">
                  <div className="name">{account.display_name}</div>
                  <div className="small">Conectada</div>
                </div>
                <button className="btn danger" onClick={() => removeAccount(account.id)}>
                  ×
                </button>
              </div>
            );
          })}

          {results.length > 0 && (
            <>
              <div style={{ height: 4 }} />
              <h2 className="sectionTitle">Estado</h2>
              {results.map((r) => (
                <div className="status" key={r.accountId}>
                  <div>
                    <div className="name">{r.name}</div>
                    <div className="small">{r.message || r.state}</div>
                  </div>
                  <div className={
                    r.state === "done" ? "ok" :
                    r.state === "error" ? "err" : "warn"
                  }>
                    {r.state === "done" ? "✓" : r.state === "error" ? "!" : "●"}
                  </div>
                </div>
              ))}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
