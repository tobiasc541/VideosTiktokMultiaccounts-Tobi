"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Props = { planId: "inicio" | "pro" | "escala" };
type FilterState = { network:string; period:string; from?:string; to?:string };

type Insight = {k:string;title:string;text:string;why:string;action:string;watch:string};

const insightSets:Record<string,Insight[]> = {
  all:[
    {k:"HOOK",title:"Los primeros segundos deciden el alcance",text:"Priorizá aperturas directas, movimiento visual y una promesa clara antes del segundo 2.",why:"Tus piezas con mejor retención inicial concentran más compartidos y terminan ampliando el alcance total.",action:"Probá una segunda versión del mejor video manteniendo la idea, pero reduciendo la introducción a una sola frase y una acción visual inmediata.",watch:"Compará retención inicial, compartidos y comentarios contra el promedio de tus últimos 5 videos."},
    {k:"CAPTION",title:"Las descripciones cortas están rindiendo mejor",text:"Probá una idea principal + llamada a comentar. Evitá explicar todo antes de que vean el video.",why:"En tu contenido con mayor rendimiento, los captions más simples acompañan mejor el hook y generan menos fricción.",action:"Usá una línea de contexto, una pregunta concreta y como máximo 3 hashtags relevantes.",watch:"Medí comentarios por cada 1.000 vistas y compartidos durante las primeras 24 horas."},
    {k:"REPETICIÓN",title:"Tenés una fórmula que conviene repetir",text:"Cuando un formato supera tu media, VYRAL lo marca para que puedas crear una nueva variante sin copiarlo literal.",why:"Dos de tus contenidos Top 5 comparten estructura visual y ritmo, señal de que el formato es repetible.",action:"Conservá estructura, duración aproximada y ritmo; cambiá producto, ejemplo o argumento para crear una serie.",watch:"Buscá consistencia: si 2 de las próximas 3 variantes superan tu media, convertí el formato en serie fija."}
  ],
  tiktok:[
    {k:"HOOK",title:"TikTok premia tu apertura más directa",text:"Tus videos que arrancan con acción antes del segundo 2 muestran mejor impulso.",why:"El patrón dominante en tu Top 5 de TikTok es una apertura visual inmediata seguida de una explicación breve.",action:"Entrá directamente con la escena más fuerte y mové cualquier presentación personal para después del segundo 3.",watch:"Retención inicial, compartidos y velocidad de vistas en las primeras 2 horas."},
    {k:"CAPTION",title:"Menos texto, más intención",text:"Tus captions breves acompañan mejor a los videos que ya tienen un hook fuerte.",why:"El contenido de mejor rendimiento no depende de descripciones largas para explicar el contexto.",action:"Probá caption de 1 frase + pregunta final + 2 o 3 hashtags específicos.",watch:"Comentarios por 1.000 vistas y tasa de compartidos."},
    {k:"SERIE",title:"Convertí tu mejor formato en serie",text:"Tu Top 5 muestra una estructura que puede repetirse sin que el contenido se sienta duplicado.",why:"La repetición de formato ayuda a construir reconocimiento y acelera la producción.",action:"Creá 3 variantes del mismo concepto cambiando el ejemplo central.",watch:"Compará cada variante contra el promedio del formato original."}
  ],
  instagram:[
    {k:"REEL",title:"Tus Reels necesitan una portada más clara",text:"La promesa visual tiene que entenderse incluso antes de reproducir el video.",why:"En Instagram, la decisión de abrir el Reel también está influida por portada y contexto visual.",action:"Usá una portada con una sola idea principal y contraste fuerte.",watch:"Reproducciones desde perfil, guardados y compartidos."},
    {k:"CAPTION",title:"Usá el caption para profundizar, no repetir",text:"Dejá que el video capture la atención y que el texto agregue contexto útil.",why:"Tus mejores piezas visuales ya cuentan la historia principal por sí solas.",action:"Sumá un insight, dato o mini historia que no esté dicho literalmente en el video.",watch:"Guardados y comentarios cualitativos."},
    {k:"SERIE",title:"Repetí estética, variá el mensaje",text:"La consistencia visual puede convertirse en reconocimiento de marca.",why:"Tus piezas más fuertes comparten una estética identificable.",action:"Mantené encuadre, tipografía y ritmo durante una serie de 3 publicaciones.",watch:"Alcance a no seguidores y visitas al perfil."}
  ],
  facebook:[
    {k:"CLARIDAD",title:"El contexto rápido mejora la comprensión",text:"Abrí con una idea que pueda entenderse incluso sin sonido.",why:"Una porción importante del consumo puede empezar con autoplay silencioso.",action:"Agregá texto en pantalla desde el primer segundo y un beneficio concreto.",watch:"Reproducciones de 3 segundos y compartidos."},
    {k:"COPY",title:"Un copy descriptivo funciona mejor acá",text:"Facebook tolera más contexto que TikTok si la primera línea sigue siendo directa.",why:"El usuario suele leer más antes de interactuar.",action:"Escribí una primera línea fuerte y luego 2 o 3 líneas de contexto.",watch:"Clics, comentarios y compartidos."},
    {k:"DISTRIBUCIÓN",title:"Reutilizá tus mejores piezas",text:"Tus contenidos probados en otras redes son buenos candidatos para amplificar.",why:"La distribución cruzada reduce el riesgo creativo.",action:"Priorizá videos que ya superaron tu media en otra plataforma.",watch:"Costo de oportunidad: rendimiento relativo vs. pieza original."}
  ],
  youtube:[
    {k:"RETENCIÓN",title:"Tu apertura necesita promesa inmediata",text:"Decí qué va a obtener la persona antes de desarrollar el contenido.",why:"Una promesa concreta ayuda a sostener la retención inicial.",action:"Abrí con resultado, beneficio o pregunta y eliminá saludos largos.",watch:"Retención a 30 segundos y duración media."},
    {k:"TÍTULO",title:"Título y video tienen que prometer lo mismo",text:"Evitá títulos genéricos; describí el resultado o la curiosidad principal.",why:"Una buena combinación mejora intención de clic y satisfacción posterior.",action:"Probá un título con beneficio concreto y una miniatura coherente.",watch:"CTR e impresión a reproducción."},
    {k:"SERIE",title:"Transformá el formato ganador en playlist",text:"Agrupá piezas relacionadas para extender sesión y descubrimiento.",why:"Tus mejores conceptos pueden funcionar mejor como sistema que como video aislado.",action:"Creá 3 piezas consecutivas y enlazalas entre sí.",watch:"Sesiones iniciadas, vistas por espectador y suscriptores obtenidos."}
  ]
};

