"use client";
import {useEffect,useMemo,useState} from "react";
import "./vyral-live-experience.css";

const stages=["CREAR","OPTIMIZAR","DISTRIBUIR","AUTOMATIZAR","MEDIR","CRECER"];
const networks=["TikTok","Instagram","Facebook","YouTube"];
const demos:{[k:string]:{hook:string;caption:string;tags:string[]}}={
 zapatillas:{hook:"El detalle que cambia todo en tu próximo look.",caption:"Comodidad que entra por los ojos. Mostralas en movimiento y cerrá con una pregunta simple.",tags:["#zapatillas","#estilo","#parati"]},
 ecommerce:{hook:"Si vendés online, esto te ahorra trabajo desde hoy.",caption:"Una pieza, múltiples destinos y una operación mucho más simple.",tags:["#ecommerce","#ventas","#contenido"]},
 default:{hook:"No empieces explicando: empezá mostrando el resultado.",caption:"Convertí una idea en una pieza clara, directa y lista para distribuir.",tags:["#contenido","#creadores","#vyral"]}
};

export default function VyralLiveExperience(){
 const[mode,setMode]=useState<"manual"|"vyral">("vyral");
 const[run,setRun]=useState(0); const[topic,setTopic]=useState("ecommerce"); const[scoreOpen,setScoreOpen]=useState(false); const[stage,setStage]=useState(0);
 useEffect(()=>{const on=()=>{const max=Math.max(1,document.documentElement.scrollHeight-innerHeight);setStage(Math.min(5,Math.floor((scrollY/max)*6)))};on();addEventListener("scroll",on,{passive:true});return()=>removeEventListener("scroll",on)},[]);
 const result=useMemo(()=>demos[topic.toLowerCase().trim()]||demos.default,[topic]);
 return <section className="vlx" aria-label="Probá VYRAL">
  <div className="vlxHead"><div><small>VYRAL LIVE EXPERIENCE / INTERACTIVO</small><h2>No te lo contamos.<br/><em>Probalo.</em></h2><p>Una demostración del recorrido que hace una pieza cuando crear, optimizar, distribuir y medir viven en el mismo sistema.</p></div><div className="vlxLive"><i/> DEMO LIVE</div></div>
  <div className="vlxConsole">
   <div className="vlxNav"><b>VYRAL / CONTROL</b><span>PRODUCT SANDBOX</span><i>● ONLINE</i></div>
   <div className="vlxWorkspace">
    <div className="vlxUpload"><small>01 / CONTENIDO</small><div className="vlxVideo"><span>▶</span><b>VIDEO_01.MP4</b><i>READY</i></div><p>Una sola pieza entra al sistema.</p></div>
    <div className="vlxDestinations"><small>02 / DESTINOS</small>{networks.map((n,i)=><div key={n} className={run?"pulse":""} style={{animationDelay:`${i*.16}s`}}><span>{n[0]}</span><b>{n}</b><i>{run?"PUBLICADO":"LISTO"}</i></div>)}<button onClick={()=>{setRun(0);requestAnimationFrame(()=>setRun(Date.now()))}}>DISTRIBUIR AHORA ↗</button></div>
    <div className="vlxStatus"><small>03 / EJECUCIÓN</small><strong>{run?"4/4":"0/4"}</strong><span>{run?"DESTINOS PUBLICADOS":"ESPERANDO ACCIÓN"}</span><div className={run?"vlxRing active":"vlxRing"}><i/></div></div>
   </div>
  </div>
  <div className="vlxSplit">
   <article className="vlxCompare"><div className="vlxArticleTop"><small>ANTES / DESPUÉS</small><div><button className={mode==="manual"?"active":""} onClick={()=>setMode("manual")}>SIN VYRAL</button><button className={mode==="vyral"?"active":""} onClick={()=>setMode("vyral")}>CON VYRAL</button></div></div><h3>{mode==="manual"?"El mismo trabajo, repetido.":"Una carga. Tu red se activa."}</h3><div className="vlxLoadBars">{Array.from({length:mode==="manual"?12:1}).map((_,i)=><i key={i}/>)}</div><strong>{mode==="manual"?"12 cargas manuales":"1 carga central"}</strong><p>{mode==="manual"?"Abrir cuentas, repetir campos, volver a subir.":"VYRAL organiza los destinos desde un único flujo."}</p></article>
   <article className="vlxAi"><small>VYRAL INTELLIGENCE / LAB</small><h3>Decile qué vendés.</h3><div className="vlxPrompt"><input value={topic} onChange={e=>setTopic(e.target.value)} placeholder="Ej: zapatillas"/><span>✦</span></div><div className="vlxAiResult"><label>HOOK</label><b>{result.hook}</b><label>CAPTION</label><p>{result.caption}</p><div>{result.tags.map(t=><span key={t}>{t}</span>)}</div></div></article>
  </div>
  <div className="vlxBottom">
   <article className="vlxScore" onClick={()=>setScoreOpen(!scoreOpen)}><small>CONTENT SIGNAL / TOCÁ PARA EXPLORAR</small><div><strong>87<span>/100</span></strong><b>Potencial alto</b></div>{scoreOpen?<div className="vlxScoreParts"><span>HOOK <b>92</b></span><span>CLARIDAD <b>84</b></span><span>CTA <b>71</b></span><span>POTENCIAL <b>88</b></span></div>:<p>Hook claro · propuesta visible · CTA mejorable <i>＋</i></p>}</article>
   <article className="vlxJourney"><small>RECORRIDO VYRAL</small><div className="vlxJourneyRail">{stages.map((s,i)=><span key={s} className={i<=stage?"active":""}><i>{String(i+1).padStart(2,"0")}</i><b>{s}</b></span>)}</div><p><i/> El contenido avanza con vos mientras recorrés VYRAL.</p></article>
  </div>
 </section>
}
