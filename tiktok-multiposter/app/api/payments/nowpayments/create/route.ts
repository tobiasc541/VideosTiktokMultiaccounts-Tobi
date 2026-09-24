import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { isPlanId, PLAN_CONFIG } from "../../../../../lib/plans";
const API="https://api.nowpayments.io/v1";
const allowed=new Set(["btc","usdttrc20","usdtbsc","usdtsol","eth","sol"]);
const cryptoPrices={escala:19.99,ai:99.99} as const;
export async function POST(req:Request){
 const session=await getCustomerSession(); if(!session)return NextResponse.json({error:"Unauthorized"},{status:401});
 const body:unknown=await req.json().catch(()=>({}));
 const rawPlan=typeof body==="object"&&body!==null&&"plan" in body?String((body as {plan?:unknown}).plan??""):"";
 const currency=typeof body==="object"&&body!==null&&"payCurrency" in body?String((body as {payCurrency?:unknown}).payCurrency??"").toLowerCase():"";
 if(!isPlanId(rawPlan)||!(rawPlan in cryptoPrices))return NextResponse.json({error:"El pago cripto está disponible en Escala y VYRAL AI."},{status:400});
 if(!allowed.has(currency))return NextResponse.json({error:"Elegí una criptomoneda disponible."},{status:400});
 const price=cryptoPrices[rawPlan as keyof typeof cryptoPrices];
 const key=process.env.NOWPAYMENTS_API_KEY;if(!key)return NextResponse.json({error:"Crypto payments not configured"},{status:503});
 const origin=process.env.APP_URL||new URL(req.url).origin,orderId=`vyral:${session.userId}:${rawPlan}:${crypto.randomUUID()}`;
 const response=await fetch(`${API}/payment`,{method:"POST",headers:{"x-api-key":key,"Content-Type":"application/json"},body:JSON.stringify({price_amount:price,price_currency:"usd",pay_currency:currency,order_id:orderId,order_description:`VYRAL ${PLAN_CONFIG[rawPlan].name} - 1 mes`,ipn_callback_url:`${origin}/api/payments/nowpayments/webhook`})});
 const data=await response.json().catch(()=>({}));if(!response.ok||!data?.payment_id||!data?.pay_address)return NextResponse.json({error:data?.message||"Esta red no está disponible ahora."},{status:502});
 return NextResponse.json({paymentId:String(data.payment_id),status:String(data.payment_status||"waiting"),payAddress:String(data.pay_address),payAmount:String(data.pay_amount||""),payCurrency:String(data.pay_currency||currency),priceAmount:Number(data.price_amount||price),priceCurrency:String(data.price_currency||"usd")});
}