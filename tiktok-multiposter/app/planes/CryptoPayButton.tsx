"use client";

import { useState } from "react";

export default function CryptoPayButton({ plan, label }: { plan: string; label: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function pay() {
    setLoading(true); setError("");
    try {
      const r = await fetch("/api/payments/nowpayments/create", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ plan }) });
      const data = await r.json();
      if (!r.ok || !data?.url) throw new Error(data?.error || "No pudimos iniciar el pago");
      window.location.href = data.url;
    } catch (e) { setError(e instanceof Error ? e.message : "No pudimos iniciar el pago"); setLoading(false); }
  }
  return <div style={{marginTop:10}}>
    <button type="button" onClick={pay} disabled={loading} className="vyralPlanCheckout" style={{width:"100%",cursor:loading?"wait":"pointer"}}>
      {loading ? "Preparando pago…" : `₿ ${label} con cripto`} →
    </button>
    {error && <div style={{fontSize:12,color:"#ff8a8a",marginTop:8,textAlign:"center"}}>{error}</div>}
  </div>;
}
