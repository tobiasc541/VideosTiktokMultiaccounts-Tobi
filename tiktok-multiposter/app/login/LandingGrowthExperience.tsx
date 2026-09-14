"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import NetworkFlowEnhancer from "./NetworkFlowEnhancer";
import "./landing-growth.css";
import "./landing-ultra.css";

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
  accounts: { title:"Cuentas por publicación", text:"Cuantas más cuentas reciben el mismo contenido, más trabajo repetitivo existe cuando se publica manualmente. Esto impacta en el tiempo operativo recuperable." },
  hourValue: { title:"Costo por hora del equipo", text:"Puede ser tu hora o la de un editor, community manager o miembro del equipo. Se usa para valorar las horas operativas que VYRAL puede recuperar." }
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

  // Transparencia: VYRAL no cuenta la edición creativa como ahorro. Se asumen 30 min de edición por pieza sólo como contexto de producción.
  const editHours = videos * .5;
  // Trabajo operativo estimado: 5 min base por pieza + 8 min por cada destino adicional.
  const savedMinutesPerVideo = 5 + Math.max(0,accounts-1)*8;
  const savedHours = videos * savedMinutesPerVideo / 60;
  const laborValue = savedHours * hourValue;
  const replaceableSoftware = aiCost + toolsCost;
  const grossPotential = replaceableSoftware + laborValue;
  const monthlySavings = Math.max(0,grossPotential-plan.price);
  const yearlySavings = monthlySavings*12;
  const overCapacity = videos>plan.limit;

  return <>
    <NetworkFlowEnhancer/>

    <section className="vyralImpactSection" aria-label="Impacto VYRAL">
      <div className="vyralImpactGlow one"/><div className="vyralImpactGlow two"/>
      <div className="vyralImpactCopy">
        <div className="vyralSectionIndex">IMPACTO / OPERACIÓN</div><div className="vyralKicker">ECOMMERCE · CREADORES · AGENCIAS</div>
        <h2>Menos herramientas.<br/><em>Más margen para crecer.</em></h2>
        <p>Decinos cuánto producís y cuánto cuesta hoy tu operación. VYRAL calcula automáticamente el plan recomendado, las horas operativas que podrías recuperar y el impacto económico estimado.</p>
        <div className="vyralAudienceChips"><span>◌ Ecommerce</span><span>✦ Creadores</span><span>⌁ Equipos de contenido</span><span>↗ Agencias</span></div>
        <div className="vyralAssumptionCard"><span>SUPUESTO TRANSPARENTE</span><b>30 min de edición por video</b><p>Lo usamos para dimensionar tu producción, pero <strong>no</strong> lo contamos como tiempo ahorrado porque VYRAL no reemplaza la edición creativa.</p></div>
      </div>

      <div className="vyralSavingsCard">
        <div className="vyralSavingsTop"><div><span>SIMULADOR DE OPERACIÓN</span><small>Vos cargás 5 datos. VYRAL calcula el resto.</small></div><i>LIVE</i></div>

        <div className="vyralSavingsInputs">
          <div className="vyralSavingsControl"><div className="vyralSavingsLabel"><span>Gasto mensual en IA</span><InfoButton id="ai" open={openTip} onToggle={id=>setOpenTip(openTip===id?null:id)}/><b>US$ {aiCost}/mes</b></div><input type="range" min="0" max="300" value={aiCost} onChange={e=>setAiCost(Number(e.target.value))}/></div>
          <div className="vyralSavingsControl"><div className="vyralSavingsLabel"><span>Gasto mensual en apps / software</span><InfoButton id="tools" open={openTip} onToggle={id=>setOpenTip(openTip===id?null:id)}/><b>US$ {toolsCost}/mes</b></div><input type="range" min="0" max="500" value={toolsCost} onChange={e=>setToolsCost(Number(e.target.value))}/></div>
          <div className="vyralSavingsControl featured"><div className="vyralSavingsLabel"><span>Videos que publicás por mes</span><InfoButton id="videos" open={openTip} onToggle={id=>setOpenTip(openTip===id?null:id)}/><b>{videos} videos</b></div><input type="range" min="1" max="500" value={videos} onChange={e=>setVideos(Number(e.target.value))}/></div>
          <div className="vyralSavingsControl"><div className="vyralSavingsLabel"><span>Cuentas promedio por video</span><InfoButton id="accounts" open={openTip} onToggle={id=>setOpenTip(openTip===id?null:id)}/><b>{accounts} cuentas</b></div><input type="range" min="1" max="30" value={accounts} onChange={e=>setAccounts(Number(e.target.value))}/></div>
          <div className="vyralSavingsControl"><div className="vyralSavingsLabel"><span>Costo por hora de tu equipo</span><InfoButton id="hourValue" open={openTip} onToggle={id=>setOpenTip(openTip===id?null:id)}/><b>US$ {hourValue}/h</b></div><input type="range" min="1" max="100" value={hourValue} onChange={e=>setHourValue(Number(e.target.value))}/></div>
        </div>

        <div className="vyralAutoPlan">
          <div><small>PLAN RECOMENDADO AUTOMÁTICAMENTE</small><strong>{plan.name}</strong><span>US$ {plan.price.toFixed(2)}/mes · hasta {plan.limit} videos</span></div>
          <div className="vyralAutoPlanBadge">{plan.id==="inicio"?"01":plan.id==="pro"?"02":"03"}</div>
        </div>

        <div className="vyralCalcStory">
          <article><small>PRODUCCIÓN MENSUAL</small><strong>{videos}</strong><span>videos · {editHours.toFixed(0)} h estimadas de edición</span></article>
          <article><small>TIEMPO OPERATIVO RECUPERABLE</small><strong>{savedHours.toFixed(1)} h</strong><span>{savedMinutesPerVideo} min repetitivos por video</span></article>
          <article><small>VALOR DEL TIEMPO RECUPERADO</small><strong>US$ {laborValue.toFixed(0)}</strong><span>{savedHours.toFixed(1)} h × US$ {hourValue}/h</span></article>
        </div>

        <div className="vyralSavingsBreakdown">
          <span><b>IA + apps que podrías centralizar</b><strong>US$ {replaceableSoftware.toFixed(0)}/mes</strong></span>
          <span><b>Valor del tiempo operativo recuperado</b><strong>+ US$ {laborValue.toFixed(0)}/mes</strong></span>
          <span><b>Plan {plan.name}</b><strong>− US$ {plan.price.toFixed(2)}/mes</strong></span>
        </div>

        <div className="vyralSavingsResult"><small>AHORRO POTENCIAL ESTIMADO</small><strong>US$ {monthlySavings.toFixed(0)}<span> AHORRADOS / MES</span></strong><div className="vyralYearly"><b>US$ {yearlySavings.toFixed(0)}</b><span>AHORRO POTENCIAL / AÑO</span></div></div>
        {overCapacity&&<div className="vyralCapacityNote">Tu volumen supera la capacidad incluida del plan mostrado. Para más de 500 videos/mes necesitaremos una configuración de mayor capacidad.</div>}
        <small className="vyralEstimateNote">Estimación basada en tus datos y en {savedMinutesPerVideo} min de trabajo operativo repetitivo por pieza. No es una promesa de resultados ni supone reducción de personal.</small>
      </div>
    </section>

    <section className="vyralProofSection">
      <div className="vyralProofEyebrow">IMPACTO MEDIBLE / DESDE EL LANZAMIENTO</div>
      <div className="vyralProofGrid"><div><h3>La prueba social va a ser real, no inventada.</h3><p>Esta sección queda preparada para mostrar automáticamente creadores activos, horas recuperadas, publicaciones distribuidas y ahorro acumulado cuando existan datos reales de uso.</p></div><div className="vyralProofMetrics"><article><span>CREADORES</span><strong>LIVE</strong><small>usuarios activos verificados</small></article><article><span>HORAS</span><strong>LIVE</strong><small>tiempo recuperado acumulado</small></article><article><span>AHORRO</span><strong>LIVE</strong><small>impacto estimado verificado</small></article></div></div>
    </section>

    <section className="vyralComparisonSection"><div className="vyralComparisonHead"><div><div className="vyralSectionIndex">POR QUÉ VYRAL</div><div className="vyralKicker">UN SISTEMA EN VEZ DE UN MOSAICO DE HERRAMIENTAS</div><h2>Compará el flujo.<br/><em>No sólo el precio.</em></h2></div><p>Distribución, medición, IA y automatizaciones nacen conectadas al mismo contenido y a la misma cuenta.</p></div><div className="vyralComparisonTable"><div className="head"><span>CAPACIDAD</span><b>VYRAL</b><i>STACK TRADICIONAL</i></div>{rows.map(([a,b,c])=><div key={a}><span>{a}</span><b>✓ {b}</b><i>{c}</i></div>)}</div><div className="vyralDifferenceRail"><article><span>01</span><b>Distribuí</b><p>Un contenido. Múltiples destinos. Un solo flujo.</p></article><article><span>02</span><b>Convertí</b><p>Comentarios → intención → DM → oportunidad.</p></article><article><span>03</span><b>Entendé</b><p>Analytics de toda la red.</p></article><article><span>04</span><b>Decidí</b><p>VYRAL Intelligence convierte datos en próximas acciones.</p></article></div><Link className="vyralCompareCta" href="/registro">Crear mi cuenta <span>↗</span></Link></section>
  </>;
}
