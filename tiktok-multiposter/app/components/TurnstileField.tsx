"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

export default function TurnstileField({ action }: { action: "login" | "signup" }) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "";

  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    const setToken = (token: string) => {
      const input = ref.current?.parentElement?.querySelector<HTMLInputElement>('input[name="captchaToken"]');
      if (input) input.value = token;
    };
    const render = () => {
      if (cancelled || !ref.current || !window.turnstile || widgetId.current) return;
      widgetId.current = window.turnstile.render(ref.current, {
        sitekey: siteKey, action, theme: "auto", size: "flexible",
        callback: (token: string) => setToken(token),
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken("")
      });
    };
    const existing = document.querySelector<HTMLScriptElement>('script[data-vyral-turnstile="1"]');
    if (existing) {
      if (window.turnstile) render();
      else existing.addEventListener("load", render, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true; script.defer = true; script.dataset.vyralTurnstile = "1";
      script.addEventListener("load", render, { once: true });
      document.head.appendChild(script);
    }
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [action, siteKey]);

  if (!siteKey) return <div className="vyralAuthError">Protección anti-bots pendiente de configuración.</div>;
  return <div style={{ margin: "4px 0 2px" }}><input type="hidden" name="captchaToken" defaultValue="" /><div ref={ref} /></div>;
}
