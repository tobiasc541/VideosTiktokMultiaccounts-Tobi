import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../../lib/auth";
import {supabaseAdmin} from "../../../../../lib/supabase-admin";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const BASE="https://api.heygen.com";
function key(){return process.env.HEYGEN_API_KEY||process.env.VYRAL_HEYGEN_API_KEY||""}
async function allowed(){const session=await getCustomerSession();if(!session)return {error:NextResponse.json({error:"Iniciá sesión."},{status:401})};const {data}=await supabaseAdmin().auth.admin.getUserById(session.userId);const plan=String(data.user?.user_metadata?.plan||session.plan||"");if(plan!=="ai")return {error:NextResponse.json({error:"Creator Reels está disponible en VYRAL AI."},{status:403})};return {session}}
export async function GET(){const gate=await allowed();if(gate.error)return gate.error;const apiKey=key();if(!apiKey)return NextResponse.json({error:"Falta HEYGEN_API_KEY."},{status:503});try{const r=await fetch(BASE+"/v3/avatars/looks?ownership=public&limit=24",{headers:{"x-api-key":apiKey,"accept":"application/json"},cache:"no-store"});const j=await r.json().catch(()=>({}));if(!r.ok)return NextResponse.json({error:j?.message||j?.error?.message||j?.error||"No se pudieron cargar los avatares."},{status:502});const avatars=(Array.isArray(j?.data)?j.data:j?.data?.data||[]).filter((a:any)=>a?.id&&a?.preview_image_url).map((a:any)=>({id:a.id,name:a.name||"Avatar",gender:a.gender||"",image:a.preview_image_url,video:a.preview_video_url||null}));return NextResponse.json({avatars});}catch(e:any){return NextResponse.json({error:e?.message||"No se pudieron cargar los avatares."},{status:500})}}
