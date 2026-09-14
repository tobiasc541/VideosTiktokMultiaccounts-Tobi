"use client";

import { useEffect, useState } from "react";

type Item={userId:string;name:string;email:string;from:string;to:string;remainingDays:number;equivalentDays:number;requestedAt:string;demoCycle:boolean;providerConnected:boolean};
const label=(v:string)=>v==="inicio"?"Inicio":v==="pro"?"Crecimiento":v==="escala"?"Escala":v;

export default function AdminUpgradeRequests(){
 const [items,setItems]=useState<Item[]>([]);const [loading,setLoading]=useState(true);
 async function load(){try{const r=await fetch("/api/admin/upgrade-requests",{cache:"no-store"});const j=await r.json();setItems(Array.isArray(j.items)?j.items:[]);}finally{setLoading(false)}}
 useEffect(()=>{load();const id=setInterval(load,5000);return()=>clearInterval(id)},[]);
 return <section className="adminUpgradeRequests" id="upgrades"><div className="adminSectionHead"><div><small>UPGRADES · VALOR PROPORCIONAL</small><h2>Solicitudes de cambio de saldo</h2></div><span>{items.length} pendientes</span></div>{loading?<div className="adminEmpty">Cargando solicitudes…</div>:!items.length?<div className="adminEmpty adminEmptySuccess">No hay solicitudes de cambio de saldo pendientes.</div>:<div className="adminCancelGrid">{items.map(x=><article className="adminCancelCard" key={x.userId}><div className="adminCancelTop"><div><span className="adminCancelAlert">UPGRADE SOLICITADO</span><h3>{x.name}</h3><p>{x.email}</p></div><strong>{label(x.from)} → {label(x.to)}</strong></div><div className="adminCancelMeta"><div><small>SALDO ACTUAL</small><b>{x.remainingDays} días en {label(x.from)}</b></div><div><small>EQUIVALENCIA</small><b>{x.equivalentDays} días en {label(x.to)}</b></div></div><div className="adminCancelNote">{x.providerConnected?"La suscripción está identificada en el proveedor. Al aprobar, VYRAL intentará cancelar la renovación antes de asignar el período manual.":x.demoCycle?"Este usuario está en ciclo demo/sin fecha sincronizada. La equivalencia usa 30 días como referencia y el nuevo período quedará administrado manualmente.":"No hay ID del proveedor guardado. El cambio se aplicará manualmente dentro de VYRAL."}</div><form action="/api/admin/upgrade-decision" method="post" className="adminCancelActions"><input type="hidden" name="userId" value={x.userId}/><button name="decision" value="approve">✓ Aprobar cambio</button><button className="ghost" name="decision" value="reject">Rechazar</button></form></article>)}</div>}</section>
}
