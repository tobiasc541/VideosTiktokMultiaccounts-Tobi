import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../../lib/auth";
import {supabaseAdmin} from "../../../../../lib/supabase-admin";

export const runtime="nodejs";
export const maxDuration=60;
const BASE="https://api.heygen.com";

async function allowed(){
 const session=await getCustomerSession();
 if(!session)return {error:NextResponse.json({error:"Iniciá sesión."},{status:401})};
 const {data}=await supabaseAdmin().auth.admin.getUserById(session.userId);
 const plan=String(data.user?.user_metadata?.plan||session.plan||"");
 if(plan!=="ai")return {error:NextResponse.json({error:"Creator Reels está disponible en VYRAL AI."},{status:403})};
 return {session};
}
function key(){return process.env.HEYGEN_API_KEY||process.env.VYRAL_HEYGEN_API_KEY||""}

export async function POST(req:Request){
 const gate=await allowed();if(gate.error)return gate.error;
 const apiKey=key();if(!apiKey)return NextResponse.json({error:"Falta HEYGEN_API_KEY en Vercel. Agregala y Creator Reels queda listo para renderizar."},{status:503});
 try{
  const b=await req.json();
  const script=String(b.script||"").trim();if(!script)return NextResponse.json({error:"Elegí un guion antes de generar."},{status:400});
  const duration=Math.min(30,Math.max(10,Number(b.duration)||30));
  const prompt=[
   "Create a finished vertical social-media Reel in 9:16, maximum "+duration+" seconds.",
   "Use this script exactly as the spoken message, preserving its language: "+script,
   "Presenter: "+String(b.avatar||"natural UGC creator")+". Voice: "+String(b.voice||"natural and warm")+".",
   "Setting: "+String(b.setting||"lifestyle")+". Style: "+String(b.style||"UGC")+".",
   b.captions?"Add clean burned-in social captions.":"Do not add captions.",
   b.music?"Use subtle background music that never competes with speech.":"No background music.",
   "Natural delivery, believable gestures, polished commercial lighting, no fake claims, no invented prices, vertical composition for Instagram Reels/TikTok."
  ].join("\n");
  const r=await fetch(BASE+"/v3/video-agents",{method:"POST",headers:{"x-api-key":apiKey,"Content-Type":"application/json","Idempotency-Key":crypto.randomUUID()},body:JSON.stringify({mode:"generate",prompt,orientation:"portrait"})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)return NextResponse.json({error:j?.message||j?.error?.message||j?.error||"HeyGen rechazó el render.",providerStatus:r.status},{status:502});
  const data=j?.data||j;const id=String(data?.video_id||data?.id||data?.video_agent_id||data?.job_id||"");
  return NextResponse.json({ok:true,id,status:data?.status||"pending",provider:"heygen",rawStatus:data?.status||null});
 }catch(e:any){return NextResponse.json({error:e?.message||"No se pudo iniciar el Reel."},{status:500})}
}

export async function GET(req:Request){
 const gate=await allowed();if(gate.error)return gate.error;
 const apiKey=key();if(!apiKey)return NextResponse.json({error:"Falta HEYGEN_API_KEY."},{status:503});
 const id=new URL(req.url).searchParams.get("id");if(!id)return NextResponse.json({error:"Falta el id del render."},{status:400});
 try{
  const candidates=[BASE+"/v3/video-agents/"+encodeURIComponent(id),BASE+"/v3/videos/"+encodeURIComponent(id)];
  let last:any=null;
  for(const url of candidates){
   const r=await fetch(url,{headers:{"x-api-key":apiKey},cache:"no-store"});
   const j=await r.json().catch(()=>({}));last={r,j};if(r.ok){const d=j?.data||j;return NextResponse.json({id,status:d?.status||d?.state||"processing",videoUrl:d?.video_url||d?.url||d?.output?.video_url||null,thumbnailUrl:d?.thumbnail_url||d?.output?.thumbnail_url||null});}
   if(r.status!==404)break;
  }
  return NextResponse.json({error:last?.j?.message||last?.j?.error?.message||"No se pudo consultar el render."},{status:502});
 }catch(e:any){return NextResponse.json({error:e?.message||"No se pudo consultar el render."},{status:500})}
}
