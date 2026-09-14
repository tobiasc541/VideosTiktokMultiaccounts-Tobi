"use client";

import { useEffect, useMemo, useState } from "react";
import "./product-tour.css";

type Step = { title:string; body:string; target:string; navLabel?:string };

const steps:Step[] = [
  { title:"Bienvenido a VYRAL", body:"Te mostramos el sistema en menos de un minuto. Podés omitirlo cuando quieras.", target:".vdTop" },
  { title:"Dashboard", body:"Acá ves el estado general de tu operación, cuentas, rendimiento y accesos rápidos.", target:".vdMetrics", navLabel:"Inicio" },
  { title:"Publicar", body:"Subí un video, elegí tus cuentas, configurá la publicación y activá automatizaciones desde el mismo flujo.", target:".vdUpload", navLabel:"Publicar" },
  { title:"Cuentas", body:"Conectá y administrá las cuentas que forman tu red de distribución.", target:".vdAccountList", navLabel:"Cuentas" },
  { title:"Historial", body:"Revisá publicaciones procesadas, estados y errores sin perder el contexto.", target:".vdResults", navLabel:"Historial" },
  { title:"Analytics", body:"Entendé el impacto combinado de tu red y compará rendimiento sin saltar entre plataformas.", target:".vdExampleMetrics", navLabel:"Analytics" },
  { title:"VYRAL Intelligence", body:"En los planes compatibles, VYRAL transforma métricas en recomendaciones, patrones y próximas acciones.", target:".dashboardPostFlow" },
  { title:"Automations", body:"Convertí comentarios en conversaciones, DMs y oportunidades. Instagram y Facebook quedan listos para conectar con sus APIs.", target:".vaCompact", navLabel:"Publicar" },
  { title:"Listo", body:"Ya conocés lo esencial. Ahora podés empezar por conectar una cuenta o crear tu primera publicación.", target:".vdConnect", navLabel:"Inicio" }
];

function findNav(label:string){
  const nodes = Array.from(document.querySelectorAll<HTMLElement>("button,a"));
  return nodes.find((el)=>el.textContent?.trim().toLowerCase().includes(label.toLowerCase()));
}

export default function ProductTour(){
  const [open,setOpen]=useState(false);
  const [step,setStep]=useState(0);
  const [rect,setRect]=useState<DOMRect|null>(null);
  const current=steps[step];

  useEffect(()=>{
    try{ if(!localStorage.getItem("vyral-product-tour-v1")) window.setTimeout(()=>setOpen(true),900); }catch{}
  },[]);

  useEffect(()=>{
    if(!open) return;
    if(current.navLabel){
      const nav=findNav(current.navLabel);
      if(nav && !nav.classList.contains("active")) nav.click();
    }
    const timer=window.setTimeout(()=>{
      const el=document.querySelector(current.target) as HTMLElement|null;
      if(el){ el.scrollIntoView({behavior:"smooth",block:"center"}); window.setTimeout(()=>setRect(el.getBoundingClientRect()),280); }
      else setRect(null);
    },120);
    const update=()=>{ const el=document.querySelector(current.target) as HTMLElement|null; setRect(el?.getBoundingClientRect()||null); };
    window.addEventListener("resize",update); window.addEventListener("scroll",update,true);
    return()=>{window.clearTimeout(timer);window.removeEventListener("resize",update);window.removeEventListener("scroll",update,true)};
  },[open,step,current]);

  const progress=useMemo(()=>Math.round(((step+1)/steps.length)*100),[step]);
  function finish(){ try{localStorage.setItem("vyral-product-tour-v1","done")}catch{} setOpen(false); }
  function next(){ if(step===steps.length-1) finish(); else setStep(s=>s+1); }
  if(!open) return <button className="vyralTourReplay" onClick={()=>{setStep(0);setOpen(true)}}>?</button>;

  return <div className="vyralTourLayer" role="dialog" aria-label="Guía de VYRAL">
    {rect && <div className="vyralTourFocus" style={{left:rect.left-8,top:rect.top-8,width:rect.width+16,height:rect.height+16}}/>}
    <div className="vyralTourCard">
      <div className="vyralTourTop"><span>VYRAL START</span><button onClick={finish}>Omitir</button></div>
      <div className="vyralTourProgress"><i style={{width:`${progress}%`}}/></div>
      <small>{String(step+1).padStart(2,"0")} / {String(steps.length).padStart(2,"0")}</small>
      <h3>{current.title}</h3><p>{current.body}</p>
      <div className="vyralTourActions"><button disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))}>Atrás</button><button className="primary" onClick={next}>{step===steps.length-1?"Empezar":"Siguiente"} ↗</button></div>
    </div>
  </div>;
}
