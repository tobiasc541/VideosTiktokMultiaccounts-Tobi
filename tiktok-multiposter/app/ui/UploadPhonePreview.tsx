"use client";

import { useEffect } from "react";
import "./UploadPhonePreview.css";

export default function UploadPhonePreview() {
  useEffect(() => {
    let currentUrl = "";
    let currentName = "";

    const applyRememberedVideo = (root: HTMLElement) => {
      if (!currentUrl) return;
      const phone = root.querySelector<HTMLElement>(".vyralUploadPhone");
      const video = root.querySelector<HTMLVideoElement>("video");
      const metaTitle = root.querySelector<HTMLElement>(".vyralUploadPhoneMeta b");
      const status = root.querySelector<HTMLElement>(".vyralMediaStatus");
      const onProcessing=(ev:any)=>{if(!status)return;status.style.display="block";const span=status.querySelector("span");if(span)span.textContent=String(ev?.detail?.text||"Procesando video…")};
      window.addEventListener("vyral:video-processing",onProcessing);
      if (!phone || !video) return;
      video.src = currentUrl;
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      if (metaTitle && currentName) metaTitle.textContent = currentName;
      phone.classList.add("hasVideo");
      video.play().catch(() => undefined);
    };

    const enhanceUpload = () => {
      const upload = document.querySelector<HTMLElement>(".vdUpload");
      const input = upload?.querySelector<HTMLInputElement>('input[type="file"]');
      if (!upload || !input || upload.dataset.vyralPreviewReady === "1") return;

      upload.dataset.vyralPreviewReady = "1";
      upload.classList.add("vyralPhoneUpload");
      const root = document.createElement("div");
      root.className = "vyralUploadPreviewRoot";
      root.innerHTML = `<div><div class="vyralMediaStatus" style="display:none;margin:0 0 12px;padding:10px 14px;border:1px solid rgba(45,238,220,.22);border-radius:12px;color:#8ea6aa;font-size:12px"><b style="color:#35eadb">VYRAL</b> · <span>Preparando video…</span></div><div class="vyralUploadPhone"><div class="vyralUploadPhoneScreen"><video autoplay muted loop playsinline preload="metadata"></video><div class="vyralUploadPhonePlaceholder"><div class="vyralUploadPortal"><i></i><span>↑</span><b>1 CLICK</b></div><strong>Presioná para elegir el video que vas a distribuir.</strong><div class="vyralUploadArrows"><span>⌁</span><span>⌁</span><span>⌁</span></div></div><div class="vyralUploadPhoneMeta"><b>Tu video</b><small>Preview · reproducción en loop · sin sonido</small></div></div></div><div class="vyralUploadHint"><b>Preview en tiempo real</b> · exactamente el archivo que cargaste</div></div>`;
      upload.appendChild(root);

      applyRememberedVideo(root);

      const phone = root.querySelector<HTMLElement>(".vyralUploadPhone");
      const video = root.querySelector<HTMLVideoElement>("video");
      const metaTitle = root.querySelector<HTMLElement>(".vyralUploadPhoneMeta b");

      const handleChange = () => {
        const f = input.files?.[0];
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
          currentUrl = "";
        }
        currentName = "";
        if (!f || !video || !phone) {
          phone?.classList.remove("hasVideo");
          if (video) video.removeAttribute("src");
          return;
        }
        currentName = f.name;
        currentUrl = URL.createObjectURL(f);
        video.src = currentUrl;
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;
        if (metaTitle) metaTitle.textContent = f.name;
        phone.classList.add("hasVideo");
        video.play().catch(() => undefined);
      };

      input.addEventListener("change", handleChange);
    };

    enhanceUpload();
    const observer = new MutationObserver(enhanceUpload);
    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      if (currentUrl) URL.revokeObjectURL(currentUrl);
    };
  }, []);

  return null;
}
