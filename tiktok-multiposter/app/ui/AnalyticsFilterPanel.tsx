"use client";

import { useEffect,useState } from "react";

export default function AnalyticsFilterPanel(){
 const [visible,setVisible]=useState(false);const [network,setNetwork]=useState("all");const [period,setPeriod]=useState("30d");const [from,setFrom]=useState("");const [to,setTo]=useState("");
 useEffect(()=>{const sync=()=>{const a=document.querySelector(".vdNav button.active");setVisible((a?.textContent||"").toLowerCase().includes("analytics"));};sync();const nav=document.querySelector(".vdNav");const obs=new MutationObserver(sync);if(nav)obs.observe(nav,{attributes:true,subtree:true,attributeFilter:["class"]});document.addEventListener("click",sync,true);return()=>{obs.disconnect();document.removeEventListener("click",sync,true)}},[]);
 useEffect(()=>{window.dispatchEvent(new CustomEvent("vyralAnalyticsFilter",{detail:{network,period,from,to}}));},[network,period,from,to]);
 if(!visible)return null;
 return <section className="userAnalyticsAddon compactOnly"><div className="userAnalyticsControls premiumFilters"><span className="analyticsFilterLabel">FILTRAR ANALYTICS</span><select value={network} onChange={e=>setNetwork(e.target.value)}><option value="all">Todas las redes</option><option value="tiktok">TikTok</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="youtube">YouTube</option></select><select value={period} onChange={e=>setPeriod(e.target.value)}><option value="7d">Últimos 7 días</option><option value="30d">Últimos 30 días</option><option value="90d">Últimos 90 días</option><option value="custom">Fecha a fecha</option></select>{period==="custom"&&<><input type="date" value={from} onChange={e=>setFrom(e.target.value)}/><input type="date" value={to} onChange={e=>setTo(e.target.value)}/></>}</div></section>;
}
