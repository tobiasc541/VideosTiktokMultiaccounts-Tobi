"use client";

import { useEffect } from "react";

export default function DashboardExtrasController() {
  useEffect(() => {
    const removeApiReadinessLabels = () => {
      const phrases = [
        "instagram listo para api",
        "facebook listo para api",
        "instagram ready for api",
        "facebook ready for api",
        "instagram pronto para api",
        "facebook pronto para api"
      ];

      document.querySelectorAll<HTMLElement>(".vdMain span, .vdMain small, .vdMain p, .vdMain div, .dashboardPostFlow span, .dashboardPostFlow small, .dashboardPostFlow p, .dashboardPostFlow div").forEach((el) => {
        if (el.children.length) return;
        const text = (el.textContent || "").replace(/\s+/g, " ").trim().toLowerCase();
        if (phrases.some((phrase) => text === phrase || text.includes(phrase))) {
          el.style.display = "none";
        }
      });
    };

    const setPublishCardTitle = (activeIndex: number) => {
      if (activeIndex !== 1) return;
      const title = document.querySelector<HTMLElement>(".vdMain .vdGrid .vdCard:first-child .vdCardHead h2");
      if (!title) return;
      const lang = localStorage.getItem("vyral-lang") || "es";
      const labels: Record<string, string> = {
        es: "Prepará tu contenido",
        en: "Prepare your content",
        pt: "Prepare seu conteúdo",
        ar: "جهّز محتواك",
        fr: "Préparez votre contenu",
        de: "Bereite deinen Inhalt vor",
        it: "Prepara i tuoi contenuti",
        nl: "Bereid je content voor",
        ja: "コンテンツを準備"
      };
      title.textContent = labels[lang] || labels.es;
    };

    const sync = () => {
      const active = document.querySelector(".vdNav button.active");
      const root = document.querySelector<HTMLElement>(".dashboardPageWrap");
      if (!root) return;

      const buttons = Array.from(document.querySelectorAll(".vdNav button"));
      const activeIndex = active ? buttons.indexOf(active as HTMLButtonElement) : 0;
      const dashboard = activeIndex <= 0;
      const analytics = activeIndex === 4;

      root.classList.toggle("show-dashboard-extras", dashboard);
      root.classList.toggle("show-analytics-extras", analytics);
      root.classList.toggle("isDashboardSection", dashboard);
      root.classList.toggle("isAnalyticsSection", analytics);
      removeApiReadinessLabels();
      setPublishCardTitle(activeIndex);
    };

    sync();
    const nav = document.querySelector(".vdNav");
    const observer = new MutationObserver(sync);
    if (nav) observer.observe(nav, { attributes: true, subtree: true, attributeFilter: ["class"] });

    const onClick = () => {
      sync();
      window.setTimeout(sync, 0);
      window.setTimeout(sync, 150);
    };
    document.addEventListener("click", onClick, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}
