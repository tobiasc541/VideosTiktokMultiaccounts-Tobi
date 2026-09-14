"use client";

import { useEffect, useRef } from "react";

type Lang="es"|"en"|"pt"|"ar"|"fr"|"de"|"it"|"nl"|"ja";

type Rule={from:RegExp,to:(m:RegExpMatchArray)=>string};

const rules:Record<"en"|"pt"|"ar",Rule[]>={
 en:[
  {from:/(\d[\d.,]*) vistas combinadas/gi,to:m=>`${m[1]} combined views`},
  {from:/(\d[\d.,]*) vistas/gi,to:m=>`${m[1]} views`},
  {from:/(\d[\d.,]*) cuentas conectadas/gi,to:m=>`${m[1]} connected accounts`},
  {from:/(\d[\d.,]*) actividades recientes/gi,to:m=>`${m[1]} recent activities`},
  {from:/Publicar en (\d+) cuentas?/gi,to:m=>`Publish to ${m[1]} ${Number(m[1])===1?"account":"accounts"}`},
  {from:/Tu cambio a ([^.]+) fue aprobado\. Tenés acceso hasta el ([^.]+)\. Después deberás renovar tu suscripción para seguir usando VYRAL\./gi,to:m=>`Your switch to ${m[1]} was approved. You have access until ${m[2]}. After that, renew your subscription to keep using VYRAL.`},
  {from:/Tu solicitud fue aprobada\. Tu plan terminará el ([^.]+)\. Hasta ese día podés seguir usando VYRAL normalmente\./gi,to:m=>`Your request was approved. Your plan will end on ${m[1]}. Until then, you can keep using VYRAL normally.`},
  {from:/Tu acceso vence mañana\. Podés renovar ahora para evitar que VYRAL se bloquee al finalizar el período\./gi,to:()=>`Your access expires tomorrow. Renew now to avoid interruption when the period ends.`},
  {from:/Tu período terminó\. Elegí un plan para volver a activar VYRAL\./gi,to:()=>`Your period ended. Choose a plan to reactivate VYRAL.`},
  {from:/Tu plan finalizó\. Elegí uno para volver a activar VYRAL\./gi,to:()=>`Your plan ended. Choose one to reactivate VYRAL.`},
  {from:/No pudimos iniciar el pago\. Probá nuevamente\./gi,to:()=>`We couldn't start checkout. Please try again.`},
  {from:/Solicitud enviada al soporte\. Te responderemos en menos de 24 horas\./gi,to:()=>`Request sent to support. We'll reply within 24 hours.`},
  {from:/Solicitud de cambio enviada\. La revisaremos y te notificaremos desde tu panel\./gi,to:()=>`Plan-change request sent. We'll review it and notify you in your dashboard.`}
 ],
 pt:[
  {from:/(\d[\d.,]*) vistas combinadas/gi,to:m=>`${m[1]} visualizações combinadas`},
  {from:/(\d[\d.,]*) vistas/gi,to:m=>`${m[1]} visualizações`},
  {from:/(\d[\d.,]*) cuentas conectadas/gi,to:m=>`${m[1]} contas conectadas`},
  {from:/(\d[\d.,]*) actividades recientes/gi,to:m=>`${m[1]} atividades recentes`},
  {from:/Publicar en (\d+) cuentas?/gi,to:m=>`Publicar em ${m[1]} conta${Number(m[1])===1?"":"s"}`},
  {from:/Tu cambio a ([^.]+) fue aprobado\. Tenés acceso hasta el ([^.]+)\. Después deberás renovar tu suscripción para seguir usando VYRAL\./gi,to:m=>`Sua mudança para ${m[1]} foi aprovada. Você tem acesso até ${m[2]}. Depois, renove sua assinatura para continuar usando o VYRAL.`},
  {from:/Tu solicitud fue aprobada\. Tu plan terminará el ([^.]+)\. Hasta ese día podés seguir usando VYRAL normalmente\./gi,to:m=>`Sua solicitação foi aprovada. Seu plano termina em ${m[1]}. Até essa data, você pode continuar usando o VYRAL normalmente.`},
  {from:/Tu acceso vence mañana\. Podés renovar ahora para evitar que VYRAL se bloquee al finalizar el período\./gi,to:()=>`Seu acesso vence amanhã. Renove agora para evitar interrupções ao fim do período.`},
  {from:/Tu período terminó\. Elegí un plan para volver a activar VYRAL\./gi,to:()=>`Seu período terminou. Escolha um plano para reativar o VYRAL.`}
 ],
 ar:[
  {from:/(\d[\d.,]*) vistas combinadas/gi,to:m=>`${m[1]} مشاهدة مجمّعة`},
  {from:/(\d[\d.,]*) vistas/gi,to:m=>`${m[1]} مشاهدة`},
  {from:/(\d[\d.,]*) cuentas conectadas/gi,to:m=>`${m[1]} حسابات متصلة`},
  {from:/(\d[\d.,]*) actividades recientes/gi,to:m=>`${m[1]} أنشطة حديثة`},
  {from:/Publicar en (\d+) cuentas?/gi,to:m=>`النشر إلى ${m[1]} حساب`},
  {from:/Tu cambio a ([^.]+) fue aprobado\. Tenés acceso hasta el ([^.]+)\. Después deberás renovar tu suscripción para seguir usando VYRAL\./gi,to:m=>`تمت الموافقة على تغيير خطتك إلى ${m[1]}. لديك وصول حتى ${m[2]}. بعد ذلك جدّد اشتراكك لمواصلة استخدام VYRAL.`},
  {from:/Tu solicitud fue aprobada\. Tu plan terminará el ([^.]+)\. Hasta ese día podés seguir usando VYRAL normalmente\./gi,to:m=>`تمت الموافقة على طلبك. ستنتهي خطتك في ${m[1]}. حتى ذلك التاريخ يمكنك متابعة استخدام VYRAL بشكل طبيعي.`},
  {from:/Tu acceso vence mañana\. Podés renovar ahora para evitar que VYRAL se bloquee al finalizar el período\./gi,to:()=>`ينتهي وصولك غداً. جدّد الآن لتجنب انقطاع الخدمة عند نهاية الفترة.`},
  {from:/Tu período terminó\. Elegí un plan para volver a activar VYRAL\./gi,to:()=>`انتهت فترتك. اختر خطة لإعادة تفعيل VYRAL.`},
  {from:/Tu plan finalizó\. Elegí uno para volver a activar VYRAL\./gi,to:()=>`انتهت خطتك. اختر خطة لإعادة تفعيل VYRAL.`},
  {from:/No pudimos iniciar el pago\. Probá nuevamente\./gi,to:()=>`تعذر بدء الدفع. حاول مرة أخرى.`},
  {from:/Solicitud enviada al soporte\. Te responderemos en menos de 24 horas\./gi,to:()=>`تم إرسال الطلب إلى الدعم. سنرد خلال 24 ساعة.`},
  {from:/Solicitud de cambio enviada\. La revisaremos y te notificaremos desde tu panel\./gi,to:()=>`تم إرسال طلب تغيير الخطة. سنراجعه ونبلغك من لوحة التحكم.`}
 ]
};

