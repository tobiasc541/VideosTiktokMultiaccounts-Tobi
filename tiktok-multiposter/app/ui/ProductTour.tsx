"use client";

import { useEffect, useMemo, useState } from "react";
import "./product-tour.css";

type SectionKey = "dashboard"|"publish"|"accounts"|"history"|"analytics";
type Step = { title:string; body:string; target:string; section?:SectionKey };

const steps:Step[] = [
  { title:"Bienvenido a VYRAL", body:"Te mostramos exactamente dónde está cada función. Podés omitir la guía cuando quieras.", target:".vdTop", section:"dashboard" },
  { title:"Dashboard", body:"Este es tu centro de operaciones: rendimiento, impacto, cuentas y accesos rápidos.", target:".vdOverviewGrid", section:"dashboard" },
  { title:"Publicar", body:"Acá subís el video, escribís la descripción, elegís privacidad y preparás la distribución.", target:".vdUpload", section:"publish" },
  { title:"Cuentas", body:"Esta sección muestra y administra las cuentas que forman tu red de distribución.", target:".vdAccountList", section:"accounts" },
  { title:"Historial", body:"Acá revisás envíos, estados, publicaciones completadas y errores.", target:".vdMain .vdCard", section:"history" },
  { title:"Analytics", body:"Acá ves el impacto combinado, comparativas y rendimiento de todas tus cuentas.", target:".vdExampleMetrics", section:"analytics" },
  { title:"VYRAL Intelligence", body:"Debajo de Analytics aparece la capa inteligente: patrones, recomendaciones y próximas acciones según tu plan.", target:".premiumAnalytics", section:"analytics" },
  { title:"Automations", body:"Dentro de Publicar configurás comentario → respuesta → DM → oportunidad para Instagram y Facebook.", target:".vaCompact", section:"publish" },
  { title:"Listo", body:"Ya conocés el recorrido. Podés conectar una cuenta y crear tu primera publicación.", target:".vdConnect", section:"dashboard" }
];

const navIndex:Record<SectionKey,number>={dashboard:0,publish:1,accounts:2,history:3,analytics:4};

function openSection(section?:SectionKey){
  if(!section)return;
  const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>(".vdNav > button"));
  const button=buttons[navIndex[section]];
  if(button && !button.classList.contains("active")) button.click();
}

function findTarget(selector:string){
  const all=Array.from(document.querySelectorAll<HTMLElement>(selector));
  return all.find(el=>{
    const style=getComputedStyle(el);
    const r=el.getBoundingClientRect();
    return style.display!=="none" && style.visibility!=="hidden" && r.width>8 && r.height>8;
  }) || null;
}

export default function ProductTour(){
  const [open,setOpen]=useState(false);
  const [step,setStep]=useState(0);
  const [rect,setRect]=useState<DOMRect|null>(null);
  const current=steps[step];

  useEffect(()=>{
    try{ if(!localStorage.getItem("vyral-product-tour-v2")) window.setTimeout(()=>setOpen(true),900); }catch{}
  },[]);

  useEffect(()=>{
    if(!open)return;
    setRect(null);
    openSection(current.section);
    let attempts=0;
    let cancelled=false;
    const locate=()=>{
      if(cancelled)return;
      const el=findTarget(current.target);
      if(el){
        el.scrollIntoView({behavior:"smooth",block:"center",inline:"nearest"});
        window.setTimeout(()=>{if(!cancelled){const fresh=findTarget(current.target);setRect(fresh?.getBoundingClientRect()||null)}},420);
        return;
      }
      attempts++;
      if(attempts<16) window.setTimeout(locate,120);
    };
    const timer=window.setTimeout(locate,180);
    const update=()=>{const el=findTarget(current.target);if(el)setRect(el.getBoundingClientRect())};
    window.addEventListener("resize",update);
    window.addEventListener("scroll",update,true);
    return()=>{cancelled=true;window.clearTimeout(timer);window.removeEventListener("resize",update);window.removeEventListener("scroll",update,true)};
  },[open,step,current]);

  const progress=useMemo(()=>Math.round(((step+1)/steps.length)*100),[step]);
  const cardStyle=useMemo(()=>{
    if(!rect)return undefined;
    const wide=window.innerWidth>760;
    if(!wide)return undefined;
    const cardW=390,gap=22;
    const canRight=rect.right+gap+cardW<window.innerWidth;
    const left=canRight?rect.right+gap:Math.max(22,rect.left-cardW-gap);
    const top=Math.min(window.innerHeight-300,Math.max(22,rect.top+rect.height/2-135));
    return {left,top,right:"auto",bottom:"auto"} as React.CSSProperties;
  },[rect]);

  function finish(){ try{localStorage.setItem("vyral-product-tour-v2","done")}catch{} setOpen(false); }
  function next(){ if(step===steps.length-1) finish(); else setStep(s=>s+1); }
  if(!open) return <button className="vyralTourReplay" onClick={()=>{setStep(0);setOpen(true)}} aria-label="Volver a ver guía">?</button>;

  return <div className="vyralTourLayer" role="dialog" aria-label="Guía de VYRAL">
    {rect && <div className="vyralTourFocus" style={{left:rect.left-10,top:rect.top-10,width:rect.width+20,height:rect.height+20}}/>}
    <div className="vyralTourCard" style={cardStyle}>
      <div className="vyralTourTop"><span>VYRAL START</span><button onClick={finish}>Omitir</button></div>
      <div className="vyralTourProgress"><i style={{width:`${progress}%`}}/></div>
      <small>{String(step+1).padStart(2,"0")} / {String(steps.length).padStart(2,"0")}</small>
      <h3>{current.title}</h3><p>{current.body}</p>
      {!rect&&<div className="vyralTourLocating"><i/> Localizando sección…</div>}
      <div className="vyralTourActions"><button disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))}>Atrás</button><button className="primary" onClick={next}>{step===steps.length-1?"Empezar":"Siguiente"} ↗</button></div>
    </div>
  </div>;
}
