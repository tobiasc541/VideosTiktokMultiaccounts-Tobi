"use client";
import {useMemo,useState} from "react";
import "./impact-demo.css";

type WindowKey="30d"|"90d";
type PlatformKey="all"|"tiktok"|"instagram"|"facebook";
const data={
  "30d":{views:"2.84M",viewsPct:"+31%",followers:"+18.420",followersPct:"+24%",comments:"46.380",commentsPct:"+19%",posts:"1.284",creators:"326",businesses:"118",curve:[18,24,22,31,36,34,47,54,59,66,74,82]},
  "90d":{views:"7.91M",viewsPct:"+68%",followers:"+49.870",followersPct:"+52%",comments:"128.940",commentsPct:"+44%",posts:"3.612",creators:"514",businesses:"186",curve:[12,17,25,23,34,42,39,53,61,72,79,92]}
};
const platformData={all:{label:"TikTok · Instagram · Facebook",share:"100%"},tiktok:{label:"TikTok",share:"52%"},instagram:{label:"Instagram",share:"33%"},facebook:{label:"Facebook",share:"15%"}};

export default function ImpactDemo(){
 const[period,setPeriod]=useState<WindowKey>("30d");const[platform,setPlatform]=useState<PlatformKey>("all");const d=data[period];
 const points=useMemo(()=>d.curve.map((v,i)=>`${i*(100/(d.curve.length-1))},${100-v}`).join(" "),[d]);
 return <section className="impactDemo" aria-label="Vista ilustrativa de impacto">
   <div className="impactDemoHead"><div><span>VYRAL IMPACT / ESCENARIO DE REFERENCIA</span><h3>Así se ve el crecimiento<br/><em>cuando todo vive en un solo sistema.</em></h3><p>Vista de referencia para mostrar cómo VYRAL consolida resultados de creadores y e-commerce en TikTok, Instagram y Facebook.</p></div><div className="impactDemoTabs"><button className={period==="30d"?"active":""} onClick={()=>setPeriod("30d")}>30 DÍAS</button><button className={period==="90d"?"active":""} onClick={()=>setPeriod("90d")}>90 DÍAS</button></div></div>
   <div className="impactPlatformTabs"><button className={platform==="all"?"active":""} onClick={()=>setPlatform("all")}>RED COMPLETA</button><button className={platform==="tiktok"?"active":""} onClick={()=>setPlatform("tiktok")}>TikTok</button><button className={platform==="instagram"?"active":""} onClick={()=>setPlatform("instagram")}>Instagram</button><button className={platform==="facebook"?"active":""} onClick={()=>setPlatform("facebook")}>Facebook</button><span>{platformData[platform].share} DEL IMPACTO MOSTRADO</span></div>
   <div className="impactDemoStage">
     <div className="impactDemoPulse"><div className="impactDemoBadge"><i/> {platformData[platform].label}</div><div className="impactDemoGraph"><div className="impactGraphGrid"/><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="impactFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#70fff7" stopOpacity=".32"/><stop offset="100%" stopColor="#70fff7" stopOpacity="0"/></linearGradient></defs><polyline points={points} fill="none" stroke="#77fff8" strokeWidth="1.6" vectorEffect="non-scaling-stroke"/><polygon points={`0,100 ${points} 100,100`} fill="url(#impactFill)"/></svg><div className="impactPersonNode n1"><i/><b/></div><div className="impactPersonNode n2"><i/><b/></div><div className="impactPersonNode n3"><i/><b/></div><div className="impactPersonNode n4"><i/><b/></div><div className="impactPersonNode n5"><i/><b/></div></div><div className="impactDemoCaption"><b>RED COMPLETA</b><span>creadores + e-commerce · distribución consolidada</span></div></div>
     <div className="impactMetricGrid">
       <article><small>VISTAS SUMADAS</small><strong>{d.views}</strong><span>{d.viewsPct} <i>vs. {period==="30d"?"los 30 días anteriores":"los 90 días anteriores"}</i></span><div className="metricNetworks"><b>TikTok 52%</b><b>Instagram 33%</b><b>Facebook 15%</b></div></article>
       <article><small>SEGUIDORES SUMADOS</small><strong>{d.followers}</strong><span>{d.followersPct} <i>vs. período anterior</i></span><div className="metricNetworks"><b>TikTok</b><b>Instagram</b><b>Facebook</b></div></article>
       <article><small>COMENTARIOS SUMADOS</small><strong>{d.comments}</strong><span>{d.commentsPct} <i>vs. período anterior</i></span><div className="metricNetworks"><b>3 redes consolidadas</b></div></article>
       <article><small>PUBLICACIONES DISTRIBUIDAS</small><strong>{d.posts}</strong><span>↗ <i>desde un flujo central</i></span><div className="metricNetworks"><b>TikTok</b><b>Instagram</b><b>Facebook</b></div></article>
     </div>
   </div>
   <div className="impactCommunityGrid"><article><span>CREADORES ACTIVOS</span><strong>{d.creators}</strong><small>perfiles del escenario</small></article><article><span>NEGOCIOS ACTIVOS</span><strong>{d.businesses}</strong><small>e-commerce y marcas</small></article><article className="impactSuccess"><span>CASOS CON MEJORA</span><strong>9/10</strong><small>de 10 en este escenario</small></article></div>
   <div className="impactDemoFooter"><span><i/> Creadores</span><span><i/> E-commerce</span><span><i/> TikTok · Instagram · Facebook</span><b>Cifras ilustrativas hasta contar con telemetría verificada.</b></div>
 </section>
}
