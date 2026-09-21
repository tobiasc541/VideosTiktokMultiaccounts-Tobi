import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../../lib/auth";
import {isPlanId} from "../../../../../lib/plans";
const API="https://api.nowpayments.io/v1";
const prices={inicio:4.99,pro:9.99,escala:19.99,ai:49} as const;
const preferred=[
 {id:"btc",symbol:"BTC",name:"Bitcoin",icon:"/crypto/bitcoin.svg"},
 {id:"usdttrc20",symbol:"USDT",name:"Tether · TRON",icon:"/crypto/usdt.svg"},
 {id:"usdtbsc",symbol:"USDT",name:"Tether · BSC",icon:"/crypto/usdt.svg"},
 {id:"usdtsol",symbol:"USDT",name:"Tether · Solana",icon:"/crypto/usdt.svg"},
 {id:"eth",symbol:"ETH",name:"Ethereum",icon:"/crypto/ethereum.svg"},
 {id:"sol",symbol:"SOL",name:"Solana",icon:"/crypto/solana.svg"},
 {id:"trx",symbol:"TRX",name:"TRON",icon:"/crypto/usdt.svg"},
 {id:"ltc",symbol:"LTC",name:"Litecoin",icon:"/crypto/bitcoin.svg"}
];
export async function GET(req:Request){
 const session=await getCustomerSession();if(!session)return NextResponse.json({error:"Unauthorized"},{status:401});
 const plan=new URL(req.url).searchParams.get("plan")||"";if(!isPlanId(plan))return NextResponse.json({error:"Plan inválido"},{status:400});
 const key=process.env.NOWPAYMENTS_API_KEY;if(!key)return NextResponse.json({error:"Crypto payments not configured"},{status:503});
 const headers={"x-api-key":key};let available:string[]=[];
 try{const cr=await fetch(API+"/merchant/coins",{headers,cache:"no-store"});const cj=await cr.json();available=(Array.isArray(cj?.selectedCurrencies)?cj.selectedCurrencies:Array.isArray(cj?.currencies)?cj.currencies:[]).map((x:any)=>String(typeof x==="string"?x:x?.code||x?.currency||"").toLowerCase());}catch{}
 if(!available.length){try{const cr=await fetch(API+"/currencies?fixed_rate=false",{headers,cache:"no-store"});const cj=await cr.json();available=(cj?.currencies||[]).map((x:any)=>String(x).toLowerCase());}catch{}}
 const amount=prices[plan];const candidates=preferred.filter(x=>available.includes(x.id));
 const checked=await Promise.all(candidates.map(async x=>{try{
   const estR=await fetch(API+"/estimate?amount="+amount+"&currency_from=usd&currency_to="+encodeURIComponent(x.id),{headers,cache:"no-store"});const est=await estR.json();
   const minR=await fetch(API+"/min-amount?currency_from="+encodeURIComponent(x.id)+"&currency_to="+encodeURIComponent(x.id)+"&fiat_equivalent=usd&is_fixed_rate=False&is_fee_paid_by_user=True",{headers,cache:"no-store"});const min=await minR.json();
   const pay=Number(est?.estimated_amount||0),minimum=Number(min?.min_amount||0);return {...x,payAmount:pay,minimum,eligible:pay>0&&(!minimum||pay>=minimum)};
 }catch{return {...x,payAmount:0,minimum:0,eligible:false}}}));
 const options=checked.filter(x=>x.eligible);
 return NextResponse.json({plan,usd:amount,options,checkedAt:new Date().toISOString()});
}