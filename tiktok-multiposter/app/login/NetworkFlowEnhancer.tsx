"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import ImpactDemoInjector from "./ImpactDemoInjector";
import "./network-flow-enhancer.css";
import "./register-transition.css";

export default function NetworkFlowEnhancer(){
  const router=useRouter();
  const [mount,setMount]=useState<HTMLElement|null>(null);
  const [tilt,setTilt]=useState({x:0,y:0});
  const [leaving,setLeaving]=useState(false);

  useEffect(()=>{
    setMount(document.querySelector(".vyralNetworkVisual") as HTMLElement|null);
    const onClick=(event:MouseEvent)=>{
      const target=event.target as HTMLElement|null;
      const link=target?.closest?.('a[href="/registro"]') as HTMLAnchorElement|null;
      if(!link||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||leaving)return;
      event.preventDefault();
      setLeaving(true);
      window.setTimeout(()=>router.push("/registro"),1800);
    };
    document.addEventListener("click",onClick);
    return()=>document.removeEventListener("click",onClick);
  },[router,leaving]);

  const flow=mount?createPortal(<div className="vnFlow" onPointerMove={(e)=>{const r=e.currentTarget.getBoundingClientRect();setTilt({x:((e.clientX-r.left)/r.width-.5)*8,y:((e.clientY-r.top)/r.height-.5)*6})}} onPointerLeave={()=>setTilt({x:0,y:0})} style={{"--mx":`${tilt.x}px`,"--my":`${tilt.y}px`} as React.CSSProperties}>
    <div className="vnAura"/>
    <div className="vnPulseRing one"/><div className="vnPulseRing two"/>
    <div className="vnStatus"><i/> RED MULTICUENTA · SINCRONIZADA</div>
  </div>,mount):null;

  return <>{flow}<ImpactDemoInjector/>{leaving&&<div className="vyralRouteTransition" aria-live="polite"><div className="vrtGrid"/><div className="vrtBeam"/><div className="vrtCore"><div className="vrtMark">V<span>Y</span>RAL</div><div className="vrtLine"><i/><b>CREANDO TU ESPACIO</b><i/></div><p>Preparando tu cuenta.</p></div></div>}</>;
}
