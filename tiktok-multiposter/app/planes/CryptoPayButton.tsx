"use client";
import {useState} from "react";
export default function CryptoPayButton({plan}:{plan:string;label?:string}){
 const[loading,setLoading]=useState(false),[error,setError]=useState("");
 if(plan!=="escala") return <div style={{marginTop:10,width:"100%",border:"1px solid rgba(82,240,229,.16)",borderRadius:12,padding:"11px 14px",textAlign:"center",fontSize:11,fontWeight:800,letterSpacing:".08em",color:"#6f8588",background:"linear-gradient(135deg,rgba(82,240,229,.035),rgba(255,255,255,.015))"}}>PAGAR CON CRIPTOMONEDAS · <span style={{color:"#55e9df"}}>PRÓXIMAMENTE</span></div>;
 async function pay(){setLoading(true);setError("");try{const r=await fetch("/api/payments/nowpayments/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({plan})}),data=await r.json();if(!r.ok||!data?.url)throw Error(data?.error||"No pudimos iniciar el pago");location.href=data.url}catch(e){setError(e instanceof Error?e.message:"No pudimos iniciar el pago");setLoading(false)}}
 return <div style={{marginTop:10}}><button type="button" onClick={pay} disabled={loading} className="vyralPlanCheckout" style={{width:"100%",cursor:loading?"wait":"pointer"}}>{loading?"Abriendo pago seguro…":"Pagar con criptomonedas"} →</button>{error&&<div style={{fontSize:12,color:"#ff8a8a",marginTop:8,textAlign:"center"}}>{error}</div>}</div>;
}