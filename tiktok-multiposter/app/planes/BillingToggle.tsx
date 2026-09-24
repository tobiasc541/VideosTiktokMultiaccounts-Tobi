"use client";

import { useState } from "react";

export default function BillingToggle() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className={`vyralBillingScope ${annual ? "isAnnual" : "isMonthly"}`}>
      <style jsx global>{`
        .vyralPlansPage .vyralAnnualPrice,
        .vyralPlansPage .vyralAnnualSaving { display:none; }
        body:has(.vyralBillingScope.isAnnual) .vyralPlansPage .vyralMonthlyPrice { display:none; }
        body:has(.vyralBillingScope.isAnnual) .vyralPlansPage .vyralAnnualPrice { display:flex; }
        body:has(.vyralBillingScope.isAnnual) .vyralPlansPage .vyralAnnualSaving {
          display:block;
          margin:7px 0 2px;
          text-align:center;
          color:#4ef5dc;
          font-size:9px;
          font-weight:800;
          letter-spacing:.08em;
        }
        .vyralBillingToggle {
          margin:14px auto 24px;
          width:max-content;
          display:flex;
          align-items:center;
          gap:4px;
          padding:4px;
          border:1px solid rgba(77,245,220,.18);
          border-radius:999px;
          background:rgba(4,12,15,.86);
          box-shadow:0 12px 40px rgba(0,0,0,.22);
        }
        .vyralBillingToggle button {
          border:0;
          border-radius:999px;
          background:transparent;
          color:#7e9199;
          padding:9px 15px;
          font-size:11px;
          font-weight:800;
          cursor:pointer;
        }
        .vyralBillingToggle button.active {
          background:#53eee1;
          color:#031012;
        }
        .vyralBillingToggle .annualOption { display:inline-flex; align-items:center; gap:7px; }
        .vyralBillingToggle .annualOption b {
          color:#53eee1;
          font-size:9px;
          letter-spacing:.04em;
          padding:4px 7px;
          border-radius:999px;
          border:1px solid rgba(83,238,225,.24);
          background:rgba(83,238,225,.07);
          white-space:nowrap;
        }
        .vyralPlansPage .vyralBestSellerBadge {
          background:#ef4444 !important;
          color:#fff !important;
          border-color:#ff6b6b !important;
          box-shadow:0 0 24px rgba(239,68,68,.28);
        }
        .vyralPlansPage .vyralPlanCheckout {
          transition:transform .18s ease, background .18s ease, color .18s ease, border-color .18s ease, box-shadow .18s ease;
        }
        .vyralPlansPage .vyralPlanCheckout.primaryCheckout,
        .vyralPlansPage .vyralPlanCheckout:hover {
          background:#53eee1 !important;
          color:#031012 !important;
          border-color:#53eee1 !important;
          box-shadow:0 8px 26px rgba(83,238,225,.16);
          transform:translateY(-1px);
        }
      `}</style>
      <div className="vyralBillingToggle" aria-label="Frecuencia de facturación">
        <button type="button" className={!annual ? "active" : ""} onClick={() => setAnnual(false)}>Mensual</button>
        <span className="annualOption"><button type="button" className={annual ? "active" : ""} onClick={() => setAnnual(true)}>Anual</button><b>2 MESES GRATIS</b></span>
      </div>
    </div>
  );
}
