"use client";
import {useMemo,useState} from "react";
import "./impact-demo.css";

type WindowKey="30d"|"90d";
const data={
  "30d":{views:"2.84M",viewsPct:"+31%",followers:"+18.420",followersPct:"+24%",comments:"46.380",commentsPct:"+19%",posts:"1.284",curve:[18,24,22,31,36,34,47,54,59,66,74,82]},
  "90d":{views:"7.91M",viewsPct:"+68%",followers:"+49.870",followersPct:"+52%",comments:"128.940",commentsPct:"+44%",posts:"3.612",curve:[12,17,25,23,34,42,39,53,61,72,79,92]}
};

export default function ImpactDemo(){
 const[period,setPeriod]=useState<WindowKey>("30d");const d=data[period];
 const points=useMemo(()=>d.curve.map((v,i)=>`${i*(100/(d.curve.length-1))},${100-v}`).join(" "),[d]);
 return <section className="impactDemo" aria-label="Vista ilustrativa de impacto">
   <div className="impactDemoHead"><div><span>VYRAL IMPACT / DEMO INTERACTIVA</span><h3>Así se ve el crecimiento<br/><em>cuando todo vive en un solo sistema.</em></h3><p>Vista ilustrativa de cómo VYRAL consolidará resultados de creadores y e-commerce. Los números son de demostración y se reemplazarán por métricas reales de uso.</p></div><div className="impactDemoTabs"><button className={period==="30d"?"active":""} onClick={()=>setPeriod("30d")}>30 DÍAS</button><button className={period==="90d"?"active":""} onClick={()=>setPeriod("90d")}>90 DÍAS</button></div></div>
   <div className="impactDemoStage">
     <div className="impactDemoPulse"><div className="impactDemoBadge"><i/> DEMO · DATOS ILUSTRATIVOS</div><div className="impactDemoGraph"><div className="impactGraphGrid"/><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="impactFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#70fff7" stopOpacity=".32"/><stop offset="100%" stopColor="#70fff7" stopOpacity="0"/></linearGradient></defs><polyline points={points} fill="none" stroke="#77fff8" strokeWidth="1.6" vectorEffect="non-scaling-stroke"/><polygon points={`0,100 ${points} 100,100`} fill="url(#impactFill)"/></svg><div className="impactGraphOrb one"/><div className="impactGraphOrb two"/><div className="impactGraphOrb three"/></div><div className="impactDemoCaption"><b>RED COMPLETA</b><span>creadores + e-commerce · distribución consolidada</span></div></div>
     <div className="impactMetricGrid">
       <article><small>VISTAS SUMADAS</small><strong>{d.views}</strong><span>{d.viewsPct} <i>vs. período anterior</i></span></article>
       <article><small>SEGUIDORES SUMADOS</small><strong>{d.followers}</strong><span>{d.followersPct} <i>crecimiento</i></span></article>
       <article><small>COMENTARIOS SUMADOS</small><strong>{d.comments}</strong><span>{d.commentsPct} <i>interacción</i></span></article>
       <article><small>PUBLICACIONES DISTRIBUIDAS</small><strong>{d.posts}</strong><span>↗ <i>desde un flujo central</i></span></article>
     </div>
   </div>
   <div className="impactDemoFooter"><span><i/> Creadores</span><span><i/> E-commerce</span><span><i/> Equipos de contenido</span><b>Los valores mostrados son ilustrativos, no testimonios ni resultados reales.</b></div>
 </section>
}
