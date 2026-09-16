type CostResult={cost:number;currency:string;available:boolean;error?:string};
export async function getOpenAiMonthCost():Promise<CostResult>{
 const key=process.env.OPENAI_ADMIN_KEY;
 if(!key)return {cost:0,currency:"usd",available:false,error:"OPENAI_ADMIN_KEY no configurada"};
 const now=new Date();const start=Math.floor(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),1)/1000);const end=Math.floor(Date.now()/1000);
 try{
  let page:string|undefined;let total=0;let currency="usd";let guard=0;
  do{
   const q=new URLSearchParams({start_time:String(start),end_time:String(end),bucket_width:"1d",limit:"31"});if(page)q.set("page",page);
   const r=await fetch(`https://api.openai.com/v1/organization/costs?${q}`,{headers:{Authorization:`Bearer ${key}`},cache:"no-store"});
   if(!r.ok){const t=await r.text();return {cost:0,currency,available:false,error:`OpenAI ${r.status}: ${t.slice(0,180)}`}}
   const d=await r.json();
   for(const bucket of d.data||[])for(const item of bucket.results||[]){const v=Number(item?.amount?.value||0);if(Number.isFinite(v))total+=v;if(item?.amount?.currency)currency=String(item.amount.currency).toLowerCase()}
   page=d.has_more?d.next_page:undefined;guard++;
  }while(page&&guard<12);
  return {cost:total,currency,available:true};
 }catch(e:any){return {cost:0,currency:"usd",available:false,error:e?.message||"Error consultando OpenAI"}}
}
