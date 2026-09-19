"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import "./meta-instagram-accounts.css";

type IG={id:string;instagram_user_id:string;username:string|null;display_name:string|null;account_type:string|null};
export default function MetaInstagramAccounts(){
 const[mount,setMount]=useState<HTMLElement|null>(null),[accounts,setAccounts]=useState<IG[]>([]),[loading,setLoading]=useState(true);
 async function load(){setLoading(true);try{const r=await fetch("/api/meta/instagram/accounts",{cache:"no-store"}),j=await r.json();if(r.ok)setAccounts(j.accounts||[])}finally{setLoading(false)}}
 useEffect(()=>{load();const timer=setInterval(()=>{const main=document.querySelector(".vdMain");const title=main?.querySelector(".vdSectionTitle")?.textContent||"";if(main&&title.includes("Tus cuentas conectadas")){let el=main.querySelector(".vyralMetaAccountsMount") as HTMLElement|null;if(!el){el=document.createElement("div");el.className="vyralMetaAccountsMount";main.appendChild(el)}setMount(el)}else setMount(null)},300);return()=>clearInterval(timer)},[]);
 async function remove(id:string){if(!confirm("¿Desconectar esta cuenta de Instagram de VYRAL?"))return;const r=await fetch("/api/meta/instagram/accounts?id="+encodeURIComponent(id),{method:"DELETE"});if(r.ok)setAccounts(x=>x.filter(a=>a.id!==id))}
 if(!mount)return null;
 return createPortal(<section className="vmiWrap"><div className="vmiHead"><div><small>INSTAGRAM</small><h2>Cuentas de Instagram</h2><p>Conectadas mediante autorización oficial de Instagram.</p></div><a className="vmiConnect" href="/api/meta/instagram/connect">+ Conectar Instagram</a></div><div className="vmiGrid">{loading?<div className="vmiEmpty">Cargando cuentas…</div>:accounts.length?accounts.map(a=><article className="vmiAccount" key={a.id}><div className="vmiIcon">◎</div><div><strong>@{a.username||a.instagram_user_id}</strong><span>{a.display_name||"Cuenta profesional"}</span><small>{a.account_type==="MEDIA_CREATOR"?"CREADOR":"INSTAGRAM PROFESSIONAL"} · CONECTADA</small></div><button onClick={()=>remove(a.id)} aria-label="Desconectar">×</button></article>):<div className="vmiEmpty">Todavía no conectaste Instagram. <a href="/api/meta/instagram/connect">Conectar ahora ↗</a></div>}</div></section>,mount)
}