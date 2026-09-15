"use client";

import { useEffect } from "react";

export default function DashboardExtrasController() {
  useEffect(() => {
    const sync = () => {
      const active = document.querySelector(".vdNav button.active");
      const root = document.querySelector<HTMLElement>(".dashboardPageWrap");
      if (!root) return;

      // Do not infer the section from translated button text. The dashboard button
      // is always the first navigation item, so this remains stable in every locale.
      const buttons = Array.from(document.querySelectorAll(".vdNav button"));
      const activeIndex = active ? buttons.indexOf(active as HTMLButtonElement) : 0;
      const dashboard = activeIndex <= 0;
      const analytics = activeIndex === 4;

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
