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

const tips = {
  stack: {
    title: "¿Qué significa este monto?",
    text: "Es lo que hoy podrías terminar pagando entre herramientas separadas para publicar, medir, generar captions con IA y automatizar comentarios/DM. No ponemos un precio fijo porque cada stack es distinto: vos cargás tu realidad."
  },
  hours: {
    title: "¿Qué horas estamos contando?",
    text: "Tiempo repetitivo: subir el mismo contenido a varias cuentas, copiar captions, cambiar de plataforma, revisar métricas una por una, responder manualmente comentarios y ordenar resultados."
  },
  hourValue: {
    title: "¿Por qué importa tu hora?",
    text: "El tiempo recuperado también tiene valor. Si una persona de tu equipo dedica horas a tareas repetitivas, ese tiempo puede volver a creación, ventas, atención o estrategia."
  },
  plan: {
    title: "¿Qué descuenta VYRAL?",
    text: "El simulador resta el plan VYRAL que elegís para que veas una diferencia estimada entre tu operación actual y una operación centralizada."
  }
} as const;

type TipKey = keyof typeof tips;

function InfoButton({ id, open, onToggle }: { id: TipKey; open: TipKey | null; onToggle: (id: TipKey) => void }) {
  const active = open === id;
  return <span className="vyralInfoWrap">
    <button type="button" className={`vyralInfoButton ${active ? "active" : ""}`} aria-label={`Más información: ${tips[id].title}`} aria-expanded={active} onClick={() => onToggle(id)}>!</button>
    {active && <span className="vyralInfoPopover" role="note"><b>{tips[id].title}</b><p>{tips[id].text}</p><small>Tocá nuevamente el ! para cerrar.</small></span>}
  </span>;
}

