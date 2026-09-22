"use client";

import { useEffect } from "react";
import "./UploadPhonePreview.css";

export default function UploadPhonePreview() {
  useEffect(() => {
    let currentUrl = "";
    let currentName = "";
    let carouselIndex = 0;
    let carouselImages: string[] = [];
    let processingListener: ((ev: Event) => void) | null = null;

    const applyRememberedVideo = (root: HTMLElement) => {
      const phone = root.querySelector<HTMLElement>(".vyralUploadPhone");
      const video = root.querySelector<HTMLVideoElement>("video");
      const metaTitle = root.querySelector<HTMLElement>(".vyralUploadPhoneMeta b");
      if (!processingListener) {
        processingListener = ((ev: Event) => {
          const detail = (ev as CustomEvent).detail || {};
          document.querySelectorAll<HTMLElement>(".vyralMediaStatus").forEach(el => {
            el.style.display = "block";
            el.dataset.stage = String(detail.stage || "processing");
            const span = el.querySelector("span");
            if (span) span.textContent = String(detail.text || "Procesando video…");
          });
        });
        window.addEventListener("vyral:video-processing", processingListener);
      }
      if (!currentUrl || !phone || !video) return;
      video.src = currentUrl;
      video.muted = true;
      video.loop = true;
      video.autoplay = true;
      video.playsInline = true;
      if (metaTitle && currentName) metaTitle.textContent = currentName;
      phone.classList.add("hasVideo");
      video.play().catch(() => undefined);
    };

    const applyCarousel = (root: HTMLElement) => {
      try {
        const raw=sessionStorage.getItem("vyral:creator-ai-publication");
        const data=raw?JSON.parse(raw):null;
        carouselImages=Array.isArray(data?.slides)?data.slides.map((s:any)=>String(s?.image||"")).filter(Boolean):[];
      } catch { carouselImages=[]; }
      if(!carouselImages.length)return;
      const phone=root.querySelector<HTMLElement>(".vyralUploadPhone"),screen=root.querySelector<HTMLElement>(".vyralUploadPhoneScreen"),video=root.querySelector<HTMLVideoElement>("video"),placeholder=root.querySelector<HTMLElement>(".vyralUploadPhonePlaceholder"),meta=root.querySelector<HTMLElement>(".vyralUploadPhoneMeta b");
      if(!phone||!screen)return;
      video?.style.setProperty("display","none");if(placeholder)placeholder.style.display="none";
      let img=screen.querySelector<HTMLImageElement>(".vyralCarouselPreviewImage");
      if(!img){img=document.createElement("img");img.className="vyralCarouselPreviewImage";img.style.cssText="width:100%;height:100%;object-fit:cover;display:block";screen.insertBefore(img,screen.firstChild)}
      const render=()=>{if(!img)return;img.src=carouselImages[carouselIndex];if(meta)meta.textContent=`Imagen ${carouselIndex+1} de ${carouselImages.length}`;phone.classList.add("hasVideo")};render();
      if(!screen.querySelector(".vyralCarouselNav")){const nav=document.createElement("div");nav.className="vyralCarouselNav";nav.style.cssText="position:absolute;inset:0;display:flex;align-items:center;justify-content:space-between;pointer-events:none;padding:8px";nav.innerHTML='<button type="button" data-dir="-1" style="pointer-events:auto;border:0;border-radius:50%;width:34px;height:34px;background:rgba(0,0,0,.62);color:white;font-size:20px">‹</button><button type="button" data-dir="1" style="pointer-events:auto;border:0;border-radius:50%;width:34px;height:34px;background:rgba(0,0,0,.62);color:white;font-size:20px">›</button>';nav.querySelectorAll("button").forEach(b=>b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();carouselIndex=(carouselIndex+Number((b as HTMLElement).dataset.dir||1)+carouselImages.length)%carouselImages.length;render()}));screen.appendChild(nav)}
    };

    const enhanceUpload = () => {
      const upload = document.querySelector<HTMLElement>(".vdUpload");
      const input = upload?.querySelector<HTMLInputElement>('input[type="file"]');
      if (!upload || !input) return;
      if (upload.dataset.vyralPreviewReady === "1") { const existing=upload.querySelector<HTMLElement>(".vyralUploadPreviewRoot"); if(existing) applyCarousel(existing); return; }

      upload.dataset.vyralPreviewReady = "1";
      upload.classList.add("vyralPhoneUpload");
      const root = document.createElement("div");
      root.className = "vyralUploadPreviewRoot";
      root.innerHTML = `<div><div class="vyralMediaStatus" style="display:none;margin:0 0 12px;padding:10px 14px;border:1px solid rgba(45,238,220,.22);border-radius:12px;color:#8ea6aa;font-size:12px"><b style="color:#35eadb">VYRAL</b> · <span>Preparando video…</span></div><div class="vyralUploadPhone"><div class="vyralUploadPhoneScreen"><video autoplay muted loop playsinline preload="metadata"></video><div class="vyralUploadPhonePlaceholder"><div class="vyralUploadPortal"><i></i><span>↑</span><b>1 CLICK</b></div><strong>Presioná para elegir el video que vas a distribuir.</strong><div class="vyralUploadArrows"><span>⌁</span><span>⌁</span><span>⌁</span></div></div><div class="vyralUploadPhoneMeta"><b>Tu video</b><small>Preview · reproducción en loop · sin sonido</small></div></div></div><div class="vyralUploadHint"><b>Preview en tiempo real</b> · exactamente el archivo que cargaste</div></div>`;
      upload.appendChild(root);

      applyRememberedVideo(root);
      applyCarousel(root);

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
        window.dispatchEvent(new CustomEvent("vyral:video-selected", { detail: { file: f } }));
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
      if (processingListener) window.removeEventListener("vyral:video-processing", processingListener);
    };
  }, []);

  return null;
}
