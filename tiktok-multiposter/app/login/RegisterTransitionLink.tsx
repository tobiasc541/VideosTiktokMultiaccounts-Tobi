"use client";
import {useRouter} from "next/navigation";
import {MouseEvent,useState} from "react";
import "./register-transition.css";

export default function RegisterTransitionLink({className=""}:{className?:string}){
 const router=useRouter(); const[leaving,setLeaving]=useState(false);
 const go=(e:MouseEvent<HTMLAnchorElement>)=>{e.preventDefault();if(leaving)return;setLeaving(true);setTimeout(()=>router.push("/registro"),760)};
 return <><a href="/registro" className={className} onClick={go}>Registrate en VYRAL →</a>{leaving&&<div className="vyralRouteTransition" aria-live="polite"><div className="vrtGrid"/><div className="vrtBeam"/><div className="vrtCore"><div className="vrtMark">V<span>Y</span>RAL</div><div className="vrtLine"><i/><b>CREANDO TU ESPACIO</b><i/></div><p>Preparando el siguiente paso.</p></div></div>}</>;
}
