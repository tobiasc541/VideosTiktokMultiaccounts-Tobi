"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import NetworkFlowEnhancer from "./NetworkFlowEnhancer";
import "./landing-growth.css";
import "./landing-ultra.css";
import "./landing-simulator-v2.css";

const rows = [
  ["Publicación multicuentas", "Incluido", "Varias herramientas / procesos"],
  ["Analytics unificado", "Incluido", "Suele estar separado"],
  ["IA aplicada al contenido", "Incluido según plan", "Suele requerir otra herramienta"],
  ["Automatizaciones comentario → DM", "Integradas", "Normalmente se contrata aparte"],
  ["Soporte + operación + creator program", "Un solo sistema", "Flujos fragmentados"],
  ["Precio de entrada", "Desde US$ 4,99 / mes", "Depende del stack que armes"]
];

const tips = {
  ai: { title:"Gasto en inteligencia artificial", text:"Ingresá lo que pagás por herramientas de IA que usás para captions, ideas, copies, respuestas o asistencia de contenido." },
  tools: { title:"Apps y software", text:"Incluí publicación, analytics, automatizaciones, social media tools y otras plataformas que VYRAL podría centralizar." },
  videos: { title:"Videos por mes", text:"VYRAL usa este dato para recomendar automáticamente el plan según su capacidad mensual: Inicio hasta 50, Crecimiento hasta 200 y Escala hasta 500 videos." },
  accounts: { title:"Cuentas por publicación", text:"Cuantas más cuentas reciben el mismo video, más veces tenés que repetir manualmente la misma carga. VYRAL centraliza esas cargas en un solo flujo." },
  hourValue: { title:"Costo por hora del equipo", text:"Puede ser tu hora o la de un community manager, editor o miembro del equipo. La usamos para poner valor al tiempo que hoy se pierde repitiendo publicaciones." }
} as const;
type TipKey = keyof typeof tips;

function InfoButton({ id, open, onToggle }: { id: TipKey; open: TipKey | null; onToggle: (id: TipKey) => void }) {
  const active = open === id;
  return <span className="vyralInfoWrap"><button type="button" className={`vyralInfoButton ${active?"active":""}`} onClick={()=>onToggle(id)} aria-expanded={active}>!</button>{active&&<span className="vyralInfoPopover"><b>{tips[id].title}</b><p>{tips[id].text}</p></span>}</span>;
}

