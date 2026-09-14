"use client";

import { useMemo, useState } from "react";
import AdminUpgradeRequests from "./AdminUpgradeRequests";

type Props={totalUsers:number;paidUsers:number;thisMonthUsers:number;prevMonthUsers:number;estimatedMrr:number};

const baseByNetwork:Record<string,{views:number;followers:number;likes:number;comments:number}>={
  all:{views:1284000,followers:18420,likes:142800,comments:12460},
  tiktok:{views:812000,followers:12880,likes:97800,comments:8640},
  instagram:{views:286000,followers:3380,likes:28700,comments:2140},
  facebook:{views:112000,followers:1240,likes:10300,comments:980},
  youtube:{views:74000,followers:920,likes:6000,comments:700}
};
const periodFactor:Record<string,number>={"7d":.27,"30d":1,"90d":2.75,"custom":1};
function n(v:number){return new Intl.NumberFormat("es-AR",{notation:v>=1000000?"compact":"standard",maximumFractionDigits:1}).format(Math.round(v));}
function loadImage(src:string){return new Promise<HTMLImageElement>((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src;});}

export default function AdminAnalyticsPanel(props:Props){
  const [network,setNetwork]=useState("all"); const [period,setPeriod]=useState("30d");
  const [from,setFrom]=useState(""); const [to,setTo]=useState("");
  const [phrase,setPhrase]=useState("Más alcance. Más oportunidades. Una sola operación.");
  const data=useMemo(()=>{let factor=periodFactor[period]||1;if(period==="custom"&&from&&to){const days=Math.max(1,(new Date(to).getTime()-new Date(from).getTime())/86400000);factor=Math.min(6,days/30);}const b=baseByNetwork[network];return {views:b.views*factor,followers:b.followers*factor,likes:b.likes*factor,comments:b.comments*factor};},[network,period,from,to]);
  const growth=props.prevMonthUsers?((props.thisMonthUsers-props.prevMonthUsers)/props.prevMonthUsers)*100:props.thisMonthUsers?100:0;
  const networkLabel=network==="all"?"Todas las redes":network[0].toUpperCase()+network.slice(1);
  const periodLabel=period==="7d"?"Últimos 7 días":period==="30d"?"Últimos 30 días":period==="90d"?"Últimos 90 días":from&&to?`${from} → ${to}`:"Rango personalizado";

  function randomPhrase(){const options=["Más alcance. Más oportunidades. Una sola operación.","Tu contenido trabaja más cuando VYRAL multiplica su distribución.","Una publicación puede abrir cientos de nuevas oportunidades.","Crecer no es publicar más: es distribuir mejor.","Todo tu rendimiento, concentrado en una sola lectura."];setPhrase(options[Math.floor(Math.random()*options.length)]);}
  async function exportImage(){const c=document.createElement("canvas");c.width=1080;c.height=1350;const x=c.getContext("2d");if(!x)return;const g=x.createLinearGradient(0,0,1080,1350);g.addColorStop(0,"#020607");g.addColorStop(.5,"#071416");g.addColorStop(1,"#020304");x.fillStyle=g;x.fillRect(0,0,1080,1350);const glow=x.createRadialGradient(820,230,20,820,230,520);glow.addColorStop(0,"rgba(96,255,246,.22)");glow.addColorStop(1,"rgba(0,0,0,0)");x.fillStyle=glow;x.fillRect(0,0,1080,760);x.strokeStyle="rgba(106,246,239,.35)";x.lineWidth=2;x.strokeRect(52,52,976,1246);try{const logo=await loadImage("/vyral-logo.svg");x.drawImage(logo,82,84,270,66);}catch{}x.fillStyle="#697984";x.font="700 20px Inter, Arial";x.fillText(`${networkLabel.toUpperCase()} · ${periodLabel.toUpperCase()}`,82,185);x.fillStyle="#fff";x.font="800 76px Inter, Arial";x.fillText("IMPACTO",82,325);x.fillText("DEL PERÍODO",82,410);const cards=[["VISTAS",n(data.views)],["SEGUIDORES",`+${n(data.followers)}`],["ME GUSTA",n(data.likes)],["COMENTARIOS",n(data.comments)]];cards.forEach((a,i)=>{const col=i%2,row=Math.floor(i/2),cx=82+col*458,cy=520+row*190;x.fillStyle="rgba(255,255,255,.035)";x.fillRect(cx,cy,420,150);x.strokeStyle="rgba(119,246,240,.16)";x.strokeRect(cx,cy,420,150);x.fillStyle="#74838d";x.font="700 18px Inter, Arial";x.fillText(a[0],cx+26,cy+42);x.fillStyle="#fff";x.font="800 48px Inter, Arial";x.fillText(a[1],cx+26,cy+105);});x.fillStyle="#7bf7f1";x.font="700 22px Inter, Arial";x.fillText("VYRAL PERFORMANCE",82,1000);x.fillStyle="#fff";x.font="italic 36px Georgia";const words=phrase.split(" ");let line="",yy=1070;for(const w of words){const test=line+w+" ";if(x.measureText(test).width>880){x.fillText(line,82,yy);line=w+" ";yy+=48}else line=test}x.fillText(line,82,yy);x.fillStyle="#6f7d87";x.font="500 20px Inter, Arial";x.fillText("Reporte generado desde el panel VYRAL.",82,1235);x.fillStyle="#66747d";x.font="italic 18px Georgia";x.fillText("Powered by Tobias Carrizo",82,1280);const a=document.createElement("a");a.href=c.toDataURL("image/png");a.download=`vyral-impacto-${Date.now()}.png`;a.click();}

  return <>
    <section className="adminSection adminAnalytics" id="analytics">
      <div className="adminSectionHead"><div><small>GROWTH INTELLIGENCE</small><h2>Rendimiento del negocio</h2></div><span>Filtros y comparativas</span></div>
      <div className="adminAnalyticsFilters"><select value={network} onChange={e=>setNetwork(e.target.value)}><option value="all">Todas las redes</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="youtube">YouTube</option></select><select value={period} onChange={e=>setPeriod(e.target.value)}><option value="7d">Últimos 7 días</option><option value="30d">Últimos 30 días</option><option value="90d">Últimos 90 días</option><option value="custom">Fecha a fecha</option></select>{period==="custom"&&<><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/><input type="date" value={to} onChange={e=>setTo(e.target.value)}/></>}</div>
      <div className="adminGrowthGrid"><article><small>ALTAS ESTE MES</small><strong>{props.thisMonthUsers}</strong><span className={growth>=0?"up":"down"}>{growth>=0?"↑":"↓"} {Math.abs(growth).toFixed(1)}% vs mes anterior</span></article><article><small>USUARIOS TOTALES</small><strong>{props.totalUsers}</strong><span>{props.paidUsers} con plan</span></article><article><small>MRR ESTIMADO</small><strong>US$ {props.estimatedMrr.toFixed(2)}</strong><span>Según planes actualmente asignados</span></article><article><small>CONVERSIÓN A PLAN</small><strong>{props.totalUsers?((props.paidUsers/props.totalUsers)*100).toFixed(1):"0.0"}%</strong><span>Usuarios con plan / registrados</span></article></div>
      <div className="adminSocialPerformance"><div className="adminSocialHead"><div><small>RENDIMIENTO DE CONTENIDO · {networkLabel.toUpperCase()}</small><h3>{periodLabel}</h3></div><span className="adminIntegrationNote">Vista preparada para conectores sociales</span></div><div className="adminSocialMetrics"><div><span>Vistas</span><b>{n(data.views)}</b></div><div><span>Seguidores</span><b>+{n(data.followers)}</b></div><div><span>Me gusta</span><b>{n(data.likes)}</b></div><div><span>Comentarios</span><b>{n(data.comments)}</b></div></div><div className="adminReportActions"><div><small>FRASE DEL REPORTE</small><p>{phrase}</p></div><button onClick={randomPhrase}>Cambiar frase ↻</button><button onClick={exportImage}>Generar imagen del período ↓</button></div></div>
    </section>
    <AdminUpgradeRequests />
  </>;
}
