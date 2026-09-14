"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./network-flow-enhancer.css";

export default function NetworkFlowEnhancer(){
  const [mount,setMount]=useState<HTMLElement|null>(null);
  const [tilt,setTilt]=useState({x:0,y:0});
  useEffect(()=>{setMount(document.querySelector(".vyralNetworkVisual") as HTMLElement|null)},[]);
  if(!mount)return null;
  const move=(e:React.PointerEvent<HTMLDivElement>)=>{
    const r=e.currentTarget.getBoundingClientRect();
    setTilt({x:((e.clientX-r.left)/r.width-.5)*10,y:((e.clientY-r.top)/r.height-.5)*8});
  };
  return createPortal(<div className="vnFlow" onPointerMove={move} onPointerLeave={()=>setTilt({x:0,y:0})} style={{"--mx":`${tilt.x}px`,"--my":`${tilt.y}px`} as React.CSSProperties}>
    <div className="vnMesh"/>
    <div className="vnRail r1"><i/><i/><i/><span>TIKTOK</span></div>
    <div className="vnRail r2"><i/><i/><i/><span>INSTAGRAM</span></div>
    <div className="vnRail r3"><i/><i/><i/><span>FACEBOOK</span></div>
    <div className="vnRail r4"><i/><i/><i/><span>TIKTOK</span></div>
    <div className="vnPacket p1"><b>01</b><small>VIDEO</small></div>
    <div className="vnPacket p2"><b>DM</b><small>AUTO</small></div>
    <div className="vnPacket p3"><b>AI</b><small>DATA</small></div>
    <div className="vnStatus"><i/> DISTRIBUTION BUS · LIVE</div>
  </div>,mount);
}
