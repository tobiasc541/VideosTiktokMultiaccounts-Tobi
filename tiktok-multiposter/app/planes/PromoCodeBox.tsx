"use client";

import { useState } from "react";

export default function PromoCodeBox({ userId }: { userId: string }) {
  const [code,setCode] = useState("");
  const [status,setStatus] = useState("");
  const [valid,setValid] = useState(false);

  async function apply() {
    const value = code.trim().toUpperCase();
    if (!value) return;
    setStatus("Validando código…"); setValid(false);
    const res = await fetch("/api/promo/validate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code:value})});
    const json = await res.json().catch(()=>({}));
    if (!res.ok || !json.valid) { setStatus("Ese código no es válido o todavía no está activo."); return; }
    setValid(true); setStatus(`Código ${json.code} aplicado · 50% de descuento`);
    document.querySelectorAll<HTMLAnchorElement>("a[data-vyral-checkout]").forEach((a)=>{
      const base=a.dataset.vyralCheckout || a.href;
      const sep=base.includes("?")?"&":"?";
      a.href=`${base}${sep}checkout[discount_code]=${encodeURIComponent(json.code)}&checkout[custom][creator_code]=${encodeURIComponent(json.code)}&checkout[custom][creator_id]=${encodeURIComponent(json.creatorId)}&checkout[custom][user_id]=${encodeURIComponent(userId)}`;
    });
  }

  return <section className={`promoBox${valid?" active":""}`}><div><small>CÓDIGO PROMOCIONAL</small><strong>¿Venís de parte de un Creator Viral?</strong><p>Ingresá su código y accedé al beneficio promocional disponible.</p></div><div className="promoApply"><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="Ej: TOBI10" maxLength={12}/><button type="button" onClick={apply}>Aplicar código</button></div>{status&&<span className="promoStatus">{status}</span>}</section>;
}
