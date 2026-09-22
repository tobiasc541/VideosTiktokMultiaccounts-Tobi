"use client";

import { useEffect, useMemo, useState } from "react";
import "./publication-history.css";

type Target={platform:string;accountId:string;name?:string};
type Pub={id:string;scheduled_at:string;timezone:string;caption:string;privacy_level?:string|null;platforms:string[];targets:Target[];status:string;last_error?:string|null;platform_results?:Record<string,unknown>;created_at:string;preview_url?:string|null;file_name?:string|null;mime_type?:string|null};

const labels:Record<string,string>={scheduled:"Programado",processing:"Publicando",published:"Publicado",partial:"Parcial",failed:"Error",cancelled:"Cancelado",awaiting_api:"Esperando API"};
const privacy:Record<string,string>={PUBLIC_TO_EVERYONE:"Público",MUTUAL_FOLLOW_FRIENDS:"Amigos",FOLLOWER_OF_CREATOR:"Seguidores",SELF_ONLY:"Solo yo"};

export default function PublicationHistory(){
 const [items,setItems]=useState<Pub[]>([]); const [loading,setLoading]=useState(false); const [filter,setFilter]=useState("all"); const [active,setActive]=useState(false);
 async function load(){try{const r=await fetch("/api/scheduled-publications",{cache:"no-store"});const j=await r.json();if(r.ok)setItems(j.publications||[])}finally{setLoading(false)}}
 useEffect(()=>{const section=(e:Event)=>{const isHistory=String((e as CustomEvent).detail?.section||"")==="history";setActive(isHistory);if(isHistory)load()};const published=()=>{if(active)load()};window.addEventListener("vyral:section-change",section);window.addEventListener("vyral:publication-created",published);return()=>{window.removeEventListener("vyral:section-change",section);window.removeEventListener("vyral:publication-created",published)}},[active]);
 useEffect(()=>{if(!active)return;const timer=setInterval(load,120000);return()=>clearInterval(timer)},[active]);
 const shown=useMemo(()=>filter==="all"?items:items.filter(x=>x.status===filter),[items,filter]);
 return <section className="vyralHistory">
  <div className="vhHead"><div><small>REGISTRO VYRAL</small><h2>Historial de publicaciones</h2><p>Tu actividad queda guardada aunque cierres sesión o salgas de VYRAL.</p></div><button onClick={load}>Actualizar ↻</button></div>
  <div className="vhFilters">{[["all","Todas"],["scheduled","Programadas"],["processing","En proceso"],["published","Publicadas"],["failed","Errores"]].map(([v,t])=><button key={v} className={filter===v?"active":""} onClick={()=>setFilter(v)}>{t}</button>)}</div>
  {loading?<div className="vhEmpty">Cargando historial…</div>:!shown.length?<div className="vhEmpty">Todavía no hay publicaciones en esta vista.</div>:<div className="vhGrid">{shown.map(x=><article className="vhCard" key={x.id}>
   <div className="vhPreview">{x.preview_url?(String(x.mime_type||"").startsWith("image/")?<img src={x.preview_url} alt={x.file_name||"Carrusel"}/>:<video src={x.preview_url} muted playsInline preload="none"/>):<div><span>▶</span><small>{x.file_name||"VIDEO VYRAL"}</small></div>}<b className={`vhStatus ${x.status}`}>{labels[x.status]||x.status}</b></div>
   <div className="vhBody"><div className="vhMeta"><span>{new Intl.DateTimeFormat("es-AR",{dateStyle:"medium",timeStyle:"short"}).format(new Date(x.scheduled_at))}</span><span>{privacy[x.privacy_level||""]||x.privacy_level||"—"}</span></div><h3>{x.caption||"Sin descripción"}</h3><div className="vhTargets">{(x.targets||[]).map((t,i)=><span key={`${t.accountId}-${i}`}>{t.platform.toUpperCase()} · {t.name||"Cuenta"}</span>)}</div>{x.last_error&&<p className="vhError">{x.last_error}</p>}</div>
  </article>)}</div>}
 </section>;
}
