"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import "./publish-schedule.css";

type Mode = "now" | "schedule";

type LocaleDetail = { country:"AR"|"US"; lang:"es"|"en" };

export default function PublishScheduleControls(){
  const [mount,setMount]=useState<HTMLElement|null>(null);
  const [mode,setMode]=useState<Mode>("now");
  const [dateTime,setDateTime]=useState("");
  const [country,setCountry]=useState<"AR"|"US">("AR");

  useEffect(()=>{
    try{
      const savedMode=(localStorage.getItem("vyral-publish-mode") as Mode)||"now";
      const savedDate=localStorage.getItem("vyral-scheduled-at")||"";
      const savedCountry=(localStorage.getItem("vyral-country") as "AR"|"US")||"AR";
      setMode(savedMode);setDateTime(savedDate);setCountry(savedCountry);
    }catch{}
    const timer=window.setInterval(()=>{
      const btn=document.querySelector(".vdPublishBtn") as HTMLElement|null;
      const card=btn?.closest(".vdCard") as HTMLElement|null;
      if(btn&&card){
        let slot=card.querySelector(".vyralScheduleMount") as HTMLElement|null;
        if(!slot){slot=document.createElement("div");slot.className="vyralScheduleMount";card.insertBefore(slot,btn);}
        if(slot!==mount)setMount(slot);
      }
    },450);
    const onLocale=(e:Event)=>setCountry((e as CustomEvent<LocaleDetail>).detail.country);
    window.addEventListener("vyral:locale",onLocale as EventListener);
    return()=>{window.clearInterval(timer);window.removeEventListener("vyral:locale",onLocale as EventListener)};
  },[mount]);

  function save(nextMode:Mode,nextDate=dateTime){
    setMode(nextMode);setDateTime(nextDate);
    try{localStorage.setItem("vyral-publish-mode",nextMode);localStorage.setItem("vyral-scheduled-at",nextDate)}catch{}
  }

  if(!mount)return null;
  const tz=country==="US"?"America/New_York":"America/Argentina/Buenos_Aires";
  const min=new Date(Date.now()+5*60*1000); min.setMinutes(min.getMinutes()-min.getTimezoneOffset());

  return createPortal(<section className="vyralSchedulePanel">
    <div className="vyralScheduleHead"><div><small>PUBLICACIÓN</small><strong>¿Cuándo querés publicarlo?</strong></div><span>{country==="US"?"US · ET":"AR · GMT-3"}</span></div>
    <div className="vyralScheduleModes"><button type="button" className={mode==="now"?"active":""} onClick={()=>save("now","")}><b>Ahora</b><small>Publicar inmediatamente</small></button><button type="button" className={mode==="schedule"?"active":""} onClick={()=>save("schedule")}><b>Programar</b><small>Elegir fecha y hora</small></button></div>
    {mode==="schedule"&&<div className="vyralScheduleDate"><label>Fecha y hora</label><input type="datetime-local" min={min.toISOString().slice(0,16)} value={dateTime} onChange={e=>save("schedule",e.target.value)}/><p>Zona horaria: <b>{tz}</b>. La interfaz ya guarda tu programación; el envío diferido real se activará cuando conectemos almacenamiento + APIs.</p></div>}
  </section>,mount);
}