export default function LandingGrowthExperience(){
  const [aiCost,setAiCost]=useState(20);
  const [toolsCost,setToolsCost]=useState(45);
  const [videos,setVideos]=useState(50);
  const [accounts,setAccounts]=useState(3);
  const [hourValue,setHourValue]=useState(8);
  const [openTip,setOpenTip]=useState<TipKey|null>(null);

  useEffect(()=>{
    const targets=Array.from(document.querySelectorAll<HTMLElement>(".vyralSection,.loginExperience,.vyralTicker,.vyralImpactSection,.vyralProofSection,.vyralComparisonSection"));
    targets.forEach((el,i)=>{el.classList.add("vyralReveal");el.dataset.reveal=String(i%4)});
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle("vyralIn",entry.isIntersecting)),{threshold:.12,rootMargin:"0px 0px -6% 0px"});
    targets.forEach(el=>io.observe(el));
    return()=>io.disconnect();
  },[]);

  const plan = useMemo(()=>{
    if(videos<=50) return {id:"inicio",name:"Inicio",price:4.99,limit:50};
    if(videos<=200) return {id:"pro",name:"Crecimiento",price:9.99,limit:200};
    return {id:"escala",name:"Escala",price:19.99,limit:500};
  },[videos]);

  // Conservative operating assumption: ~45 seconds to repeat one manual upload.
  // VYRAL still needs one upload per piece, so only duplicate account uploads count as recoverable time.
  const secondsPerManualUpload = 45;
  const manualUploads = videos * accounts;
  const vyralUploads = videos;
  const duplicateUploadsAvoided = Math.max(0, manualUploads - vyralUploads);
  const manualHours = manualUploads * secondsPerManualUpload / 3600;
  const vyralHours = vyralUploads * secondsPerManualUpload / 3600;
  const savedHours = duplicateUploadsAvoided * secondsPerManualUpload / 3600;
  const laborValue = savedHours * hourValue;
  const replaceableSoftware = aiCost + toolsCost;
  const grossPotential = replaceableSoftware + laborValue;
  const monthlySavings = Math.max(0,grossPotential-plan.price);
  const yearlySavings = monthlySavings*12;

  return <>
    <NetworkFlowEnhancer/>

    <section className="vyralImpactSection" aria-label="Impacto VYRAL">
      <div className="vyralImpactGlow one"/><div className="vyralImpactGlow two"/>
      <div className="vyralImpactCopy">
        <div className="vyralSectionIndex">IMPACTO / OPERACIÓN</div><div className="vyralKicker">ECOMMERCE · CREADORES · AGENCIAS</div>
        <h2>Menos cargas.<br/><em>Más tiempo para crecer.</em></h2>
        <p>El ahorro de tiempo no se calcula con edición de video. Se calcula con lo que VYRAL realmente resuelve: dejar de subir la misma pieza una y otra vez en cada cuenta.</p>
        <div className="vyralAudienceChips"><span>◌ Ecommerce</span><span>✦ Creadores</span><span>⌁ Equipos de contenido</span><span>↗ Agencias</span></div>
        <div className="vyralAssumptionCard"><span>CÁLCULO SIMPLE Y TRANSPARENTE</span><b>45 segundos por carga manual</b><p>Tomamos un promedio conservador dentro del rango de 30–60 segundos por publicación. <strong>No contamos edición</strong>, porque VYRAL no reemplaza ese trabajo.</p></div>
      </div>

      <div className="vyralSavingsCard">
        <div className="vyralSavingsTop"><div><span>SIMULADOR DE DISTRIBUCIÓN</span><small>Vos cargás 5 datos. VYRAL calcula el trabajo repetitivo.</small></div><i>LIVE</i></div>

        <div className="vyralSavingsInputs">
          <div className="vyralSavingsControl"><div className="vyralSavingsLabel"><span>Gasto mensual en IA</span><InfoButton id="ai" open={openTip} onToggle={id=>setOpenTip(openTip===id?null:id)}/><b>US$ {aiCost}/mes</b></div><input type="range" min="0" max="300" value={aiCost} onChange={e=>setAiCost(Number(e.target.value))}/></div>
          <div className="vyralSavingsControl"><div className="vyralSavingsLabel"><span>Gasto mensual en apps / software</span><InfoButton id="tools" open={openTip} onToggle={id=>setOpenTip(openTip===id?null:id)}/><b>US$ {toolsCost}/mes</b></div><input type="range" min="0" max="500" value={toolsCost} onChange={e=>setToolsCost(Number(e.target.value))}/></div>
          <div className="vyralSavingsControl featured"><div className="vyralSavingsLabel"><span>Videos que publicás por mes</span><InfoButton id="videos" open={openTip} onToggle={id=>setOpenTip(openTip===id?null:id)}/><b>{videos} videos</b></div><input type="range" min="1" max="500" value={videos} onChange={e=>setVideos(Number(e.target.value))}/></div>
          <div className="vyralSavingsControl featured"><div className="vyralSavingsLabel"><span>Cuentas promedio por video</span><InfoButton id="accounts" open={openTip} onToggle={id=>setOpenTip(openTip===id?null:id)}/><b>{accounts} cuentas</b></div><input type="range" min="1" max="30" value={accounts} onChange={e=>setAccounts(Number(e.target.value))}/></div>
          <div className="vyralSavingsControl"><div className="vyralSavingsLabel"><span>Costo por hora de tu equipo</span><InfoButton id="hourValue" open={openTip} onToggle={id=>setOpenTip(openTip===id?null:id)}/><b>US$ {hourValue}/h</b></div><input type="range" min="1" max="100" value={hourValue} onChange={e=>setHourValue(Number(e.target.value))}/></div>
        </div>

        <div className="vyralAutoPlan">
          <div><small>PLAN RECOMENDADO AUTOMÁTICAMENTE</small><strong>{plan.name}</strong><span>US$ {plan.price.toFixed(2)}/mes · hasta {plan.limit} videos</span></div>
          <div className="vyralAutoPlanBadge">{plan.id==="inicio"?"01":plan.id==="pro"?"02":"03"}</div>
        </div>

        <div className="vyralPublishCompare">
          <article><small>PUBLICANDO MANUALMENTE</small><strong>{manualUploads}</strong><span>cargas/mes · ≈ {manualHours.toFixed(1)} h</span><p>{videos} videos × {accounts} cuentas</p></article>
          <div className="vyralVs">VS</div>
          <article className="vyralWay"><small>PUBLICANDO CON VYRAL</small><strong>{vyralUploads}</strong><span>cargas/mes · ≈ {vyralHours.toFixed(1)} h</span><p>una carga central por video</p></article>
        </div>

        <div className="vyralCalcStory">
          <article><small>CARGAS REPETITIVAS EVITADAS</small><strong>{duplicateUploadsAvoided}</strong><span>acciones manuales que desaparecen</span></article>
          <article><small>TIEMPO RECUPERABLE</small><strong>{savedHours.toFixed(1)} h</strong><span>por mes sólo en distribución</span></article>
          <article><small>VALOR DEL TIEMPO RECUPERADO</small><strong>US$ {laborValue.toFixed(0)}</strong><span>{savedHours.toFixed(1)} h × US$ {hourValue}/h</span></article>
        </div>

        <div className="vyralSavingsBreakdown">
          <span><b>IA + apps que podrías centralizar</b><strong>US$ {replaceableSoftware.toFixed(0)}/mes</strong></span>
          <span><b>Valor del tiempo de distribución recuperado</b><strong>+ US$ {laborValue.toFixed(0)}/mes</strong></span>
          <span><b>Plan {plan.name}</b><strong>− US$ {plan.price.toFixed(2)}/mes</strong></span>
        </div>

        <div className="vyralSavingsResult"><small>AHORRO POTENCIAL ESTIMADO</small><strong>US$ {monthlySavings.toFixed(0)}<span> AHORRADOS / MES</span></strong><div className="vyralYearly"><b>US$ {yearlySavings.toFixed(0)}</b><span>AHORRO POTENCIAL / AÑO</span></div></div>
        <small className="vyralEstimateNote">Estimación basada en tus datos y en 45 segundos por carga manual repetida. No incluye tiempo de edición ni supone reducción de personal.</small>
      </div>
    </section>

    <section className="vyralProofSection">
      <div className="vyralProofEyebrow">IMPACTO MEDIBLE / DESDE EL LANZAMIENTO</div>
      <div className="vyralProofGrid"><div><h3>La prueba social va a ser real, no inventada.</h3><p>Esta sección queda preparada para mostrar automáticamente creadores activos, horas recuperadas, publicaciones distribuidas y ahorro acumulado cuando existan datos reales de uso.</p></div><div className="vyralProofMetrics"><article><span>CREADORES</span><strong>LIVE</strong><small>usuarios activos verificados</small></article><article><span>HORAS</span><strong>LIVE</strong><small>tiempo recuperado acumulado</small></article><article><span>AHORRO</span><strong>LIVE</strong><small>impacto estimado verificado</small></article></div></div>
    </section>

    <section className="vyralComparisonSection"><div className="vyralComparisonHead"><div><div className="vyralSectionIndex">POR QUÉ VYRAL</div><div className="vyralKicker">UN SISTEMA EN VEZ DE UN MOSAICO DE HERRAMIENTAS</div><h2>Compará el flujo.<br/><em>No sólo el precio.</em></h2></div><p>Distribución, medición, IA y automatizaciones nacen conectadas al mismo contenido y a la misma cuenta.</p></div><div className="vyralComparisonTable"><div className="head"><span>CAPACIDAD</span><b>VYRAL</b><i>STACK TRADICIONAL</i></div>{rows.map(([a,b,c])=><div key={a}><span>{a}</span><b>✓ {b}</b><i>{c}</i></div>)}</div><div className="vyralDifferenceRail"><article><span>01</span><b>Distribuí</b><p>Un contenido. Múltiples destinos. Un solo flujo.</p></article><article><span>02</span><b>Convertí</b><p>Comentarios → intención → DM → oportunidad.</p></article><article><span>03</span><b>Entendé</b><p>Analytics de toda la red.</p></article><article><span>04</span><b>Decidí</b><p>VYRAL Intelligence convierte datos en próximas acciones.</p></article></div><Link className="vyralCompareCta" href="/registro">Crear mi cuenta <span>↗</span></Link></section>
  </>;
}
