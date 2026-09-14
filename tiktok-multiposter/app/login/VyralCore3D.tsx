"use client";

import { useEffect, useRef, useState } from "react";
import "./vyral-core-3d.css";

type Props = { size?: "hero" | "medium" | "small"; className?: string; label?: boolean };

export default function VyralCore3D({ size="medium", className="", label=true }: Props){
  const [rot,setRot]=useState({x:-18,y:28});
  const [dragging,setDragging]=useState(false);
  const drag=useRef({x:0,y:0,rx:0,ry:0});
  const frame=useRef<number|null>(null);
  const rotRef=useRef(rot);
  const draggingRef=useRef(false);

  useEffect(()=>{rotRef.current=rot},[rot]);
  useEffect(()=>{draggingRef.current=dragging},[dragging]);
  useEffect(()=>{
    let last=performance.now();
    const tick=(now:number)=>{
      const dt=Math.min(40,now-last); last=now;
      if(!draggingRef.current){
        setRot(r=>({x:r.x + dt*.004,y:r.y + dt*.012}));
      }
      frame.current=requestAnimationFrame(tick);
    };
    frame.current=requestAnimationFrame(tick);
    return()=>{if(frame.current)cancelAnimationFrame(frame.current)};
  },[]);

  function down(e:React.PointerEvent<HTMLDivElement>){
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current={x:e.clientX,y:e.clientY,rx:rotRef.current.x,ry:rotRef.current.y};
    setDragging(true);
  }
  function move(e:React.PointerEvent<HTMLDivElement>){
    if(!draggingRef.current)return;
    const dx=e.clientX-drag.current.x,dy=e.clientY-drag.current.y;
    setRot({x:drag.current.rx-dy*.34,y:drag.current.ry+dx*.42});
  }
  function up(){setDragging(false)}

  const face=(name:string)=><div className={`v3Face ${name}`}>
    {Array.from({length:9}).map((_,i)=><i key={i} className={i===0||i===4||i===8?"v3Accent":""}/>) }
    <span className="v3V">V</span>
  </div>;

  return <div className={`v3Wrap v3-${size} ${className}`} aria-label="VYRAL interactive 3D core">
    <div className="v3Halo"/><div className="v3Orbit o1"/><div className="v3Orbit o2"/>
    <div className={`v3Stage ${dragging?"isDragging":""}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <div className="v3Cube" style={{transform:`rotateX(${rot.x}deg) rotateY(${rot.y}deg)`}}>
        {face("front")}{face("back")}{face("right")}{face("left")}{face("top")}{face("bottom")}
        <div className="v3Core">V</div>
      </div>
    </div>
    {label&&<div className="v3Label"><span>VYRAL CORE</span><b>DRAG TO EXPLORE</b></div>}
  </div>;
}
