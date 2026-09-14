"use client";

import { useEffect, useState } from "react";

type CreditState = { used: number; limit: number; remaining: number; plan?: string };

export default function CreditBadge() {
  const [data, setData] = useState<CreditState | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const res = await fetch("/api/account/video-credit", { cache: "no-store" });
        const json = await res.json();
        if (alive && res.ok) setData(json);
      } catch {}
    };
    load();
    const timer = setInterval(load, 8000);
    const onCredit = (e: Event) => {
      const detail = (e as CustomEvent<CreditState>).detail;
      if (detail) setData(detail);
    };
    window.addEventListener("vyral-credit", onCredit as EventListener);
    return () => {
      alive = false;
      clearInterval(timer);
      window.removeEventListener("vyral-credit", onCredit as EventListener);
    };
  }, []);

  if (!data) return null;
  const pct = data.limit ? Math.max(0, Math.min(100, (data.remaining / data.limit) * 100)) : 0;

  return (
    <div className="dashboardCredits">
      <div><span>CRÉDITOS DE VIDEO</span><b>{data.remaining} restantes</b></div>
      <small>{data.used} / {data.limit} usados este mes</small>
      <i><em style={{ width: `${pct}%` }} /></i>
    </div>
  );
}
