"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import "./notification-center.css";

type Notice = { id:string; icon:string; title:string; text:string; time:string; href?:string; action?:string; tone?:"good"|"info"|"warn" };

export default function NotificationCenter({ daysLeft, planId, accountCount=0 }: { daysLeft:number|null; planId:string; accountCount?:number }) {
  const [open,setOpen]=useState(false);
  const [seen,setSeen]=useState(false);
  useEffect(()=>{ try { setSeen(localStorage.getItem("vyral-notifications-seen")==="1"); } catch {} },[]);
  const notices=useMemo<Notice[]>(()=>{
    const list:Notice[]=[];
    if(daysLeft!==null && daysLeft<=3) list.push({id:"renew",icon:"◷",title:daysLeft<=1?"Tu plan vence mañana":"Tu plan vence pronto",text:`Quedan ${daysLeft} día${daysLeft===1?"":"s"} de acceso. Administrá tu suscripción para evitar interrupciones.`,time:"Cuenta",href:"/mi-plan",action:"Administrar plan",tone:"warn"});
    list.push({id:"ready",icon:"✓",title:"Tu espacio VYRAL está listo",text:accountCount?`${accountCount} cuenta${accountCount===1?"":"s"} conectada${accountCount===1?"":"s"}. Ya podés distribuir tu próximo contenido.`:"Conectá tu primera cuenta y prepará tu próxima publicación.",time:"Ahora",href:accountCount?"/#publicar":"/api/tiktok/connect",action:accountCount?"Nueva publicación":"Conectar cuenta",tone:"good"});
    list.push({id:"credits",icon:"◇",title:"Créditos mensuales activos",text:`Tu plan ${planId==="pro"?"Crecimiento":planId==="escala"?"Escala":"Inicio"} ya tiene disponible su capacidad mensual de publicaciones.`,time:"Este mes",href:"/mi-plan",action:"Ver mi plan",tone:"info"});
    if(planId!=="inicio") list.push({id:"analytics",icon:"↗",title:"Analytics preparado",text:"Cuando entren datos reales de tus redes, VYRAL va a concentrar el rendimiento de tus cuentas en una sola visión.",time:"VYRAL",tone:"info"});
    return list;
  },[daysLeft,planId,accountCount]);
  const unread=seen?0:notices.length;
  function toggle(){ const next=!open; setOpen(next); if(next){setSeen(true);try{localStorage.setItem("vyral-notifications-seen","1")}catch{}} }
  return <div className="vyralNotifyRoot">
    <button className="vyralNotifyBell" onClick={toggle} aria-label="Notificaciones" aria-expanded={open}><span>♢</span>{unread>0&&<b>{unread}</b>}</button>
    {open&&<><button className="vyralNotifyBackdrop" onClick={()=>setOpen(false)} aria-label="Cerrar"/><aside className="vyralNotifyPanel">
      <header><div><small>CENTRO VYRAL</small><h2>Notificaciones</h2></div><button onClick={()=>setOpen(false)}>×</button></header>
      <div className="vyralNotifyLive"><i/> TODO EN ORDEN <span>{notices.length} actualizaciones</span></div>
      <div className="vyralNotifyList">{notices.map(n=><article key={n.id} className={n.tone||"info"}><div className="vyralNotifyIcon">{n.icon}</div><div><div className="vyralNotifyMeta"><strong>{n.title}</strong><time>{n.time}</time></div><p>{n.text}</p>{n.href&&<Link href={n.href} onClick={()=>setOpen(false)}>{n.action} →</Link>}</div></article>)}</div>
      <footer><span>VYRAL SYSTEM</span><b>LIVE</b></footer>
    </aside></>}
  </div>;
}
