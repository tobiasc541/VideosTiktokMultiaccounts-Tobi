"use client";

import { useEffect } from "react";

export default function DashboardNoticeBridge() {
  useEffect(() => {
    let last = "";
    const sync = () => {
      document.querySelectorAll<HTMLElement>(".vdNotice").forEach((notice) => {
        if (notice.dataset.vyralBridged === "1") return;
        notice.dataset.vyralBridged = "1";
        const title = notice.querySelector("strong")?.textContent?.trim() || "VYRAL";
        const text = notice.querySelector("p")?.textContent?.trim() || "";
        const key = `${title}|${text}`;
        if (key !== last) {
          last = key;
          window.dispatchEvent(new CustomEvent("vyral:notify", { detail: {
            title,
            text,
            tone: notice.classList.contains("err") ? "warn" : "good",
            icon: notice.classList.contains("err") ? "!" : "✓",
            open: true
          }}));
        }
        const close = notice.querySelector<HTMLButtonElement>(".vdNoticeClose");
        if (close) close.click(); else notice.remove();
      });
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
