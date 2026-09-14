"use client";

import { useEffect } from "react";

export default function DashboardExtrasController() {
  useEffect(() => {
    const sync = () => {
      const active = document.querySelector(".vdNav button.active");
      const top = document.querySelector<HTMLElement>(".dashboardTopContent");
      if (!top) return;
      const label = (active?.textContent || "").toLowerCase();
      top.style.display = label.includes("dashboard") ? "block" : "none";
    };

    sync();
    const nav = document.querySelector(".vdNav");
    const observer = new MutationObserver(sync);
    if (nav) observer.observe(nav, { attributes: true, subtree: true, attributeFilter: ["class"] });
    document.addEventListener("click", sync, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", sync, true);
    };
  }, []);

  return null;
}
