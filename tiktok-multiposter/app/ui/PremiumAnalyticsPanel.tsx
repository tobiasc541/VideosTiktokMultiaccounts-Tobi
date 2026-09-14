"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Props = { planId: "inicio" | "pro" | "escala" };

const insights = [
  {k:"HOOK", title:"Los primeros segundos deciden el alcance", text:"Priorizá aperturas directas, movimiento visual y una promesa clara antes del segundo 2."},
  {k:"CAPTION", title:"Las descripciones cortas están rindiendo mejor", text:"Probá una idea principal + llamada a comentar. Evitá explicar todo antes de que vean el video."},
  {k:"REPETICIÓN", title:"Tenés una fórmula que conviene repetir", text:"Cuando un formato supera tu media, VYRAL lo marca para que puedas crear una nueva variante sin copiarlo literal."}
];

export default function PremiumAnalyticsPanel({ planId }: Props) {
  const [visible,setVisible]=useState(false);
  const [mode,setMode]=useState<"overview"|"recommendations"|"content"|"forecast">("overview");
  useEffect(()=>{
    const sync=()=>{const a=document.querySelector(".vdNav button.active");setVisible((a?.textContent||"").toLowerCase().includes("analytics"));};
    sync(); const nav=document.querySelector(".vdNav"); const obs=new MutationObserver(sync); if(nav)obs.observe(nav,{attributes:true,subtree:true,attributeFilter:["class"]}); document.addEventListener("click",sync,true); return()=>{obs.disconnect();document.removeEventListener("click",sync,true)};
  },[]);
  const scale=planId==="escala";
  const score=useMemo(()=>Math.round(78 + (mode==="recommendations"?5:mode==="content"?2:0)),[mode]);
  if(!visible || planId==="inicio") return null;

  return <section className={`premiumAnalytics ${scale?"isScale":"isLocked"}`}>
    <div className="paHead"><div><small>VYRAL INTELLIGENCE</small><h2>Analytics que te dicen <em>qué hacer después.</em></h2><p>Pasá de mirar números a detectar patrones, oportunidades y decisiones accionables.</p></div><span>{scale?"ESCALA · ACTIVO":"EXCLUSIVO PLAN ESCALA"}</span></div>
    <div className="paTabs">{[["overview","Vista estratégica"],["recommendations","Recomendaciones"],["content","Content Intelligence"],["forecast","Predicción"]].map(([id,label])=><button key={id} onClick={()=>setMode(id as typeof mode)} className={mode===id?"active":""}>{label}</button>)}</div>
    <div className="paBody">
      <div className="paBlurLayer">
        <div className="paScore"><div><small>VIRAL MOMENTUM</small><strong>{score}<i>/100</i></strong><span>↑ +12 puntos vs. período anterior</span></div><div className="paRing" style={{"--score":`${score*3.6}deg`} as React.CSSProperties}><b>{score}</b></div></div>
        {mode==="overview"&&<div className="paGrid"><article><small>VELOCIDAD DE CRECIMIENTO</small><strong>+24,8%</strong><p>Tu contenido acelera por encima de tu media reciente.</p></article><article><small>MEJOR SEÑAL</small><strong>Compartidos</strong><p>Es la interacción que más está empujando alcance adicional.</p></article><article><small>OPORTUNIDAD</small><strong>Repetir formato</strong><p>Hay un patrón ganador listo para convertirse en serie.</p></article></div>}
        {mode==="recommendations"&&<div className="paInsights">{insights.map((x,i)=><article key={x.k}><span>0{i+1}</span><div><small>{x.k}</small><h3>{x.title}</h3><p>{x.text}</p></div><button>Usar recomendación ↗</button></article>)}</div>}
        {mode==="content"&&<div className="paContentGrid"><article><small>DESCRIPCIÓN GANADORA</small><h3>Pregunta corta + curiosidad</h3><div className="paMeter"><i style={{width:"84%"}}/></div><b>84% score relativo</b><p>VYRAL compara captions, interacción y alcance para identificar qué estilo conviene repetir.</p></article><article><small>FORMATO CON MAYOR POTENCIAL</small><h3>Hook visual + demostración</h3><div className="paMeter"><i style={{width:"91%"}}/></div><b>91% score relativo</b><p>Detecta qué estructura de tus últimos videos está superando la media.</p></article></div>}
        {mode==="forecast"&&<div className="paForecast"><div><small>PROYECCIÓN 7 DÍAS</small><strong>+18% — +31%</strong><p>Rango estimado si mantenés frecuencia y formato actual.</p></div><div className="paForecastBars">{[32,46,41,58,64,73,86].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div></div>}
      </div>
      {!scale&&<div className="paLock"><div>✦</div><small>ANALYTICS AVANZADAS</small><h3>Desbloqueá VYRAL Intelligence.</h3><p>Recomendaciones, patrones de captions, Viral Momentum, predicción, detección de formatos ganadores y próximas acciones están incluidos en Escala.</p><Link href="/mi-plan#upgrade">Cambiar a Escala ↗</Link></div>}
    </div>
    {scale&&<div className="paFoot"><span>✦ Motor preparado para sincronizar recomendaciones con VYRAL AI y tus métricas reales de contenido.</span><b>Plan Escala</b></div>}
  </section>;
}
