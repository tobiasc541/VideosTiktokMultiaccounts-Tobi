import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../../lib/auth";
import {supabaseAdmin} from "../../../../../lib/supabase-admin";
export const runtime="nodejs"; export const maxDuration=30;
async function allowed(){const session=await getCustomerSession();if(!session)return false;const {data}=await supabaseAdmin().auth.admin.getUserById(session.userId);return String(data.user?.user_metadata?.plan||session.plan||"")==="ai"}
function absolute(v:string,base:string){try{return new URL(v,base).toString()}catch{return ""}}
function text(v:string){return v.replace(/\\s+/g," ").replace(/&amp;/g,"&").trim()}
export async function POST(req:Request){
 if(!await allowed())return NextResponse.json({error:"Creator Reels requiere VYRAL AI."},{status:403});
 try{
  const b=await req.json();const source=String(b.url||"").trim();
  if(!/^https?:\\/\\//i.test(source))return NextResponse.json({error:"Ingresá una URL válida del producto."},{status:400});
  const r=await fetch(source,{headers:{"User-Agent":"Mozilla/5.0 VYRALCreator/1.0",accept:"text/html,application/xhtml+xml"},redirect:"follow",cache:"no-store"});
  if(!r.ok)throw new Error("No pude abrir la página del producto.");
  const html=(await r.text()).slice(0,2000000);
  const meta=(key:string)=>{const tags=html.match(/<meta\\s+[^>]*>/gi)||[];for(const tag of tags){if(!tag.toLowerCase().includes(key.toLowerCase()))continue;const m=tag.match(/content=["']([^"']+)["']/i);if(m)return text(m[1])}return ""};
  const title=meta("og:title")||meta("twitter:title")||text((html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i)?.[1]||"").replace(/<[^>]+>/g," "));
  const description=meta("og:description")||meta("description")||meta("twitter:description");
  const images:string[]=[];const add=(v:string)=>{const u=absolute(v,source);if(u&&/^https?:/i.test(u)&&!images.includes(u))images.push(u)};
  ["og:image","og:image:secure_url","twitter:image"].forEach(k=>{const v=meta(k);if(v)add(v)});
  for(const m of html.matchAll(/<img[^>]+(?:src|data-src|data-original)=["']([^"']+)["'][^>]*>/gi)){add(m[1]);if(images.length>=12)break}
  return NextResponse.json({ok:true,sourceUrl:r.url||source,title,description,images:images.slice(0,8)});
 }catch(e:any){return NextResponse.json({error:e?.message||"No pude analizar la URL del producto."},{status:502})}
}