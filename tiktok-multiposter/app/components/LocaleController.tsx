"use client";

import { useEffect, useRef, useState } from "react";
import "./locale-controller.css";

type Country = "AR" | "US";

const exact: Record<string,string> = {
  "Dashboard":"Dashboard","Publicar":"Publish","Cuentas":"Accounts","Historial":"History","Analytics":"Analytics",
  "Planes":"Plans","Preguntas frecuentes":"FAQ","Soporte 24/7":"24/7 Support","Cerrar sesión":"Log out",
  "Nueva publicación":"New post","Subí tu video":"Upload your video","Descripción":"Caption","Privacidad":"Privacy","Seleccioná cuentas":"Select accounts",
  "Tus cuentas conectadas":"Your connected accounts","Historial de publicaciones":"Publishing history","Todo tu rendimiento, en un solo lugar.":"All your performance, in one place.",
  "Centro de operaciones":"Operations center","Tu contenido. Multiplicado.":"Your content. Multiplied.","CENTRO DE OPERACIONES":"OPERATIONS CENTER",
  "Una vista rápida de tu operación. Entrá a cada módulo para trabajar en detalle.":"A quick view of your operation. Open each module to work in detail.",
  "+ Conectar TikTok":"+ Connect TikTok","Crear una nueva publicación":"Create a new post","Ir a Publicar ↗":"Go to Publish ↗","Ver Cuentas ↗":"View Accounts ↗","Ver Historial ↗":"View History ↗","Abrir Analytics ↗":"Open Analytics ↗",
  "Rendimiento":"Performance","Últimos 30 días":"Last 30 days","Vistas":"Views","Seguidores":"Followers","Compartidos":"Shares","Distribución multicuentas":"Multi-account distribution",
  "Mejor cuenta individual":"Best individual account","Vistas adicionales":"Additional views","Multiplicador":"Multiplier",
  "Prepará un video y distribuílo en las cuentas que elijas.":"Prepare one video and distribute it to the accounts you choose.",
  "Administrá la red de cuentas conectadas a VYRAL.":"Manage the network of accounts connected to VYRAL.",
  "Envíos, estados y errores de tus publicaciones.":"Deliveries, statuses and errors from your posts.",
  "Crear mi cuenta":"Create my account","Ingresar a VYRAL":"Sign in to VYRAL","Registrate en VYRAL →":"Sign up for VYRAL →",
  "Bienvenido.":"Welcome.","Ingresá para continuar con tu operación.":"Sign in to continue.","Correo electrónico":"Email","Contraseña":"Password","¿Olvidaste tu contraseña?":"Forgot your password?","¿Todavía no tenés cuenta?":"Don't have an account yet?",
  "Publicá una vez.":"Publish once.","Llegá más lejos.":"Reach farther.","Multiplicá oportunidades.":"Multiply opportunities.",
  "Un solo flujo para llevar tu contenido a todas tus cuentas. Menos tareas repetitivas, más tiempo para crear, vender y hacer crecer tu negocio.":"One flow to distribute your content across all your accounts. Less repetitive work, more time to create, sell and grow.",
  "CREÁ":"CREATE","DISTRIBUÍ":"DISTRIBUTE","CRECÉ":"GROW","DESCUBRÍ VYRAL":"DISCOVER VYRAL","ACCESO A TU PANEL":"ACCESS YOUR DASHBOARD",
  "MULTICUENTA":"MULTI-ACCOUNT","UN SOLO FLUJO":"ONE FLOW","DISTRIBUCIÓN":"DISTRIBUTION","AUTOMATIONS":"AUTOMATIONS",
  "Menos cargas.":"Fewer uploads.","Más tiempo para crecer.":"More time to grow.","SIMULADOR DE DISTRIBUCIÓN":"DISTRIBUTION SAVINGS CALCULATOR",
  "Gasto mensual en IA":"Monthly AI spend","Gasto mensual en apps / software":"Monthly apps / software spend","Videos que publicás por mes":"Videos published per month","Cuentas promedio por video":"Average accounts per video","Costo por hora de tu equipo":"Team hourly cost",
  "PLAN RECOMENDADO AUTOMÁTICAMENTE":"AUTOMATICALLY RECOMMENDED PLAN","PUBLICANDO MANUALMENTE":"PUBLISHING MANUALLY","PUBLICANDO CON VYRAL":"PUBLISHING WITH VYRAL","CARGAS REPETITIVAS EVITADAS":"REPETITIVE UPLOADS AVOIDED","TIEMPO RECUPERABLE":"TIME RECOVERED","VALOR DEL TIEMPO RECUPERADO":"VALUE OF TIME RECOVERED","AHORRO POTENCIAL ESTIMADO":"ESTIMATED POTENTIAL SAVINGS","AHORRO POTENCIAL / AÑO":"POTENTIAL SAVINGS / YEAR",
  "Inicio":"Starter","Crecimiento":"Growth","Escala":"Scale","EJEMPLO":"EXAMPLE","DATOS DE EJEMPLO":"SAMPLE DATA",
  "VYRAL INTELLIGENCE":"VYRAL INTELLIGENCE","Vista estratégica":"Strategic view","Recomendaciones":"Recommendations","Predicción":"Forecast",
  "Cambiar a Escala ↗":"Upgrade to Scale ↗","Cambiar plan ↗":"Change plan ↗","Administrar plan ↗":"Manage plan ↗",
  "Omitir":"Skip","Atrás":"Back","Siguiente":"Next","Empezar":"Start","Bienvenido a VYRAL":"Welcome to VYRAL",
  "Automatizaciones":"Automations","Conectá":"Connect","Prepará":"Prepare","Distribuí":"Distribute","Medí":"Measure"
};

