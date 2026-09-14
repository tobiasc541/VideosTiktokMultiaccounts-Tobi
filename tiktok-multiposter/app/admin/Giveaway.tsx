"use client";

import { useMemo, useState } from "react";

type User = { id: string; email: string; name: string };

function maskEmail(email: string) {
  const [local, domain = ""] = email.split("@");
  const safe = local.length <= 2 ? `${local[0] || "u"}***` : `${local.slice(0,2)}***${local.slice(-1)}`;
  return `${safe}@${domain}`;
}

function shortName(user: User) {
  const base = (user.name || user.email.split("@")[0] || "VYRAL").trim();
  return base.length > 12 ? `${base.slice(0,11)}…` : base;
}

export default function Giveaway({ users }: { users: User[] }) {
  const [plan,setPlan] = useState("pro");
  const [winner,setWinner] = useState<User | null>(null);
  const [spinning,setSpinning] = useState(false);
  const [status,setStatus] = useState("");
  const [rotation,setRotation] = useState(0);
  const eligible = useMemo(()=>users.filter(u=>u.email),[users]);
  const wheelUsers = eligible.slice(0,10);
  const prizeLabel = plan === "inicio" ? "PLAN INICIO · 1 MES" : plan === "escala" ? "PLAN ESCALA · 1 MES" : "PLAN CRECIMIENTO · 1 MES";

  async function draw() {
    if (!eligible.length || spinning) return;
    const picked = eligible[Math.floor(Math.random()*eligible.length)];
    setSpinning(true); setWinner(null); setStatus("La ruleta está eligiendo un ganador…");
    setRotation(old => old + 2160 + Math.floor(Math.random()*360));
    await new Promise(r=>setTimeout(r,3300));
    const res = await fetch("/api/admin/giveaway-award", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ userId:picked.id, plan }) });
    if (!res.ok) { setStatus("No se pudo otorgar el premio."); setSpinning(false); return; }
    setWinner(picked); setStatus("Ganador confirmado. El premio ya fue asignado automáticamente."); setSpinning(false);
  }

  function downloadCard() {
    if (!winner) return;
    const canvas = document.createElement("canvas"); canvas.width=1080; canvas.height=1350;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const bg=ctx.createLinearGradient(0,0,1080,1350); bg.addColorStop(0,"#020809"); bg.addColorStop(.48,"#071416"); bg.addColorStop(1,"#020304"); ctx.fillStyle=bg; ctx.fillRect(0,0,1080,1350);
    const glow=ctx.createRadialGradient(780,220,30,780,220,520); glow.addColorStop(0,"rgba(86,255,246,.24)"); glow.addColorStop(.45,"rgba(58,205,201,.08)"); glow.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=glow; ctx.fillRect(0,0,1080,800);
    ctx.strokeStyle="rgba(112,248,241,.42)"; ctx.lineWidth=2; ctx.strokeRect(48,48,984,1254); ctx.strokeStyle="rgba(255,255,255,.08)"; ctx.lineWidth=1; ctx.strokeRect(72,72,936,1206);
    for(let i=0;i<42;i++){const x=(i*151)%1080,y=(i*89)%1350;ctx.fillStyle=i%3===0?"rgba(120,246,240,.55)":"rgba(255,255,255,.16)";ctx.save();ctx.translate(x,y);ctx.rotate((i*.47)%3);ctx.fillRect(-2,-8,4,16);ctx.restore();}
    ctx.fillStyle="#7bf7f1";ctx.font="900 54px Arial";ctx.fillText("VYRAL",82,145);ctx.fillStyle="#77858f";ctx.font="700 21px Arial";ctx.fillText("GIVEAWAY · RESULTADO OFICIAL",82,192);
    ctx.fillStyle="#fff";ctx.font="900 94px Arial";ctx.fillText("TENEMOS",82,340);ctx.fillText("GANADOR",82,440);ctx.fillStyle="#7bf7f1";ctx.font="900 22px Arial";ctx.fillText("✦ SORTEO VYRAL",82,494);
    ctx.fillStyle="rgba(255,255,255,.035)";ctx.fillRect(82,555,916,186);ctx.strokeStyle="rgba(123,247,241,.2)";ctx.strokeRect(82,555,916,186);ctx.fillStyle="#7bf7f1";ctx.font="800 21px Arial";ctx.fillText("PREMIO DESBLOQUEADO",112,607);ctx.fillStyle="#fff";ctx.font="900 43px Arial";ctx.fillText(prizeLabel,112,678);
    ctx.fillStyle="#7b8992";ctx.font="800 20px Arial";ctx.fillText("GANADOR",82,832);ctx.fillStyle="#fff";ctx.font="900 68px Arial";ctx.fillText((winner.name||"Usuario VYRAL").toUpperCase(),82,914);ctx.fillStyle="#9aa7af";ctx.font="700 31px Arial";ctx.fillText(maskEmail(winner.email),82,965);
    ctx.fillStyle="rgba(123,247,241,.08)";ctx.fillRect(82,1043,916,2);ctx.fillStyle="#7bf7f1";ctx.font="800 24px Arial";ctx.fillText("CREÁ · DISTRIBUÍ · CRECÉ",82,1120);ctx.fillStyle="#71808a";ctx.font="500 23px Arial";ctx.fillText("Tu próxima oportunidad puede ser la siguiente.",82,1166);ctx.fillStyle="#fff";ctx.font="italic 39px Georgia";ctx.fillText("Hacerse viral nunca fue tan fácil.",82,1248);
    const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download=`vyral-ganador-${Date.now()}.png`;a.click();
  }

  return <section className="adminGiveaway">
    <div className="adminSectionHead"><div><small>VYRAL GIVEAWAY</small><h2>Ruleta de sorteos</h2></div><span>{eligible.length} participantes</span></div>
    <div className="giveawayGrid">
      <div className="giveawayWheelPanel">
        <div className="wheelPointer">▼</div>
        <div className="giveawayWheel" style={{transform:`rotate(${rotation}deg)`}}>
          <div className="wheelHub"><b>VYRAL</b><span>GIVEAWAY</span></div>
          {wheelUsers.map((u,i)=>{
            const angle=(Math.PI*2*i/Math.max(1,wheelUsers.length));
            const left=50+38*Math.sin(angle); const top=50-38*Math.cos(angle);
            return <span className="wheelName" key={u.id} style={{left:`${left}%`,top:`${top}%`,transform:`translate(-50%,-50%) rotate(${-rotation}deg)`}}>{shortName(u)}</span>;
          })}
        </div>
        <p>{eligible.length>10?`${eligible.length} usuarios participan · la rueda muestra una selección visual de 10`:`${eligible.length} usuarios participan en esta rueda`}</p>
      </div>
      <div className="giveawayControl"><div className="giveawayControlEyebrow">CONFIGURAR PREMIO</div><h3>Hacé girar la rueda.</h3><p>VYRAL elige al ganador, asigna el plan y deja lista la pieza para compartir.</p><label>Premio</label><select value={plan} onChange={e=>setPlan(e.target.value)}><option value="inicio">1 mes · Inicio</option><option value="pro">1 mes · Crecimiento</option><option value="escala">1 mes · Escala</option></select><button onClick={draw} disabled={spinning||!eligible.length}>{spinning?"Girando ruleta…":"Girar ruleta ✦"}</button><small>{status}</small></div>
    </div>
    {winner && <div className="giveawayWinner"><div><small>GANADOR CONFIRMADO</small><strong>{winner.name}</strong><span>{maskEmail(winner.email)}</span></div><div><b>{prizeLabel}</b><button onClick={downloadCard}>Generar imagen premium ↓</button></div></div>}
  </section>;
}
