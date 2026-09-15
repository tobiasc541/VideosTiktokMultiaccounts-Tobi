"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import "./automation-studio.css";

type Platform = "instagram" | "facebook" | "tiktok";
type TriggerMode = "exact" | "contains" | "ai_intent";
type Goal = "link_click" | "dm_started" | "lead" | "none";

type Automation = {
  id?: string;
  name: string;
  enabled: boolean;
  platforms: Platform[];
  contentLabel: string;
  triggerMode: TriggerMode;
  keywords: string[];
  excludeKeywords: string[];
  publicReplyEnabled: boolean;
  publicReply: string;
  dmEnabled: boolean;
  dmMessage: string;
  dmLink: string;
  aiEnabled: boolean;
  aiTone: string;
  aiInstructions: string;
  aiConfidence: number;
  humanHandoff: boolean;
  collectLead: boolean;
  leadTag: string;
  cooldownMinutes: number;
  maxRepliesPerUser: number;
  smartGuard: boolean;
  conversionGoal: Goal;
};

const blankAutomation = (): Automation => ({
  name: "Comentario → oportunidad",
  enabled: true,
  platforms: ["instagram", "facebook"],
  contentLabel: "",
  triggerMode: "contains",
  keywords: ["guia"],
  excludeKeywords: [],
  publicReplyEnabled: true,
  publicReply: "¡Listo! Te lo envié por mensaje privado. 👋",
  dmEnabled: true,
  dmMessage: "¡Hola! Acá tenés lo que pediste 👇",
  dmLink: "",
  aiEnabled: true,
  aiTone: "Profesional y cercano",
  aiInstructions: "Respondé breve, claro y sin prometer resultados. Si la intención no es clara, pedí una aclaración.",
  aiConfidence: 0.78,
  humanHandoff: true,
  collectLead: true,
  leadTag: "interesado-contenido",
  cooldownMinutes: 60,
  maxRepliesPerUser: 1,
  smartGuard: true,
  conversionGoal: "dm_started"
});

function ChipInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder: string }) {
  const [draft, setDraft] = useState("");
  function commit() {
    const v = draft.trim().toLowerCase();
    if (!v || value.includes(v)) return setDraft("");
    onChange([...value, v]);
    setDraft("");
  }
  return <div className="vaChipBox">
    {value.map((v) => <button type="button" key={v} className="vaChip" onClick={() => onChange(value.filter((x) => x !== v))}>{v}<span>×</span></button>)}
    <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={placeholder} onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); }
      if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
    }} onBlur={commit} />
  </div>;
}

