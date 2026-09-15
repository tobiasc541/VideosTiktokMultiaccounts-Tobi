"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import ImpactDemoInjector from "./ImpactDemoInjector";
import "./network-flow-enhancer.css";

export default function NetworkFlowEnhancer(){
  const [mount,setMount]=useState<HTMLElement|null>(null);
  const [tilt,setTilt]=useState({x:0,y:0});
  useEffect(()=>{setMount(document.querySelector(".vyralNetworkVisual") as HTMLElement|null)},[]);
  const flow=mount?createPortal(<div className="vnFlow" onPointerMove={(e)=>{const r=e.currentTarget.getBoundingClientRect();setTilt({x:((e.clientX-r.left)/r.width-.5)*8,y:((e.clientY-r.top)/r.height-.5)*6})}} onPointerLeave={()=>setTilt({x:0,y:0})} style={{"--mx":`${tilt.x}px`,"--my":`${tilt.y}px`} as React.CSSProperties}>
    <div className="vnAura"/>
    <div className="vnPulseRing one"/><div className="vnPulseRing two"/>
    <div className="vnStatus"><i/> MULTI-DESTINO · SINCRONIZADO</div>
  </div>,mount):null;
  return <>{flow}<ImpactDemoInjector/></>;
}
