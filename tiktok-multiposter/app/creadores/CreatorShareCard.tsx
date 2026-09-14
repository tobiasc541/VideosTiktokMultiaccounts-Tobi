"use client";

export default function CreatorShareCard({ code, name }: { code: string; name: string }) {
  function download() {
    const canvas = document.createElement("canvas"); canvas.width=1080; canvas.height=1350;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const bg=ctx.createLinearGradient(0,0,1080,1350); bg.addColorStop(0,"#020304"); bg.addColorStop(.52,"#071317"); bg.addColorStop(1,"#020304"); ctx.fillStyle=bg; ctx.fillRect(0,0,1080,1350);
    const glow=ctx.createRadialGradient(820,250,20,820,250,500); glow.addColorStop(0,"rgba(86,255,245,.24)"); glow.addColorStop(1,"rgba(86,255,245,0)"); ctx.fillStyle=glow; ctx.fillRect(320,0,760,760);
    ctx.strokeStyle="rgba(108,245,238,.42)"; ctx.lineWidth=2; ctx.strokeRect(54,54,972,1242);
    ctx.strokeStyle="rgba(255,255,255,.05)"; ctx.strokeRect(72,72,936,1206);
    for(let i=0;i<32;i++){ctx.fillStyle=`rgba(108,245,238,${.018+(i%4)*.008})`;ctx.beginPath();ctx.arc((i*173)%1080,(i*109)%1350,2+(i%3),0,Math.PI*2);ctx.fill();}
    ctx.fillStyle="#76f5ef";ctx.font="900 44px Arial";ctx.fillText("VYRAL",92,142);
    ctx.fillStyle="#7b8994";ctx.font="700 22px Arial";ctx.fillText("CREATOR PROGRAM · ACCESO ESPECIAL",92,190);
    ctx.fillStyle="#ffffff";ctx.font="900 92px Arial";ctx.fillText("50% OFF",92,410);
    ctx.fillStyle="#dffefd";ctx.font="700 34px Arial";ctx.fillText("en VYRAL con mi código",92,472);
    ctx.fillStyle="rgba(118,245,239,.08)";ctx.fillRect(92,555,896,210);ctx.strokeStyle="rgba(118,245,239,.28)";ctx.strokeRect(92,555,896,210);
    ctx.fillStyle="#6cebe5";ctx.font="700 22px Arial";ctx.fillText("CÓDIGO PROMOCIONAL",130,620);
    ctx.fillStyle="#ffffff";ctx.font="900 76px Arial";ctx.fillText(code,130,710);
    ctx.fillStyle="#788690";ctx.font="600 24px Arial";ctx.fillText(`Compartido por ${name || "Creator VYRAL"}`,92,865);
    ctx.fillStyle="#ffffff";ctx.font="800 54px Arial";ctx.fillText("Publicá una vez.",92,1000);ctx.fillText("Multiplicá tu alcance.",92,1065);
    ctx.fillStyle="#70eee8";ctx.font="700 24px Arial";ctx.fillText("CREÁ · DISTRIBUÍ · CRECÉ",92,1172);
    ctx.fillStyle="#7f8c95";ctx.font="500 22px Arial";ctx.fillText("Beneficio sujeto a código vigente y condiciones del plan.",92,1225);
    const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download=`vyral-creator-${code}.png`;a.click();
  }
  return <button className="creatorDownload" onClick={download}>Descargar imagen para redes ↓</button>;
}