export default function AutomationStudio() {
  const [mount, setMount] = useState<HTMLElement | null>(null);
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [draft, setDraft] = useState<Automation>(blankAutomation());
  const [saved, setSaved] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [testComment, setTestComment] = useState("Hola, quiero la guía");
  const [filename, setFilename] = useState("");
  const [captionPreview, setCaptionPreview] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      const btn = document.querySelector(".vdPublishBtn");
      const card = btn?.closest(".vdCard") as HTMLElement | null;
      if (card && !mount) setMount(card);
      const input = card?.querySelector('input[type="file"]') as HTMLInputElement | null;
      const area = card?.querySelector("textarea") as HTMLTextAreaElement | null;
      if (input?.files?.[0]?.name) setFilename(input.files[0].name);
      if (area?.value !== undefined) setCaptionPreview(area.value);
    }, 600);
    return () => window.clearInterval(timer);
  }, [mount]);

  useEffect(() => {
    fetch("/api/automations").then((r) => r.json()).then((j) => setSaved(j.automations || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (filename && !draft.contentLabel) setDraft((d) => ({ ...d, contentLabel: filename.replace(/\.[^.]+$/, "") }));
  }, [filename, draft.contentLabel]);

  const simulation = useMemo(() => {
    const c = testComment.trim().toLowerCase();
    const excluded = draft.excludeKeywords.some((k) => c.includes(k));
    const matched = draft.triggerMode === "ai_intent"
      ? c.length > 3
      : draft.triggerMode === "exact"
        ? draft.keywords.some((k) => c === k)
        : draft.keywords.some((k) => c.includes(k));
    return { excluded, matched: matched && !excluded };
  }, [testComment, draft]);

  function set<K extends keyof Automation>(key: K, value: Automation[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function togglePlatform(p: Platform) {
    if (p === "tiktok") return;
    set("platforms", draft.platforms.includes(p) ? draft.platforms.filter((x) => x !== p) : [...draft.platforms, p]);
  }

  async function saveAutomation() {
    setSaving(true); setNotice("");
    try {
      const res = await fetch("/api/automations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "No se pudo guardar");
      setSaved(json.automations || []);
      setDraft(json.automation);
      setNotice("Automatización guardada. Queda lista para conectar Meta API.");
    } catch (e: any) { setNotice(e.message || "Error al guardar"); }
    finally { setSaving(false); }
  }

  function loadRule(rule: Automation) { setDraft(rule); setOpen(true); }

  const compact = <div className="vaCompact">
    <div className="vaCompactTop">
      <div><span className="vaPulse"/><small>VYRAL AUTOMATIONS</small><strong>Convertí comentarios en conversaciones.</strong><p>Palabras clave, DM, links, IA, seguimiento y protección anti-spam por publicación.</p></div>
      <button type="button" className="vaOpen" onClick={() => setOpen(true)}>{draft.id ? "Editar automatización" : "+ Crear automatización"}</button>
    </div>
    {saved.length > 0 && <div className="vaQuickRow"><span className="vaSavedCount">{saved.length} guardada{saved.length === 1 ? "" : "s"}</span></div>}
  </div>;

  const modal = open ? <div className="vaOverlay" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
    <div className="vaModal">
      <header className="vaHeader">
        <div><small>VYRAL AUTOMATION STUDIO</small><h2>De comentario a oportunidad.</h2><p>Configurá qué detecta VYRAL, qué responde y qué pasa después.</p></div>
        <button type="button" onClick={() => setOpen(false)} className="vaClose">×</button>
      </header>

      <div className="vaHeroBar">
        <div><span>CONTENIDO VINCULADO</span><b>{draft.contentLabel || filename || "Esta publicación"}</b><small>{captionPreview ? `“${captionPreview.slice(0, 74)}${captionPreview.length > 74 ? "…" : ""}”` : "Se asociará a la publicación que estás preparando."}</small></div>
        <div className="vaStatus"><i/> Preparada para conectar APIs</div>
      </div>

      <div className="vaGrid">
        <section className="vaPanel vaPanelMain">
          <div className="vaSectionTitle"><span>01</span><div><b>Disparador inteligente</b><small>Definí qué comentario activa el flujo.</small></div></div>
          <div className="vaPlatformRow">
            <button type="button" className={draft.platforms.includes("instagram") ? "active" : ""} onClick={() => togglePlatform("instagram")}><span>◎</span>Instagram<small>Meta API</small></button>
            <button type="button" className={draft.platforms.includes("facebook") ? "active" : ""} onClick={() => togglePlatform("facebook")}><span>f</span>Facebook<small>Meta API</small></button>
            <button type="button" className="disabled"><span>♪</span>TikTok<small>Próximamente</small></button>
          </div>

          <label className="vaLabel">Nombre interno</label>
          <input className="vaInput" value={draft.name} onChange={(e) => set("name", e.target.value)} />

          <div className="vaModeTabs">
            {[["exact","Coincidencia exacta"],["contains","Contiene palabra"],["ai_intent","Intención con IA"]].map(([v,l]) => <button type="button" key={v} onClick={() => set("triggerMode", v as TriggerMode)} className={draft.triggerMode === v ? "active" : ""}>{l}</button>)}
          </div>

          {draft.triggerMode !== "ai_intent" ? <>
            <label className="vaLabel">Palabras clave</label>
            <ChipInput value={draft.keywords} onChange={(v) => set("keywords", v)} placeholder="Escribí una palabra y Enter" />
          </> : <div className="vaAiIntent"><span>✦</span><div><b>VYRAL Intent AI</b><p>No depende de una palabra exacta: interpreta si la persona está pidiendo el recurso, precio, información o acceso.</p></div></div>}

          <label className="vaLabel">Excluir si el comentario contiene</label>
          <ChipInput value={draft.excludeKeywords} onChange={(v) => set("excludeKeywords", v)} placeholder="spam, estafa, no quiero…" />

          <div className="vaSectionTitle"><span>02</span><div><b>Acciones</b><small>Qué hace VYRAL cuando detecta la intención.</small></div></div>
          <div className="vaToggleCard">
            <label><input type="checkbox" checked={draft.publicReplyEnabled} onChange={(e) => set("publicReplyEnabled", e.target.checked)} /><span/><div><b>Respuesta pública</b><small>Confirma que el mensaje fue enviado.</small></div></label>
            {draft.publicReplyEnabled && <textarea className="vaTextarea" value={draft.publicReply} onChange={(e) => set("publicReply", e.target.value)} />}
          </div>
          <div className="vaToggleCard featured">
            <label><input type="checkbox" checked={draft.dmEnabled} onChange={(e) => set("dmEnabled", e.target.checked)} /><span/><div><b>Mensaje privado automático</b><small>Texto + enlace asociado a esta publicación.</small></div></label>
            {draft.dmEnabled && <><textarea className="vaTextarea" value={draft.dmMessage} onChange={(e) => set("dmMessage", e.target.value)} /><input className="vaInput" value={draft.dmLink} onChange={(e) => set("dmLink", e.target.value)} placeholder="https://tu-link.com/recurso" /></>}
          </div>

          <div className="vaSectionTitle"><span>03</span><div><b>VYRAL Intelligence</b><small>El plus: intención, contexto y control humano.</small></div></div>
          <div className="vaMagicGrid">
            <label className={draft.aiEnabled ? "on" : ""}><input type="checkbox" checked={draft.aiEnabled} onChange={(e) => set("aiEnabled", e.target.checked)} /><b>✦ Respuesta con IA</b><small>Personaliza sin perder el objetivo del flujo.</small></label>
            <label className={draft.smartGuard ? "on" : ""}><input type="checkbox" checked={draft.smartGuard} onChange={(e) => set("smartGuard", e.target.checked)} /><b>◇ Smart Guard</b><small>Evita loops, duplicados y respuestas agresivas.</small></label>
            <label className={draft.humanHandoff ? "on" : ""}><input type="checkbox" checked={draft.humanHandoff} onChange={(e) => set("humanHandoff", e.target.checked)} /><b>↗ Human Handoff</b><small>Escala conversaciones sensibles a una persona.</small></label>
            <label className={draft.collectLead ? "on" : ""}><input type="checkbox" checked={draft.collectLead} onChange={(e) => set("collectLead", e.target.checked)} /><b>◎ Opportunity Tag</b><small>Marca quién mostró intención real.</small></label>
          </div>

          {draft.aiEnabled && <div className="vaAiSettings"><div><label className="vaLabel">Tono</label><input className="vaInput" value={draft.aiTone} onChange={(e) => set("aiTone", e.target.value)} /></div><div><label className="vaLabel">Confianza mínima · {Math.round(draft.aiConfidence * 100)}%</label><input type="range" min="50" max="99" value={Math.round(draft.aiConfidence * 100)} onChange={(e) => set("aiConfidence", Number(e.target.value)/100)} /></div><label className="vaLabel">Instrucciones para la IA</label><textarea className="vaTextarea" value={draft.aiInstructions} onChange={(e) => set("aiInstructions", e.target.value)} /></div>}

          <button type="button" className="vaAdvancedToggle" onClick={() => setAdvanced(!advanced)}>{advanced ? "Ocultar controles avanzados" : "Abrir controles avanzados"} <span>{advanced ? "−" : "+"}</span></button>
          {advanced && <div className="vaAdvanced">
            <div><label className="vaLabel">Cooldown por usuario</label><select className="vaInput" value={draft.cooldownMinutes} onChange={(e) => set("cooldownMinutes", Number(e.target.value))}><option value={15}>15 min</option><option value={60}>1 hora</option><option value={360}>6 horas</option><option value={1440}>24 horas</option></select></div>
            <div><label className="vaLabel">Máximo de respuestas</label><select className="vaInput" value={draft.maxRepliesPerUser} onChange={(e) => set("maxRepliesPerUser", Number(e.target.value))}><option value={1}>1 por usuario</option><option value={2}>2 por usuario</option><option value={3}>3 por usuario</option></select></div>
            <div><label className="vaLabel">Objetivo de conversión</label><select className="vaInput" value={draft.conversionGoal} onChange={(e) => set("conversionGoal", e.target.value as Goal)}><option value="dm_started">DM iniciado</option><option value="link_click">Click en enlace</option><option value="lead">Lead identificado</option><option value="none">Sin objetivo</option></select></div>
            <div><label className="vaLabel">Etiqueta del lead</label><input className="vaInput" value={draft.leadTag} onChange={(e) => set("leadTag", e.target.value)} /></div>
          </div>}
        </section>

        <aside className="vaPanel vaPreview">
          <div className="vaSectionTitle"><span>LIVE</span><div><b>Simulador</b><small>Probá el flujo antes de publicarlo.</small></div></div>
          <label className="vaLabel">Comentario de prueba</label>
          <textarea className="vaTextarea" value={testComment} onChange={(e) => setTestComment(e.target.value)} />
          <div className={`vaMatch ${simulation.matched ? "yes" : "no"}`}><span>{simulation.matched ? "✓" : "×"}</span><div><b>{simulation.matched ? "Activaría la automatización" : "No activaría el flujo"}</b><small>{simulation.excluded ? "Coincide con una exclusión." : draft.triggerMode === "ai_intent" ? "La IA evaluará intención y contexto." : `Modo: ${draft.triggerMode === "exact" ? "exacto" : "contiene"}`}</small></div></div>
          {simulation.matched && <div className="vaPhone">
            <div className="vaComment"><small>Comentario</small><b>@usuario</b><p>{testComment}</p></div>
            {draft.publicReplyEnabled && <div className="vaPublicBubble"><small>Respuesta pública</small><p>{draft.publicReply}</p></div>}
            {draft.dmEnabled && <div className="vaDmBubble"><small>Mensaje privado</small><p>{draft.dmMessage}</p>{draft.dmLink && <a>{draft.dmLink}</a>}<i>VYRAL {draft.aiEnabled ? "· IA" : "· AUTO"}</i></div>}
          </div>}

          <div className="vaDifferentiator">
            <small>VYRAL OPPORTUNITY ENGINE</small>
            <h3>No solo responde.<br/><em>Entiende qué oportunidad hay detrás.</em></h3>
            <p>Cada interacción puede quedar clasificada por intención, objetivo y etapa para medir qué contenido genera conversaciones reales.</p>
            <div className="vaOpportunityRow"><span>INTERÉS</span><b>ALTO</b><i>→ DM → LINK → LEAD</i></div>
          </div>

          <div className="vaApiNote"><b>Conexiones</b><p>La lógica y configuración quedan listas hoy. Mañana conectamos Meta Webhooks, Instagram Messaging, Facebook Messaging y OpenAI para ejecución real.</p></div>

          {!loading && saved.length > 0 && <div className="vaSavedList"><b>Automatizaciones guardadas</b>{saved.slice(0,4).map((r) => <button type="button" key={r.id} onClick={() => loadRule(r)}><span className={r.enabled ? "on" : ""}/><div><strong>{r.name}</strong><small>{r.keywords?.join(", ") || "IA por intención"}</small></div></button>)}</div>}
        </aside>
      </div>

      <footer className="vaFooter"><div>{notice && <span className="vaNotice">{notice}</span>}</div><div><button type="button" className="vaGhost" onClick={() => { setDraft(blankAutomation()); setNotice(""); }}>Nueva</button><button type="button" className="vaSave" disabled={saving} onClick={saveAutomation}>{saving ? "Guardando…" : "Guardar automatización ↗"}</button></div></footer>
    </div>
  </div> : null;

  if (!mount) return null;
  return createPortal(<>{compact}{modal}</>, mount);
}