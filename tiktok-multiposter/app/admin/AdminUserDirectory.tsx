"use client";

import { useMemo, useState } from "react";

type AdminUser = {
  id:string; name:string; email:string; verified:boolean; plan:string; lastSignIn:string; creatorCode:string;
};

function planLabel(plan:string){return plan==="inicio"?"Inicio":plan==="pro"?"Crecimiento":plan==="escala"?"Escala":"Sin plan";}

export default function AdminUserDirectory({users}:{users:AdminUser[]}){
  const [query,setQuery]=useState("");
  const [plan,setPlan]=useState("all");
  const filtered=useMemo(()=>{
    const q=query.trim().toLowerCase();
    return users.filter(u=>(!q||u.name.toLowerCase().includes(q)||u.email.toLowerCase().includes(q)||u.creatorCode.toLowerCase().includes(q))&&(plan==="all"||u.plan===plan));
  },[users,query,plan]);
  return <>
    <div className="adminDirectoryFilters">
      <div className="adminSearchBox"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nombre, mail o código promocional…"/></div>
      <select value={plan} onChange={e=>setPlan(e.target.value)}><option value="all">Todos los planes</option><option value="inicio">Inicio</option><option value="pro">Crecimiento</option><option value="escala">Escala</option><option value="">Sin plan</option></select>
      <div className="adminFilterCount">{filtered.length} resultados</div>
    </div>
    <div className="adminUserTable"><div className="adminUserHead"><span>Usuario</span><span>Estado</span><span>Plan</span><span>Último acceso</span><span>Acciones</span></div>
      {filtered.map(u=><div className="adminUserRow" key={u.id}>
        <div><strong>{u.name||"Sin nombre"}</strong><small>{u.email}{u.creatorCode?` · ${u.creatorCode}`:""}</small></div>
        <span className={u.verified?"ok":"warn"}>{u.verified?"Verificado":"Sin verificar"}</span>
        <strong>{planLabel(u.plan)}</strong>
        <small>{u.lastSignIn?new Date(u.lastSignIn).toLocaleString("es-AR"):"Nunca"}</small>
        <div className="adminUserActions"><form action="/api/admin/user-plan" method="post"><input type="hidden" name="userId" value={u.id}/><select name="plan" defaultValue={u.plan||""}><option value="">Sin plan</option><option value="inicio">Inicio</option><option value="pro">Crecimiento</option><option value="escala">Escala</option></select><button>Guardar</button></form><form action="/api/admin/send-reset" method="post"><input type="hidden" name="email" value={u.email}/><button className="secondary">Enviar reset</button></form></div>
      </div>)}
      {!filtered.length&&<div className="adminEmpty">No encontramos usuarios con esos filtros.</div>}
    </div>
  </>;
}
