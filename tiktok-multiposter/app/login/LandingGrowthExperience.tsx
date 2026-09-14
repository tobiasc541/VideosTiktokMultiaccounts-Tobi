"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import VyralCore3D from "./VyralCore3D";
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
  stack: { title:"Herramientas separadas", text:"Sumá lo que pagarías por publicación, analytics, IA de contenido, automatizaciones y otras herramientas que hoy usás por separado." },
  hours: { title:"Horas operativas", text:"Incluye subir el mismo contenido varias veces, copiar captions, revisar cuentas, responder comentarios y consolidar métricas." },
  hourValue: { title:"Valor de tu tiempo", text:"Puede ser tu hora o la de un editor, community manager o miembro del equipo. Sirve para ponerle valor al tiempo que recuperás." },
  plan: { title:"Costo VYRAL", text:"Restamos el plan que elegís para que veas una diferencia estimada mensual y anual." }
} as const;
type TipKey = keyof typeof tips;

function InfoButton({ id, open, onToggle }: { id: TipKey; open: TipKey | null; onToggle: (id: TipKey) => void }) {
  const active = open === id;
  return <span className="vyralInfoWrap"><button type="button" className={`vyralInfoButton ${active?"active":""}`} onClick={()=>onToggle(id)}>!</button>{active&&<span className="vyralInfoPopover"><b>{tips[id].title}</b><p>{tips[id].text}</p></span>}</span>;
}