const reverse:Record<string,string>={
 "combined views":"vistas combinadas","visualizações combinadas":"vistas combinadas","مشاهدة مجمّعة":"vistas combinadas",
 "connected accounts":"cuentas conectadas","contas conectadas":"cuentas conectadas","حسابات متصلة":"cuentas conectadas",
 "recent activities":"actividades recientes","atividades recentes":"actividades recientes","أنشطة حديثة":"actividades recientes"
};

function lang():Lang{try{return(localStorage.getItem("vyral-lang")||"es") as Lang}catch{return"es"}}
function normalize(s:string){let out=s;for(const[k,v]of Object.entries(reverse))out=out.split(k).join(v);return out}
function convert(s:string,l:Lang){let out=normalize(s);if(l!=="en"&&l!=="pt"&&l!=="ar")return out;for(const rule of rules[l])out=out.replace(rule.from,(...args:any[])=>rule.to(args.slice(0,-2) as RegExpMatchArray));return out}

export default function LocaleDynamicFinalizer(){
 const timer=useRef<number|null>(null);
 useEffect(()=>{
  const run=()=>{const l=lang();const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n=w.nextNode() as Text|null;while(n){const el=n.parentElement;if(el&&!el.closest(".vyralLocaleDock")&&!["SCRIPT","STYLE"].includes(el.tagName)){const next=convert(n.nodeValue||"",l);if(next!==n.nodeValue)n.nodeValue=next}n=w.nextNode() as Text|null}};
  const schedule=()=>{if(timer.current!==null)clearTimeout(timer.current);timer.current=window.setTimeout(()=>{run();requestAnimationFrame(run)},45)};
  const onLocale=()=>schedule();window.addEventListener("vyral:locale",onLocale);
  const obs=new MutationObserver(()=>schedule());obs.observe(document.body,{childList:true,subtree:true,characterData:true});schedule();
  return()=>{window.removeEventListener("vyral:locale",onLocale);obs.disconnect();if(timer.current!==null)clearTimeout(timer.current)};
 },[]);
 return null;
}
