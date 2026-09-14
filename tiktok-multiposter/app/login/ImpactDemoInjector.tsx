"use client";
import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import ImpactDemo from "./ImpactDemo";

export default function ImpactDemoInjector(){
 const[mount,setMount]=useState<HTMLElement|null>(null);
 useEffect(()=>{
   const el=document.querySelector(".vyralProofSection") as HTMLElement|null;
   if(!el)return;
   el.classList.add("vyralProofReplaced");
   Array.from(el.children).forEach((child)=>{(child as HTMLElement).style.display="none"});
   const host=document.createElement("div");host.className="vyralImpactDemoHost";el.appendChild(host);setMount(host);
   return()=>{host.remove();el.classList.remove("vyralProofReplaced");Array.from(el.children).forEach((child)=>{(child as HTMLElement).style.display=""})};
 },[]);
 if(!mount)return null;
 return createPortal(<ImpactDemo/>,mount);
}
