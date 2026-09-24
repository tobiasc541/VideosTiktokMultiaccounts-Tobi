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
        .vyralBillingToggle b {
          color:#53eee1;
          font-size:9px;
          padding-right:10px;
          letter-spacing:.04em;
        }
      `}</style>
      <div className="vyralBillingToggle" aria-label="Frecuencia de facturación">
        <button type="button" className={!annual ? "active" : ""} onClick={() => setAnnual(false)}>Mensual</button>
        <button type="button" className={annual ? "active" : ""} onClick={() => setAnnual(true)}>Anual</button>
        <b>2 MESES GRATIS</b>
      </div>
    </div>
  );
}