export default function LandingGrowthExperience(){
  const [stack,setStack]=useState(49);
  const [hours,setHours]=useState(10);
  const [hourValue,setHourValue]=useState(8);
  const [plan,setPlan]=useState(9.99);
  const [openTip,setOpenTip]=useState<TipKey|null>(null);
  const [heroMount,setHeroMount]=useState<HTMLElement|null>(null);

  useEffect(()=>{
    setHeroMount(document.querySelector(".loginHero") as HTMLElement|null);
    const targets=Array.from(document.querySelectorAll<HTMLElement>(".vyralSection,.loginExperience,.vyralTicker,.vyralImpactSection,.vyralComparisonSection"));
    targets.forEach((el,i)=>{el.classList.add("vyralReveal");el.dataset.reveal=String(i%4)});
    const io=new IntersectionObserver(entries=>entries.forEach(entry=>entry.target.classList.toggle("vyralIn",entry.isIntersecting)),{threshold:.12,rootMargin:"0px 0px -6% 0px"});
    targets.forEach(el=>io.observe(el));
    return()=>io.disconnect();
  },[]);

  const recoveredTimeValue=hours*hourValue;
  const currentOperation=stack+recoveredTimeValue;
  const savings=useMemo(()=>Math.max(0,currentOperation-plan),[currentOperation,plan]);
  const yearly=savings*12;

  return <>
    <NetworkFlowEnhancer/>
    {heroMount&&createPortal(<VyralCore3D size="hero" className="vyralHeroCore3D"/>,heroMount)}

    <section className="vyralImpactSection" aria-label="Impacto VYRAL">
      <div className="vyralImpactGlow one"/><div className="vyralImpactGlow two"/>
      <div className="vyralMoneyField" aria-hidden="true"><span className="bill b1">$</span><span className="bill b2">$</span><span className="bill b3">$</span><span className="coin c1">$</span><span className="coin c2">$</span></div>
      <div className="vyralValueOrbit" aria-label="Sistema conectado VYRAL"><VyralCore3D size="small" className="vyralValue3D" label={false}/><div className="vyralValueSatellite satOne"><i>01</i><div><b>DISTRIBUCIÓN</b><small>1 contenido → múltiples cuentas</small></div></div><div className="vyralValueSatellite satTwo"><i>02</i><div><b>AUTOMATIONS</b><small>Comentario → DM → oportunidad</small></div></div><div className="vyralValueSatellite satThree"><i>03</i><div><b>INTELLIGENCE</b><small>Datos → próxima acción</small></div></div></div>

      <div className="vyralImpactCopy">
        <div className="vyralSectionIndex">IMPACTO / OPERACIÓN</div><div className="vyralKicker">ECOMMERCE · CREADORES · AGENCIAS</div>
        <h2>Menos herramientas.<br/><em>Más margen para crecer.</em></h2>
        <p>VYRAL centraliza distribución, automatización, analytics e inteligencia. En vez de mostrar una cifra abstracta, te mostramos exactamente de dónde sale cada dólar del ahorro estimado.</p>
        <div className="vyralAudienceChips"><span>◌ Ecommerce</span><span>✦ Creadores</span><span>⌁ Equipos de contenido</span><span>↗ Agencias</span></div>
      </div>

      <div className="vyralSavingsCard">
        <div className="vyralSavingsTop"><div><span>SIMULADOR DE AHORRO</span><small>Calculá con tus propios costos</small></div><i>LIVE</i></div>
        <div className="vyralSavingsFormula"><div><small>HERRAMIENTAS</small><strong>US$ {stack}</strong><span>por mes</span></div><b>+</b><div><small>TIEMPO</small><strong>US$ {recoveredTimeValue}</strong><span>{hours} h × US$ {hourValue}</span></div><b>−</b><div><small>VYRAL</small><strong>US$ {plan.toFixed(2)}</strong><span>por mes</span></div></div>

        <div className="vyralSavingsControl"><div className="vyralSavingsLabel"><span>Herramientas que pagarías por separado</span><InfoButton id="stack" open={openTip} onToggle={id=>setOpenTip(openTip===id?null:id)}/><b>US$ {stack}/mes</b></div><p>Publicación + analytics + IA + automatizaciones.</p><input type="range" min="0" max="250" value={stack} onChange={e=>setStack(Number(e.target.value))}/></div>
        <div className="vyralSavingsControl"><div className="vyralSavingsLabel"><span>Horas repetitivas que recuperarías</span><InfoButton id="hours" open={openTip} onToggle={id=>setOpenTip(openTip===id?null:id)}/><b>{hours} h/mes</b></div><p>Subidas repetidas, captions, métricas y respuestas manuales.</p><input type="range" min="0" max="60" value={hours} onChange={e=>setHours(Number(e.target.value))}/></div>
        <div className="vyralSavingsControl"><div className="vyralSavingsLabel"><span>Valor de una hora de trabajo</span><InfoButton id="hourValue" open={openTip} onToggle={id=>setOpenTip(openTip===id?null:id)}/><b>US$ {hourValue}</b></div><p>Tu hora o la de alguien de tu equipo.</p><input type="range" min="1" max="80" value={hourValue} onChange={e=>setHourValue(Number(e.target.value))}/></div>

        <div className="vyralPlanTitle"><span>Plan VYRAL a comparar</span><InfoButton id="plan" open={openTip} onToggle={id=>setOpenTip(openTip===id?null:id)}/></div>
        <div className="vyralPlanSwitch">{[[4.99,"Inicio"],[9.99,"Crecimiento"],[19.99,"Escala"]].map(([v,n])=><button key={String(n)} className={plan===v?"active":""} onClick={()=>setPlan(Number(v))}>{n}<small>US$ {String(v).replace(".",",")}</small></button>)}</div>

        <div className="vyralSavingsBreakdown"><span><b>Costo operativo estimado hoy</b><strong>US$ {currentOperation.toFixed(0)}/mes</strong></span><span><b>Plan VYRAL elegido</b><strong>− US$ {plan.toFixed(2)}/mes</strong></span></div>
        <div className="vyralSavingsResult"><small>AHORRO POTENCIAL ESTIMADO</small><strong>US$ {savings.toFixed(0)}<span> AHORRADOS / MES</span></strong><div className="vyralYearly"><b>US$ {yearly.toFixed(0)}</b><span>AHORRO POTENCIAL / AÑO</span></div></div>
        <small className="vyralEstimateNote">Estimación interactiva basada en los valores que vos cargaste. No es una promesa de resultados.</small>
      </div>
    </section>

    <section className="vyralProofSection">
      <div className="vyralProofEyebrow">PRUEBA SOCIAL / TRANSPARENCIA</div><div className="vyralProofGrid"><div><h3>Construido para ahorrar tiempo, herramientas y fricción.</h3><p>Estamos en etapa de lanzamiento: no vamos a inventar “miles de clientes” ni ahorros históricos que todavía no podemos demostrar. Cuando tengamos datos reales, esta sección mostrará usuarios activos, horas recuperadas y ahorro acumulado verificado.</p></div><div className="vyralProofMetrics"><article><span>HOY</span><strong>0</strong><small>métricas infladas</small></article><article><span>SIEMPRE</span><strong>100%</strong><small>datos verificables</small></article><article><span>OBJETIVO</span><strong>↓</strong><small>menos costo operativo</small></article></div></div>
    </section>

    <section className="vyralComparisonSection"><div className="vyralComparisonHead"><div><div className="vyralSectionIndex">POR QUÉ VYRAL</div><div className="vyralKicker">UN SISTEMA EN VEZ DE UN MOSAICO DE HERRAMIENTAS</div><h2>Compará el flujo.<br/><em>No sólo el precio.</em></h2></div><p>Distribución, medición, IA y automatizaciones nacen conectadas al mismo contenido y a la misma cuenta.</p></div><div className="vyralComparisonTable"><div className="head"><span>CAPACIDAD</span><b>VYRAL</b><i>STACK TRADICIONAL</i></div>{rows.map(([a,b,c])=><div key={a}><span>{a}</span><b>✓ {b}</b><i>{c}</i></div>)}</div><div className="vyralDifferenceRail"><article><span>01</span><b>Distribuí</b><p>Un contenido. Múltiples destinos. Un solo flujo.</p></article><article><span>02</span><b>Convertí</b><p>Comentarios → intención → DM → oportunidad.</p></article><article><span>03</span><b>Entendé</b><p>Analytics de toda la red.</p></article><article><span>04</span><b>Decidí</b><p>VYRAL Intelligence convierte datos en próximas acciones.</p></article></div><Link className="vyralCompareCta" href="/registro">Crear mi cuenta <span>↗</span></Link></section>
  </>;
}
