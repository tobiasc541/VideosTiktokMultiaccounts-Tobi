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
  return base.length > 13 ? `${base.slice(0,12)}…` : base;
}

function drawVyralMark(ctx: CanvasRenderingContext2D, x:number, y:number, size:number) {
  const g=ctx.createLinearGradient(x,y,x+size,y+size); g.addColorStop(0,"#C9FFFC"); g.addColorStop(.45,"#63F3ED"); g.addColorStop(1,"#20C9C2");
  ctx.fillStyle=g; ctx.beginPath(); ctx.moveTo(x,y); ctx.lineTo(x+size*.3,y); ctx.lineTo(x+size*.5,y+size*.38); ctx.lineTo(x+size*.7,y); ctx.lineTo(x+size,y); ctx.lineTo(x+size*.5,y+size); ctx.closePath(); ctx.fill();
  ctx.fillStyle="#071012"; ctx.beginPath(); ctx.moveTo(x+size*.27,y); ctx.lineTo(x+size*.5,y+size*.48); ctx.lineTo(x+size*.73,y); ctx.lineTo(x+size*.61,y); ctx.lineTo(x+size*.5,y+size*.22); ctx.lineTo(x+size*.39,y); ctx.closePath(); ctx.fill();
}

export default function Giveaway({ users }: { users: User[] }) {
  const [plan,setPlan] = useState("pro");
  const [winner,setWinner] = useState<User | null>(null);
  const [spinning,setSpinning] = useState(false);
  const [status,setStatus] = useState("");
  const [rotation,setRotation] = useState(0);
  const eligible = useMemo(()=>users.filter(u=>u.email),[users]);
  const wheelUsers = eligible.slice(0,12);
  const prizeLabel = plan === "inicio" ? "PLAN INICIO · 1 MES" : plan === "escala" ? "PLAN ESCALA · 1 MES" : "PLAN CRECIMIENTO · 1 MES";

  async function draw() {
    if (!eligible.length || spinning) return;
    const picked = eligible[Math.floor(Math.random()*eligible.length)];
    setSpinning(true); setStatus("La ruleta está eligiendo un ganador…"); setWinner(null);
    setRotation((old)=>old + 1800 + (Math.floor(Math.random()*8)*45) + 17);
    await new Promise(r=>setTimeout(r,3300));
    const res = await fetch("/api/admin/giveaway-award", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ userId:picked.id, plan }) });
    if (!res.ok) { setStatus("No se pudo otorgar el premio."); setSpinning(false); return; }
    setWinner(picked); setStatus("Ganador confirmado. El premio ya fue asignado automáticamente."); setSpinning(false);
  }

  function downloadCard() {
    if (!winner) return;
    const canvas = document.createElement("canvas"); canvas.width=1080; canvas.height=1350;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const sans='Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';

    const bg=ctx.createLinearGradient(0,0,1080,1350); bg.addColorStop(0,"#020809"); bg.addColorStop(.42,"#061416"); bg.addColorStop(1,"#020304"); ctx.fillStyle=bg; ctx.fillRect(0,0,1080,1350);
    const glow=ctx.createRadialGradient(790,220,30,790,220,520); glow.addColorStop(0,"rgba(86,255,246,.24)"); glow.addColorStop(.45,"rgba(58,205,201,.08)"); glow.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=glow; ctx.fillRect(0,0,1080,800);
    const glow2=ctx.createRadialGradient(170,1110,20,170,1110,420); glow2.addColorStop(0,"rgba(105,83,255,.15)"); glow2.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=glow2; ctx.fillRect(0,650,700,700);

    ctx.strokeStyle="rgba(112,248,241,.42)"; ctx.lineWidth=2; ctx.strokeRect(48,48,984,1254);
    ctx.strokeStyle="rgba(255,255,255,.08)"; ctx.lineWidth=1; ctx.strokeRect(72,72,936,1206);
    for(let i=0;i<38;i++){const x=(i*151)%1080,y=(i*89)%1350;ctx.fillStyle=i%3===0?"rgba(120,246,240,.55)":"rgba(255,255,255,.18)";ctx.save();ctx.translate(x,y);ctx.rotate((i*.47)%3);ctx.fillRect(-2,-9,4,18);ctx.restore();}

    drawVyralMark(ctx,82,86,78);
    ctx.fillStyle="#F5FFFF"; ctx.font=`800 40px ${sans}`; ctx.fillText("VYRAL",180,142);
    ctx.fillStyle="#77858f"; ctx.font=`700 20px ${sans}`; ctx.fillText("GIVEAWAY / RESULTADO OFICIAL",82,198);
    ctx.fillStyle="#ffffff"; ctx.font=`800 88px ${sans}`; ctx.fillText("TENEMOS",82,344);
    ctx.font='italic 92px Georgia, "Times New Roman", serif'; ctx.fillText("ganador.",82,445);
    ctx.fillStyle="#7bf7f1"; ctx.font=`800 20px ${sans}`; ctx.fillText("✦ SORTEO VYRAL",82,500);

    ctx.fillStyle="rgba(255,255,255,.035)"; ctx.fillRect(82,555,916,186);
    ctx.strokeStyle="rgba(123,247,241,.2)"; ctx.strokeRect(82,555,916,186);
    ctx.fillStyle="#7bf7f1"; ctx.font=`800 20px ${sans}`; ctx.fillText("PREMIO DESBLOQUEADO",112,607);
    ctx.fillStyle="#ffffff"; ctx.font=`800 42px ${sans}`; ctx.fillText(prizeLabel,112,678);
    ctx.fillStyle="#74818b"; ctx.font=`500 21px ${sans}`; ctx.fillText("Asignado automáticamente a la cuenta ganadora",112,714);

    ctx.fillStyle="#7b8992"; ctx.font=`800 19px ${sans}`; ctx.fillText("GANADOR",82,832);
    ctx.fillStyle="#ffffff"; ctx.font=`800 64px ${sans}`; ctx.fillText((winner.name || "Usuario VYRAL").toUpperCase(),82,914);
    ctx.fillStyle="#9aa7af"; ctx.font=`600 30px ${sans}`; ctx.fillText(maskEmail(winner.email),82,965);

    ctx.fillStyle="rgba(123,247,241,.08)"; ctx.fillRect(82,1043,916,2);
    ctx.fillStyle="#7bf7f1"; ctx.font=`800 23px ${sans}`; ctx.fillText("CREÁ · DISTRIBUÍ · CRECÉ",82,1120);
    ctx.fillStyle="#71808a"; ctx.font=`500 22px ${sans}`; ctx.fillText("Tu próxima oportunidad puede ser la siguiente.",82,1166);
    ctx.fillStyle="#ffffff"; ctx.font='italic 39px Georgia, "Times New Roman", serif'; ctx.fillText("Hacerse viral nunca fue tan fácil.",82,1248);

    const a=document.createElement("a"); a.href=canvas.toDataURL("image/png"); a.download=`vyral-ganador-${Date.now()}.png`; a.click();
  }

  return <section className="adminGiveaway">
    <div className="adminSectionHead"><div><small>VYRAL GIVEAWAY</small><h2>Ruleta de sorteos</h2></div><span>{eligible.length} participantes</span></div>
    <div className="giveawayGrid">
      <div className="giveawayWheelPanel"><div className="wheelPointer">▼</div><div className="giveawayWheel" style={{transform:`rotate(${rotation}deg)`}}><div className="wheelHub"><b>VYRAL</b><span>GIVEAWAY</span></div>{wheelUsers.map((u,i)=>{const angle=(360/Math.max(1,wheelUsers.length))*i;return <span className="wheelName" key={u.id} style={{transform:`rotate(${angle}deg) translateY(-132px) rotate(${-angle}deg)`}}>{shortName(u)}</span>;})}</div><p>{eligible.length>12?`${eligible.length} usuarios participan · se muestran 12 nombres en la rueda`:`${eligible.length} usuarios participan en esta rueda`}</p></div>
      <div className="giveawayControl"><div className="giveawayControlEyebrow">CONFIGURAR PREMIO</div><h3>Hacé girar la rueda.</h3><p>VYRAL elige al ganador, asigna el plan y te deja lista una pieza vertical para Instagram.</p><label>Premio</label><select value={plan} onChange={e=>setPlan(e.target.value)}><option value="inicio">1 mes · Inicio</option><option value="pro">1 mes · Crecimiento</option><option value="escala">1 mes · Escala</option></select><button onClick={draw} disabled={spinning||!eligible.length}>{spinning?"Girando ruleta…":"Girar ruleta ✦"}</button><small>{status}</small></div>
    </div>
    {winner && <div className="giveawayWinner"><div><small>GANADOR CONFIRMADO</small><strong>{winner.name}</strong><span>{maskEmail(winner.email)}</span></div><div><b>{prizeLabel}</b><button onClick={downloadCard}>Generar imagen premium ↓</button></div></div>}
  </section>;
}
