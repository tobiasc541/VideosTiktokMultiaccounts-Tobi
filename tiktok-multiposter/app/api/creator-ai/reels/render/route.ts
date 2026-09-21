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
   b.avatar?"Presenter: the selected presenter.":"Presenter: natural UGC creator.",
   "Voice direction: "+String(b.voice||"natural and warm")+".",
   "Setting: "+String(b.setting||"lifestyle")+". Style: "+String(b.style||"UGC")+".",
   b.captions?"Add clean burned-in social captions.":"Do not add captions.",
   b.music?"Use subtle background music that never competes with speech.":"No background music.",
   "Natural delivery, believable gestures, polished commercial lighting, no fake claims, no invented prices, vertical composition for Instagram Reels/TikTok."
  ].join("\n");
  const r=await fetch(BASE+"/v3/video-agents",{method:"POST",headers:{"x-api-key":apiKey,"Content-Type":"application/json","Idempotency-Key":crypto.randomUUID()},body:JSON.stringify({mode:"generate",prompt,orientation:"portrait",auto_proceed:true})});
  const j=await r.json().catch(()=>({}));
  if(!r.ok)return NextResponse.json({error:j?.message||j?.error?.message||j?.error||"HeyGen rechazó el render.",providerStatus:r.status},{status:502});
  const data=j?.data||j;const sessionId=String(data?.session_id||data?.id||data?.video_agent_id||data?.job_id||"");const videoId=String(data?.video_id||"");
  if(!sessionId&&!videoId)return NextResponse.json({error:"HeyGen aceptó la solicitud pero no devolvió un identificador."},{status:502});
  return NextResponse.json({ok:true,id:sessionId||videoId,sessionId,videoId,status:data?.status||"pending",provider:"heygen",rawStatus:data?.status||null});
 }catch(e:any){return NextResponse.json({error:e?.message||"No se pudo iniciar el Reel."},{status:500})}
}

export async function GET(req:Request){
 const gate=await allowed();if(gate.error)return gate.error;
 const apiKey=key();if(!apiKey)return NextResponse.json({error:"Falta HEYGEN_API_KEY."},{status:503});
 const url=new URL(req.url);const sessionId=url.searchParams.get("id");const requestedVideoId=url.searchParams.get("videoId")||"";if(!sessionId&&!requestedVideoId)return NextResponse.json({error:"Falta el id del render."},{status:400});
 try{
  let videoId=requestedVideoId;let sessionStatus="processing";
  if(sessionId&&!videoId){const ar=await fetch(BASE+"/v3/video-agents/"+encodeURIComponent(sessionId),{headers:{"x-api-key":apiKey},cache:"no-store"});const aj=await ar.json().catch(()=>({}));if(!ar.ok)return NextResponse.json({error:aj?.message||aj?.error?.message||aj?.error||"No se pudo consultar la sesión de HeyGen."},{status:502});const ad=aj?.data||aj;sessionStatus=String(ad?.status||ad?.state||"processing");videoId=String(ad?.video_id||ad?.output?.video_id||"");if(["failed","error","cancelled","canceled"].includes(sessionStatus.toLowerCase()))return NextResponse.json({id:sessionId,status:"failed",error:ad?.failure_message||ad?.error||"HeyGen no pudo completar el Reel."});if(!videoId)return NextResponse.json({id:sessionId,status:sessionStatus,videoId:null,videoUrl:null});}
  const vr=await fetch(BASE+"/v3/videos/"+encodeURIComponent(videoId),{headers:{"x-api-key":apiKey},cache:"no-store"});const vj=await vr.json().catch(()=>({}));if(!vr.ok)return NextResponse.json({error:vj?.message||vj?.error?.message||vj?.error||"No se pudo consultar el video."},{status:502});const d=vj?.data||vj;return NextResponse.json({id:sessionId||videoId,videoId,status:d?.status||d?.state||sessionStatus,videoUrl:d?.video_url||d?.url||d?.output?.video_url||null,thumbnailUrl:d?.thumbnail_url||d?.output?.thumbnail_url||null,error:d?.failure_message||null});
 }catch(e:any){return NextResponse.json({error:e?.message||"No se pudo consultar el render."},{status:500})}
}
