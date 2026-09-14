"use client";

import { useEffect } from "react";
import styles from "./UploadPhonePreview.module.css";

export default function UploadPhonePreview() {
  useEffect(() => {
    let currentUrl = "";

    const enhanceUpload = () => {
      const upload = document.querySelector<HTMLElement>(".vdUpload");
      const input = upload?.querySelector<HTMLInputElement>('input[type="file"]');
      if (!upload || !input || upload.dataset.vyralPreviewReady === "1") return;

      upload.dataset.vyralPreviewReady = "1";
      upload.classList.add("vyralPhoneUpload");

      const root = document.createElement("div");
      root.className = "vyralUploadPreviewRoot";
      root.innerHTML = `
        <div>
          <div class="vyralUploadPhone">
            <div class="vyralUploadPhoneScreen">
              <video autoplay muted loop playsinline preload="metadata"></video>
              <div class="vyralUploadPhonePlaceholder">
                <span class="vyralUploadPlus">+</span>
                <strong>Juntá tu video acá</strong>
                <span>Tocá para elegir el contenido que vas a distribuir.</span>
              </div>
              <div class="vyralUploadPhoneMeta">
                <b>Tu video</b>
                <small>Preview · reproducción en loop · sin sonido</small>
              </div>
            </div>
          </div>
          <div class="vyralUploadHint"><b>Preview en tiempo real</b> · exactamente el archivo que cargaste</div>
        </div>
      `;
      upload.appendChild(root);

      const phone = root.querySelector<HTMLElement>(".vyralUploadPhone");
      const video = root.querySelector<HTMLVideoElement>("video");
      const metaTitle = root.querySelector<HTMLElement>(".vyralUploadPhoneMeta b");

      const handleChange = () => {
        const selectedFile = input.files?.[0];
        if (currentUrl) {
          URL.revokeObjectURL(currentUrl);
          currentUrl = "";
        }

        if (!selectedFile || !video || !phone) {
          phone?.classList.remove("hasVideo");
          if (video) video.removeAttribute("src");
          return;
        }

        currentUrl = URL.createObjectURL(selectedFile);
        video.src = currentUrl;
        video.muted = true;
        video.loop = true;
        video.autoplay = true;
        video.playsInline = true;
        if (metaTitle) metaTitle.textContent = selectedFile.name;
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

  return <span className={styles.previewShell} aria-hidden="true" />;
}
