"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AutoRefresh({ everyMs = 30000 }: { everyMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const interval=Math.max(15000,everyMs);
    let id:number|undefined;
    const refresh=()=>{if(document.visibilityState==="visible")router.refresh()};
    const start=()=>{if(id===undefined)id=window.setInterval(refresh,interval)};
    const stop=()=>{if(id!==undefined){window.clearInterval(id);id=undefined}};
    const visibility=()=>document.visibilityState==="visible"?start():stop();
    start();document.addEventListener("visibilitychange",visibility);
    return()=>{stop();document.removeEventListener("visibilitychange",visibility)};
  },[router,everyMs]);
  return null;
}