"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const EMAIL = "viralvideosapp@gmail.com";

export default function EnterpriseContact() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const subject = encodeURIComponent("VYRAL Empresa - Consulta comercial");
  const body = encodeURIComponent(
    "Hola VYRAL,\n\nQuiero consultar por el plan Empresa.\n\nNegocio / empresa:\nCantidad de cuentas:\nVolumen estimado de Reels IA por mes:\nEquipo / usuarios:\nNecesidades especiales:\n\nGracias."
  );

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const modal = open ? (
    <div className="enterpriseContactOverlay" role="presentation">
      <div className="enterpriseContactModal" role="dialog" aria-modal="true" aria-labelledby="enterprise-contact-title">
        <button type="button" className="enterpriseContactClose" aria-label="Cerrar" onClick={() => setOpen(false)}>×</button>
        <small>VYRAL FOR BUSINESS</small>
        <h2 id="enterprise-contact-title">Hablemos de tu operación.</h2>
        <p>Enviá un mail con los datos de tu negocio, el volumen que necesitás y tus requerimientos a:</p>
        <a className="enterpriseEmail" href={`mailto:${EMAIL}?subject=${subject}&body=${body}`}>{EMAIL}</a>
        <p>Te responderemos lo antes posible para entender tu caso y definir juntos una propuesta y un acuerdo comercial a medida.</p>
        <a className="enterpriseMailButton" href={`mailto:${EMAIL}?subject=${subject}&body=${body}`}>Preparar email →</a>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button type="button" className="vyralPlanCheckout enterpriseContact" onClick={() => setOpen(true)}>
        Contactar por plan Empresa →
      </button>
      {mounted && modal ? createPortal(modal, document.body) : null}
    </>
  );
}
