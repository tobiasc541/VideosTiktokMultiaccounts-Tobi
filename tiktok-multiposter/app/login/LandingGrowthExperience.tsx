"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./landing-growth.css";

const rows = [
  ["Publicación multicuentas", "Incluido", "Varias herramientas / procesos"],
  ["Analytics unificado", "Incluido", "Suele estar separado"],
  ["IA aplicada al contenido", "Incluido según plan", "Suele requerir otra herramienta"],
  ["Automatizaciones comentario → DM", "Integradas", "Normalmente se contrata aparte"],
  ["Soporte + operación + creator program", "Un solo sistema", "Flujos fragmentados"],
  ["Precio de entrada", "Desde US$ 4,99 / mes", "Depende del stack que armes"]
];

export default function LandingGrowthExperience() {
  const [stack, setStack] = useState(49);
  const [hours, setHours] = useState(10);
  const [hourValue, setHourValue] = useState(8);
  const [plan, setPlan] = useState(9.99);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>(".vyralSection,.loginExperience,.vyralTicker,.vyralImpactSection,.vyralComparisonSection"));
    targets.forEach((el) => el.classList.add("vyralReveal"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("vyralIn", entry.isIntersecting));
    }, { threshold: .12, rootMargin: "0px 0px -6% 0px" });
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const savings = useMemo(() => Math.max(0, stack + hours * hourValue - plan), [stack, hours, hourValue, plan]);
  const yearly = savings * 12;

  return <>
    <section className="vyralImpactSection" aria-label="Impacto VYRAL">
      <div className="vyralImpactGlow one"/><div className="vyralImpactGlow two"/>
      <div className="vyralImpactFloat money">$</div><div className="vyralImpactFloat people">◎</div><div className="vyralImpactFloat network">⌁</div>
      <div className="vyralImpactCopy">
        <div className="vyralSectionIndex">IMPACTO / OPERACIÓN</div>
        <div className="vyralKicker">ECOMMERCE · CREADORES · AGENCIAS</div>
        <h2>Menos herramientas.<br/><em>Más margen para crecer.</em></h2>
        <p>VYRAL está construido para centralizar distribución, analytics, inteligencia y automatización. En lugar de inventar una cifra de ahorro, te mostramos cuánto podrías ahorrar según tu propia operación.</p>
        <div className="vyralAudienceChips"><span>◌ Ecommerce</span><span>✦ Creadores</span><span>⌁ Equipos de contenido</span><span>↗ Agencias</span></div>
      </div>
      <div className="vyralSavingsCard">
        <div className="vyralSavingsTop"><span>SIMULADOR DE AHORRO OPERATIVO</span><i>LIVE</i></div>
        <label>Software / herramientas que pagarías por separado <b>US$ {stack}/mes</b><input type="range" min="0" max="250" value={stack} onChange={(e)=>setStack(Number(e.target.value))}/></label>
        <label>Horas repetitivas que querés recuperar <b>{hours} h/mes</b><input type="range" min="0" max="60" value={hours} onChange={(e)=>setHours(Number(e.target.value))}/></label>
        <label>Valor estimado de tu hora <b>US$ {hourValue}</b><input type="range" min="1" max="80" value={hourValue} onChange={(e)=>setHourValue(Number(e.target.value))}/></label>
        <div className="vyralPlanSwitch">{[[4.99,"Inicio"],[9.99,"Crecimiento"],[19.99,"Escala"]].map(([v,n])=><button key={String(n)} className={plan===v?"active":""} onClick={()=>setPlan(Number(v))}>{n}<small>US$ {String(v).replace(".",",")}</small></button>)}</div>
        <div className="vyralSavingsResult"><small>AHORRO POTENCIAL ESTIMADO</small><strong>US$ {savings.toFixed(0)}<span>/mes</span></strong><p>≈ US$ {yearly.toFixed(0)} al año según los valores que elegiste.</p></div>
        <small className="vyralEstimateNote">Estimación interactiva, no una promesa de resultados. El ahorro real depende de tu stack y operación.</small>
      </div>
    </section>

    <section className="vyralComparisonSection">
      <div className="vyralComparisonHead"><div><div className="vyralSectionIndex">POR QUÉ VYRAL</div><div className="vyralKicker">UN SISTEMA EN VEZ DE UN MOSAICO DE HERRAMIENTAS</div><h2>Compará el flujo.<br/><em>No sólo el precio.</em></h2></div><p>La diferencia de VYRAL es que distribución, medición, IA y automatizaciones nacen conectadas al mismo contenido y a la misma cuenta.</p></div>
      <div className="vyralComparisonTable"><div className="head"><span>CAPACIDAD</span><b>VYRAL</b><i>STACK TRADICIONAL</i></div>{rows.map(([a,b,c])=><div key={a}><span>{a}</span><b>✓ {b}</b><i>{c}</i></div>)}</div>
      <div className="vyralDifferenceRail"><article><span>01</span><b>Distribuí</b><p>Un contenido. Múltiples destinos. Un solo flujo.</p></article><article><span>02</span><b>Convertí</b><p>Comentarios → intención → DM → oportunidad.</p></article><article><span>03</span><b>Entendé</b><p>Analytics que miran la red completa, no cuentas aisladas.</p></article><article><span>04</span><b>Decidí</b><p>VYRAL Intelligence transforma datos en próximas acciones.</p></article></div>
      <Link className="vyralCompareCta" href="/registro">Crear mi cuenta <span>↗</span></Link>
    </section>
  </>;
}
