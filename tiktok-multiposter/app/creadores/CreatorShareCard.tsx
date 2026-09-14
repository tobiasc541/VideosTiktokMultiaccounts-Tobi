"use client";

function loadImage(src:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});}

export default function CreatorShareCard({ code, name }: { code: string; name: string }) {
  async function download() {
    const canvas = document.createElement("canvas"); canvas.width=1080; canvas.height=1350;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const sans='Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
    const bg=ctx.createLinearGradient(0,0,1080,1350); bg.addColorStop(0,"#020304"); bg.addColorStop(.52,"#071317"); bg.addColorStop(1,"#020304"); ctx.fillStyle=bg; ctx.fillRect(0,0,1080,1350);
    const glow=ctx.createRadialGradient(820,250,20,820,250,500); glow.addColorStop(0,"rgba(86,255,245,.24)"); glow.addColorStop(1,"rgba(86,255,245,0)"); ctx.fillStyle=glow; ctx.fillRect(320,0,760,760);
    const glow2=ctx.createRadialGradient(130,1050,20,130,1050,420); glow2.addColorStop(0,"rgba(91,78,255,.14)"); glow2.addColorStop(1,"rgba(91,78,255,0)"); ctx.fillStyle=glow2; ctx.fillRect(0,680,600,670);
    ctx.strokeStyle="rgba(108,245,238,.42)"; ctx.lineWidth=2; ctx.strokeRect(54,54,972,1242);ctx.strokeStyle="rgba(255,255,255,.05)";ctx.strokeRect(72,72,936,1206);
    for(let i=0;i<28;i++){ctx.fillStyle=`rgba(108,245,238,${.018+(i%4)*.008})`;ctx.beginPath();ctx.arc((i*173)%1080,(i*109)%1350,2+(i%3),0,Math.PI*2);ctx.fill();}
    try{const logo=await loadImage("/vyral-logo.svg");ctx.drawImage(logo,92,92,270,66);}catch{}
    ctx.fillStyle="#7b8994";ctx.font=`700 19px ${sans}`;ctx.fillText("CREATOR PROGRAM / ACCESO ESPECIAL",92,202);
    ctx.fillStyle="#ffffff";ctx.font='italic 76px Georgia, "Times New Roman", serif';ctx.fillText("Tu comunidad",92,382);ctx.font=`800 94px ${sans}`;ctx.fillText("50% OFF",92,480);ctx.fillStyle="#cfeeed";ctx.font=`600 31px ${sans}`;ctx.fillText("para empezar a multiplicar su alcance.",92,535);
    ctx.fillStyle="rgba(118,245,239,.07)";ctx.fillRect(92,620,896,220);ctx.strokeStyle="rgba(118,245,239,.30)";ctx.strokeRect(92,620,896,220);ctx.fillStyle="#6cebe5";ctx.font=`700 20px ${sans}`;ctx.fillText("CÓDIGO PROMOCIONAL",130,685);ctx.fillStyle="#ffffff";ctx.font=`800 82px ${sans}`;ctx.fillText(code,130,780);
    ctx.fillStyle="#788690";ctx.font=`600 23px ${sans}`;ctx.fillText(`Compartido por ${name || "Creator VYRAL"}`,92,930);ctx.fillStyle="#ffffff";ctx.font=`800 48px ${sans}`;ctx.fillText("Publicá una vez.",92,1045);ctx.font='italic 52px Georgia, "Times New Roman", serif';ctx.fillText("Multiplicá tu alcance.",92,1110);ctx.fillStyle="#70eee8";ctx.font=`700 22px ${sans}`;ctx.fillText("CREÁ · DISTRIBUÍ · CRECÉ",92,1200);ctx.fillStyle="#7f8c95";ctx.font=`500 19px ${sans}`;ctx.fillText("Beneficio sujeto a código vigente y condiciones del plan.",92,1248);ctx.fillStyle="#66747d";ctx.font='italic 18px Georgia, "Times New Roman", serif';ctx.fillText("Powered by Tobias Carrizo",92,1282);
    const a=document.createElement("a");a.href=canvas.toDataURL("image/png");a.download=`vyral-creator-${code}.png`;a.click();
  }
  return <button className="creatorDownload" onClick={download}>Descargar imagen premium para redes ↓</button>;
}