export default function LandingGrowthExperience() {
  const [stack, setStack] = useState(49);
  const [hours, setHours] = useState(10);
  const [hourValue, setHourValue] = useState(8);
  const [plan, setPlan] = useState(9.99);
  const [openTip, setOpenTip] = useState<TipKey | null>(null);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>(".vyralSection,.loginExperience,.vyralTicker,.vyralImpactSection,.vyralComparisonSection"));
    targets.forEach((el) => el.classList.add("vyralReveal"));
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle("vyralIn", entry.isIntersecting));
    }, { threshold: .12, rootMargin: "0px 0px -6% 0px" });
    targets.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const recoveredTimeValue = hours * hourValue;
  const currentOperation = stack + recoveredTimeValue;
  const savings = useMemo(() => Math.max(0, currentOperation - plan), [currentOperation, plan]);
  const yearly = savings * 12;

  return <>
    <section className="vyralImpactSection" aria-label="Impacto VYRAL">
      <div className="vyralImpactGlow one"/><div className="vyralImpactGlow two"/>
      <div className="vyralValueOrbit" aria-hidden="true">
        <div className="vyralValueCore"><span>V</span><small>CORE</small></div>
        <div className="vyralValueSatellite satOne"><i>01</i><div><b>DISTRIBUCIÓN</b><small>1 contenido → múltiples cuentas</small></div></div>
        <div className="vyralValueSatellite satTwo"><i>02</i><div><b>AUTOMATIONS</b><small>Comentario → DM → oportunidad</small></div></div>
        <div className="vyralValueSatellite satThree"><i>03</i><div><b>INTELLIGENCE</b><small>Datos → próxima acción</small></div></div>
      </div>
      <div className="vyralImpactCopy">
        <div className="vyralSectionIndex">IMPACTO / OPERACIÓN</div>
        <div className="vyralKicker">ECOMMERCE · CREADORES · AGENCIAS</div>
        <h2>Menos herramientas.<br/><em>Más margen para crecer.</em></h2>
        <p>VYRAL está pensado para reemplazar tareas separadas por un solo flujo: distribuís, automatizás, medís y decidís desde el mismo sistema. El simulador no inventa resultados: usa tus propios costos y tu propio tiempo.</p>
        <div className="vyralAudienceChips"><span>◌ Ecommerce</span><span>✦ Creadores</span><span>⌁ Equipos de contenido</span><span>↗ Agencias</span></div>
      </div>

      <div className="vyralSavingsCard">
        <div className="vyralSavingsTop"><div><span>SIMULADOR DE AHORRO OPERATIVO</span><small>Completalo con tu operación actual</small></div><i>LIVE</i></div>

        <div className="vyralSavingsFormula" aria-label="Cómo se calcula el ahorro">
          <div><small>COSTO ACTUAL</small><strong>US$ {stack}</strong><span>herramientas / mes</span></div>
          <b>+</b>
          <div><small>TIEMPO OPERATIVO</small><strong>US$ {recoveredTimeValue}</strong><span>{hours} h × US$ {hourValue}</span></div>
          <b>−</b>
          <div><small>VYRAL</small><strong>US$ {plan.toFixed(2)}</strong><span>plan elegido</span></div>
        </div>

        <div className="vyralSavingsControl">
          <div className="vyralSavingsLabel"><span>1. ¿Cuánto pagás hoy en herramientas separadas?</span><InfoButton id="stack" open={openTip} onToggle={(id)=>setOpenTip(openTip===id?null:id)}/><b>US$ {stack}/mes</b></div>
          <p>Ej.: publicación, analytics, IA de contenido y automatizaciones contratadas por separado.</p>
          <input type="range" min="0" max="250" value={stack} onChange={(e)=>setStack(Number(e.target.value))}/>
        </div>

        <div className="vyralSavingsControl">
          <div className="vyralSavingsLabel"><span>2. ¿Cuántas horas repetitivas querés recuperar?</span><InfoButton id="hours" open={openTip} onToggle={(id)=>setOpenTip(openTip===id?null:id)}/><b>{hours} h/mes</b></div>
          <p>Subidas repetidas, copiar captions, revisar cuentas, responder comentarios y ordenar métricas.</p>
          <input type="range" min="0" max="60" value={hours} onChange={(e)=>setHours(Number(e.target.value))}/>
        </div>

        <div className="vyralSavingsControl">
          <div className="vyralSavingsLabel"><span>3. ¿Cuánto vale una hora de ese trabajo?</span><InfoButton id="hourValue" open={openTip} onToggle={(id)=>setOpenTip(openTip===id?null:id)}/><b>US$ {hourValue}</b></div>
          <p>Puede ser tu hora, la de un editor, community manager o miembro del equipo.</p>
          <input type="range" min="1" max="80" value={hourValue} onChange={(e)=>setHourValue(Number(e.target.value))}/>
        </div>

        <div className="vyralPlanTitle"><span>4. Elegí el plan que compararías</span><InfoButton id="plan" open={openTip} onToggle={(id)=>setOpenTip(openTip===id?null:id)}/></div>
        <div className="vyralPlanSwitch">{[[4.99,"Inicio"],[9.99,"Crecimiento"],[19.99,"Escala"]].map(([v,n])=><button key={String(n)} className={plan===v?"active":""} onClick={()=>setPlan(Number(v))}>{n}<small>US$ {String(v).replace(".",",")}</small></button>)}</div>

        <div className="vyralSavingsBreakdown">
          <span><b>Operación actual estimada</b><strong>US$ {currentOperation.toFixed(0)}/mes</strong></span>
          <span><b>Plan VYRAL seleccionado</b><strong>− US$ {plan.toFixed(2)}/mes</strong></span>
        </div>
        <div className="vyralSavingsResult"><small>DIFERENCIA POTENCIAL ESTIMADA</small><strong>US$ {savings.toFixed(0)}<span>/mes</span></strong><p>≈ US$ {yearly.toFixed(0)} al año según los valores que vos cargaste.</p></div>
        <small className="vyralEstimateNote">Estimación interactiva, no una promesa de resultados. El ahorro real depende de tus herramientas, procesos y uso de VYRAL.</small>
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