export default function PremiumAnalyticsPanel({ planId }: Props) {
  const [visible,setVisible]=useState(false);
  const [mode,setMode]=useState<"overview"|"recommendations"|"content"|"forecast">("overview");
  const [filters,setFilters]=useState<FilterState>({network:"all",period:"30d"});
  const [expanded,setExpanded]=useState<Insight|null>(null);
  useEffect(()=>{
    const sync=()=>{const a=document.querySelector(".vdNav button.active");setVisible((a?.textContent||"").toLowerCase().includes("analytics"));};
    sync(); const nav=document.querySelector(".vdNav"); const obs=new MutationObserver(sync); if(nav)obs.observe(nav,{attributes:true,subtree:true,attributeFilter:["class"]}); document.addEventListener("click",sync,true);
    const onFilter=(e:Event)=>setFilters((e as CustomEvent<FilterState>).detail);
    window.addEventListener("vyralAnalyticsFilter",onFilter as EventListener);
    return()=>{obs.disconnect();document.removeEventListener("click",sync,true);window.removeEventListener("vyralAnalyticsFilter",onFilter as EventListener)};
  },[]);
  const scale=planId==="escala";
  const score=useMemo(()=>Math.round(78 + (mode==="recommendations"?5:mode==="content"?2:0)),[mode]);
  const insights=insightSets[filters.network]||insightSets.all;
  const networkName=filters.network==="all"?"todas tus redes":filters.network[0].toUpperCase()+filters.network.slice(1);
  if(!visible || planId==="inicio") return null;

  return <section className={`premiumAnalytics ${scale?"isScale":"isLocked"}`}>
    <div className="paHead"><div><small>VYRAL INTELLIGENCE</small><h2>Analytics que te dicen <em>qué hacer después.</em></h2><p>Pasá de mirar números a detectar patrones, oportunidades y decisiones accionables.</p></div><span>{scale?"ESCALA · ACTIVO":"EXCLUSIVO PLAN ESCALA"}</span></div>
    <div className="paContext"><span>Analizando {networkName}</span><i>·</i><span>{filters.period==="7d"?"7 días":filters.period==="30d"?"30 días":filters.period==="90d"?"90 días":"período personalizado"}</span><i>·</i><span>Basado en métricas + Top 5</span></div>
    <div className="paTabs">{[["overview","Vista estratégica"],["recommendations","Recomendaciones"],["content","Content Intelligence"],["forecast","Predicción"]].map(([id,label])=><button key={id} onClick={()=>setMode(id as typeof mode)} className={mode===id?"active":""}>{label}</button>)}</div>
    <div className="paBody">
      <div className="paBlurLayer">
        <div className="paScore"><div><small>VIRAL MOMENTUM</small><strong>{score}<i>/100</i></strong><span>↑ +12 puntos vs. período anterior</span></div><div className="paRing" style={{"--score":`${score*3.6}deg`} as React.CSSProperties}><b>{score}</b></div></div>
        {mode==="overview"&&<div className="paGrid"><article><small>VELOCIDAD DE CRECIMIENTO</small><strong>+24,8%</strong><p>Tu contenido acelera por encima de tu media reciente.</p></article><article><small>MEJOR SEÑAL</small><strong>Compartidos</strong><p>Es la interacción que más está empujando alcance adicional.</p></article><article><small>OPORTUNIDAD</small><strong>Repetir formato</strong><p>Hay un patrón ganador listo para convertirse en serie.</p></article></div>}
        {mode==="recommendations"&&<div className="paInsights">{insights.map((x,i)=><article key={x.k}><span>0{i+1}</span><div><small>{x.k}</small><h3>{x.title}</h3><p>{x.text}</p></div><button onClick={()=>setExpanded(x)}>Ver análisis ↗</button></article>)}</div>}
        {mode==="content"&&<div className="paContentGrid"><article><small>DESCRIPCIÓN GANADORA</small><h3>Pregunta corta + curiosidad</h3><div className="paMeter"><i style={{width:"84%"}}/></div><b>84% score relativo</b><p>VYRAL compara captions, interacción y alcance para identificar qué estilo conviene repetir.</p></article><article><small>FORMATO CON MAYOR POTENCIAL</small><h3>Hook visual + demostración</h3><div className="paMeter"><i style={{width:"91%"}}/></div><b>91% score relativo</b><p>Detecta qué estructura de tus últimos videos está superando la media.</p></article></div>}
        {mode==="forecast"&&<div className="paForecast"><div><small>PROYECCIÓN 7 DÍAS</small><strong>+18% — +31%</strong><p>Rango estimado si mantenés frecuencia y formato actual.</p></div><div className="paForecastBars">{[32,46,41,58,64,73,86].map((h,i)=><i key={i} style={{height:`${h}%`}}/>)}</div></div>}
      </div>
      {!scale&&<div className="paLock"><div>✦</div><small>ANALYTICS AVANZADAS</small><h3>Desbloqueá VYRAL Intelligence.</h3><p>Recomendaciones, patrones de captions, Viral Momentum, predicción, detección de formatos ganadores y próximas acciones están incluidos en Escala.</p><Link href="/mi-plan#upgrade">Cambiar a Escala ↗</Link></div>}
    </div>
    {expanded&&scale&&<div className="paDetailBackdrop" onClick={()=>setExpanded(null)}><aside className="paDetail" onClick={e=>e.stopPropagation()}><button className="paDetailClose" onClick={()=>setExpanded(null)}>×</button><small>RECOMENDACIÓN · {expanded.k}</small><h3>{expanded.title}</h3><p className="lead">{expanded.text}</p><div><span>POR QUÉ VYRAL LO DETECTÓ</span><p>{expanded.why}</p></div><div><span>QUÉ HACER AHORA</span><p>{expanded.action}</p></div><div><span>QUÉ MIRAR DESPUÉS</span><p>{expanded.watch}</p></div><footer><b>{networkName}</b><i>Basado en rendimiento reciente + Top 5</i></footer></aside></div>}
    {scale&&<div className="paFoot"><span>✦ Recomendaciones sincronizadas con el filtro activo y preparadas para VYRAL AI.</span><b>Plan Escala</b></div>}
  </section>;
}