const originalText = new WeakMap<Text,string>();
const originalAttrs = new WeakMap<Element,Record<string,string>>();

function translatedText(value:string){
  const trimmed=value.trim();
  if(exact[trimmed]) return value.replace(trimmed,exact[trimmed]);
  let m=trimmed.match(/^Publicar en (\d+) cuenta(s?) ↗$/);
  if(m) return value.replace(trimmed,`Publish to ${m[1]} account${Number(m[1])===1?"":"s"} ↗`);
  m=trimmed.match(/^(\d+) cuentas conectadas$/);
  if(m) return value.replace(trimmed,`${m[1]} connected accounts`);
  return value;
}

function walk(root:Node,lang:"es"|"en"){
  const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  let node=walker.nextNode() as Text|null;
  while(node){
    if(node.parentElement && !["SCRIPT","STYLE"].includes(node.parentElement.tagName)){
      if(!originalText.has(node)) originalText.set(node,node.nodeValue||"");
      const source=originalText.get(node)||"";
      node.nodeValue=lang==="en"?translatedText(source):source;
    }
    node=walker.nextNode() as Text|null;
  }
  if(root instanceof Element || root instanceof Document){
    const els=(root instanceof Element?[root,...Array.from(root.querySelectorAll("input,textarea,[aria-label]"))]:Array.from(document.querySelectorAll("input,textarea,[aria-label]"))) as Element[];
    for(const el of els){
      if(!originalAttrs.has(el)) originalAttrs.set(el,{placeholder:el.getAttribute("placeholder")||"",aria:el.getAttribute("aria-label")||""});
      const orig=originalAttrs.get(el)!;
      if(orig.placeholder) el.setAttribute("placeholder",lang==="en"?translatedText(orig.placeholder):orig.placeholder);
      if(orig.aria) el.setAttribute("aria-label",lang==="en"?translatedText(orig.aria):orig.aria);
    }
  }
}

export default function LocaleController(){
  const [open,setOpen]=useState(false);
  const [country,setCountry]=useState<Country>("AR");
  const observer=useRef<MutationObserver|null>(null);

  function apply(next:Country){
    const lang=next==="US"?"en":"es";
    setCountry(next);
    try{localStorage.setItem("vyral-country",next);localStorage.setItem("vyral-lang",lang)}catch{}
    document.documentElement.lang=lang;
    walk(document,lang);
    window.dispatchEvent(new CustomEvent("vyral:locale",{detail:{country:next,lang}}));
  }

  useEffect(()=>{
    let saved:Country="AR";
    try{saved=(localStorage.getItem("vyral-country") as Country)||"AR"}catch{}
    apply(saved);
    observer.current=new MutationObserver(records=>{
      const lang=(localStorage.getItem("vyral-lang")||"es") as "es"|"en";
      for(const rec of records) rec.addedNodes.forEach(n=>walk(n,lang));
    });
    observer.current.observe(document.body,{childList:true,subtree:true});
    return()=>observer.current?.disconnect();
  },[]);

  return <div className="vyralLocaleDock">
    <button type="button" className="vyralLocaleTrigger" onClick={()=>setOpen(!open)} aria-label="Cambiar país e idioma"><span>{country==="US"?"US":"AR"}</span><b>◎</b></button>
    {open&&<div className="vyralLocalePanel">
      <small>PAÍS / LANGUAGE</small><strong>{country==="US"?"United States":"Argentina"}</strong>
      <p>{country==="US"?"VYRAL is displayed in English.":"VYRAL se muestra en español."}</p>
      <div><button className={country==="AR"?"active":""} onClick={()=>{apply("AR");setOpen(false)}}><span>AR</span>Argentina<small>Español</small></button><button className={country==="US"?"active":""} onClick={()=>{apply("US");setOpen(false)}}><span>US</span>United States<small>English</small></button></div>
    </div>}
  </div>;
}
