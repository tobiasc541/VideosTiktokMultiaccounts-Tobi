import { NextResponse } from "next/server";
import { getCustomerSession } from "../../../../../lib/auth";
import { isPlanId, PLAN_CONFIG } from "../../../../../lib/plans";
const API="https://api.nowpayments.io/v1";
const allowed=new Set(["btc","usdttrc20","usdtbsc","usdtsol","eth","sol"]);
export async function POST(req:Request){
 const session=await getCustomerSession(); if(!session)return NextResponse.json({error:"Unauthorized"},{status:401});
 const body:unknown=await req.json().catch(()=>({}));
 const rawPlan=typeof body==="object"&&body!==null&&"plan" in body?String((body as {plan?:unknown}).plan??""):"";
 const currency=typeof body==="object"&&body!==null&&"payCurrency" in body?String((body as {payCurrency?:unknown}).payCurrency??"").toLowerCase():"";
 if(!isPlanId(rawPlan)||rawPlan!=="escala")return NextResponse.json({error:"El pago cripto está disponible por ahora en Escala."},{status:400});
 if(!allowed.has(currency))return NextResponse.json({error:"Elegí una criptomoneda disponible."},{status:400});
 const key=process.env.NOWPAYMENTS_API_KEY;if(!key)return NextResponse.json({error:"Crypto payments not configured"},{status:503});
 const origin=process.env.APP_URL||new URL(req.url).origin,orderId=`vyral:${session.userId}:${rawPlan}:${crypto.randomUUID()}`;
 const response=await fetch(`${API}/payment`,{method:"POST",headers:{"x-api-key":key,"Content-Type":"application/json"},body:JSON.stringify({price_amount:19.99,price_currency:"usd",pay_currency:currency,order_id:orderId,order_description:`VYRAL ${PLAN_CONFIG[rawPlan].name} - 1 mes`,ipn_callback_url:`${origin}/api/payments/nowpayments/webhook`})});
 const data=await response.json().catch(()=>({}));if(!response.ok||!data?.payment_id||!data?.pay_address)return NextResponse.json({error:data?.message||"Esta red no está disponible ahora."},{status:502});
 return NextResponse.json({paymentId:String(data.payment_id),status:String(data.payment_status||"waiting"),payAddress:String(data.pay_address),payAmount:String(data.pay_amount||""),payCurrency:String(data.pay_currency||currency),priceAmount:Number(data.price_amount||19.99),priceCurrency:String(data.price_currency||"usd")});
}