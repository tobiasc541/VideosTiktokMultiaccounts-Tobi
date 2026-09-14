"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function PlanFeatureGate({ starter }: { starter: boolean }) {
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  useEffect(() => {
    if (!starter) return;
    const root = document.querySelector(".dashboardPageWrap");
    const nav = document.querySelector(".vdNav");
    if (!root || !nav) return;

    const onClick = (event: Event) => {
      const button = (event.target as HTMLElement)?.closest("button");
      if (!button) return;
      const label = (button.textContent || "").toLowerCase();
      if (label.includes("analytics")) {
        window.setTimeout(() => {
          root.classList.add("starterAnalyticsLocked");
          setAnalyticsOpen(true);
        }, 0);
      } else {
        root.classList.remove("starterAnalyticsLocked");
        setAnalyticsOpen(false);
      }
    };
    nav.addEventListener("click", onClick);
    return () => nav.removeEventListener("click", onClick);
  }, [starter]);

  if (!starter || !analyticsOpen) return null;
  return (
    <div className="starterAnalyticsGate" role="dialog" aria-label="Analytics bloqueado">
      <div className="starterGateIcon">✦</div>
      <small>FUNCIÓN PREMIUM</small>
      <h2>Analytics se desbloquea con Crecimiento.</h2>
      <p>Comparativas, rendimiento por cuenta, evolución y métricas avanzadas están disponibles desde el plan Crecimiento.</p>
      <Link href="/mi-plan#upgrade">Cambiar plan ↗</Link>
    </div>
  );
}
