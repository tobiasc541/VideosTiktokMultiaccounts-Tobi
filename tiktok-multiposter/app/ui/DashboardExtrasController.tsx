"use client";

import { useEffect } from "react";

export default function DashboardExtrasController() {
  useEffect(() => {
    const sync = () => {
      const active = document.querySelector(".vdNav button.active");
      const root = document.querySelector<HTMLElement>(".dashboardPageWrap");
      if (!root) return;
      const label = (active?.textContent || "").toLowerCase();
      const dashboard = label.includes("dashboard");
      const analytics = label.includes("analytics");
      root.classList.toggle("show-dashboard-extras", dashboard);
      root.classList.toggle("show-analytics-extras", analytics);
      root.classList.toggle("isDashboardSection", dashboard);
      root.classList.toggle("isAnalyticsSection", analytics);
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
