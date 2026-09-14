"use client";

import { useMemo, useState } from "react";

type User = { id: string; email: string; name: string };

function maskEmail(email: string) {
  const [local, domain = ""] = email.split("@");
  const safe = local.length <= 2 ? `${local[0] || "u"}***` : `${local.slice(0,2)}***${local.slice(-1)}`;
  return `${safe}@${domain}`;
}

export default function Giveaway({ users }: { users: User[] }) {
  const [plan,setPlan] = useState("pro");
  const [winner,setWinner] = useState<User | null>(null);
  const [spinning,setSpinning] = useState(false);
  const [status,setStatus] = useState("");
  const eligible = useMemo(()=>users.filter(u=>u.email),[users]);
  const prizeLabel = plan === "inicio" ? "PLAN INICIO · 1 MES" : plan === "escala" ? "PLAN ESCALA · 1 MES" : "PLAN CRECIMIENTO · 1 MES";

  async function draw() {
    if (!eligible.length || spinning) return;
    setSpinning(true); setStatus("Sorteando entre usuarios activos…"); setWinner(null);
    await new Promise(r=>setTimeout(r,2200));
    const picked = eligible[Math.floor(Math.random()*eligible.length)];
    const res = await fetch("/api/admin/giveaway-award", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ userId:picked.id, plan }) });
    if (!res.ok) { setStatus("No se pudo otorgar el premio."); setSpinning(false); return; }
    setWinner(picked); setStatus("Premio otorgado automáticamente en VYRAL."); setSpinning(false);
  }

  function downloadCard() {
    if (!winner) return;
    const canvas = document.createElement("canvas"); canvas.width=1080; canvas.height=1350;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const g=ctx.createLinearGradient(0,0,1080,1350); g.addColorStop(0,"#050708"); g.addColorStop(.55,"#071214"); g.addColorStop(1,"#020304"); ctx.fillStyle=g; ctx.fillRect(0,0,1080,1350);
    ctx.strokeStyle="rgba(98,247,240,.35)"; ctx.lineWidth=2; ctx.strokeRect(55,55,970,1240);
    ctx.fillStyle="#78f4ef"; ctx.font="900 42px Arial"; ctx.fillText("VYRAL",80,125);
    ctx.fillStyle="#697782"; ctx.font="700 22px Arial"; ctx.fillText("GIVEAWAY · GANADOR OFICIAL",80,185);
    ctx.fillStyle="#ffffff"; ctx.font="900 88px Arial"; ctx.fillText("TENEMOS",80,360); ctx.fillText("GANADOR.",80,455);
    ctx.fillStyle="#78f4ef"; ctx.font="700 28px Arial"; ctx.fillText("PREMIO",80,560);
    ctx.fillStyle="#ffffff"; ctx.font="800 42px Arial"; ctx.fillText(prizeLabel,80,620);
    ctx.fillStyle="#697782"; ctx.font="700 26px Arial"; ctx.fillText("GANADOR",80,760);
    ctx.fillStyle="#ffffff"; ctx.font="800 54px Arial"; ctx.fillText(winner.name || "Usuario VYRAL",80,830);
    ctx.fillStyle="#98a4ad"; ctx.font="600 30px Arial"; ctx.fillText(maskEmail(winner.email),80,885);
    ctx.fillStyle="rgba(120,244,239,.08)"; ctx.fillRect(80,985,920,1);
    ctx.fillStyle="#78f4ef"; ctx.font="700 24px Arial"; ctx.fillText("CREÁ · DISTRIBUÍ · CRECÉ",80,1080);
    ctx.fillStyle="#697782"; ctx.font="500 24px Arial"; ctx.fillText("Premio asignado automáticamente a su cuenta.",80,1140);
    ctx.fillStyle="#ffffff"; ctx.font="italic 34px Georgia"; ctx.fillText("Hacerse viral nunca fue tan fácil.",80,1235);
    const a=document.createElement("a"); a.href=canvas.toDataURL("image/png"); a.download=`vyral-ganador-${Date.now()}.png`; a.click();
  }

  return <section className="adminGiveaway">
    <div className="adminSectionHead"><div><small>VYRAL GIVEAWAY</small><h2>Ruleta de sorteos</h2></div><span>{eligible.length} participantes</span></div>
    <div className="giveawayGrid"><div className={`giveawayWheel ${spinning?"spinning":""}`}><div className="wheelRing">{spinning?"VYRAL":"✦"}</div><p>{spinning?"Buscando ganador…":"Todos los usuarios entran automáticamente"}</p></div><div className="giveawayControl"><label>Premio</label><select value={plan} onChange={e=>setPlan(e.target.value)}><option value="inicio">1 mes · Inicio</option><option value="pro">1 mes · Crecimiento</option><option value="escala">1 mes · Escala</option></select><button onClick={draw} disabled={spinning||!eligible.length}>{spinning?"Sorteando…":"Sortear ahora ✦"}</button><small>{status}</small></div></div>
    {winner && <div className="giveawayWinner"><div><small>GANADOR</small><strong>{winner.name}</strong><span>{maskEmail(winner.email)}</span></div><div><b>{prizeLabel}</b><button onClick={downloadCard}>Descargar imagen Instagram ↓</button></div></div>}
  </section>;
}
