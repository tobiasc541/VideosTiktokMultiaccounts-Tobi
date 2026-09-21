import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../../lib/auth";
import {supabaseAdmin} from "../../../../../lib/supabase-admin";

export const runtime="nodejs";
export const maxDuration=30;

async function allowed(){
 const session=await getCustomerSession();
 if(!session)return false;
 const {data}=await supabaseAdmin().auth.admin.getUserById(session.userId);
 return String(data.user?.user_metadata?.plan||session.plan||"")==="ai";
}
function clean(v:any){return String(v||"").replace(/\s+/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,'"').trim()}
function absolute(v:any,base:string){try{const u=new URL(String(v||""),base);return /^https?:$/.test(u.protocol)?u.toString():""}catch{return ""}}
function meta(html:string,key:string){
 const tags=html.match(/<meta\s+[^>]*>/gi)||[];
 for(const tag of tags){
  const k=tag.match(/(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1];
  if(String(k||"").toLowerCase()!==key.toLowerCase())continue;
  return clean(tag.match(/content\s*=\s*["']([^"']+)["']/i)?.[1]);
 }
 return "";
}
function jsonLdProducts(html:string){
 const out:any[]=[];
 for(const m of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){
  try{
   const parsed=JSON.parse(m[1]);
   const walk=(x:any)=>{
    if(!x)return;
    if(Array.isArray(x)){x.forEach(walk);return}
    if(typeof x!=="object")return;
    const types=Array.isArray(x["@type"])?x["@type"]:[x["@type"]];
    if(types.some((t:any)=>String(t).toLowerCase()==="product"))out.push(x);
    if(x["@graph"])walk(x["@graph"]);
   };
   walk(parsed);
  }catch{}
 }
 return out;
}
export async function POST(req:Request){
 if(!await allowed())return NextResponse.json({error:"Creator Reels requiere VYRAL AI."},{status:403});
 try{
  const {url}=await req.json();
  const source=String(url||"").trim();
  const parsed=new URL(source);
  if(!["http:","https:"].includes(parsed.protocol))return NextResponse.json({error:"Ingresá una URL válida del producto."},{status:400});
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),12000);
  const r=await fetch(source,{headers:{"User-Agent":"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/153 Safari/537.36",accept:"text/html,application/xhtml+xml"},redirect:"follow",cache:"no-store",signal:controller.signal});
  clearTimeout(timer);
  if(!r.ok)throw new Error("La tienda respondió "+r.status+" al intentar leer el producto.");
  const type=r.headers.get("content-type")||"";
  if(!type.includes("text/html")&&!type.includes("application/xhtml+xml"))throw new Error("La URL no devolvió una página de producto HTML.");
  const html=(await r.text()).slice(0,4000000);
  const products=jsonLdProducts(html);const schema=products[0]||{};
  const title=clean(schema.name)||meta(html,"og:title")||meta(html,"twitter:title")||clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  const description=clean(schema.description)||meta(html,"og:description")||meta(html,"description")||meta(html,"twitter:description");
  const images:string[]=[];const add=(v:any)=>{if(Array.isArray(v)){v.forEach(add);return}if(v&&typeof v==="object"){add(v.url||v.contentUrl);return}const u=absolute(v,r.url||source);if(u&&!images.includes(u)&&!u.startsWith("data:"))images.push(u)};
  add(schema.image);
  ["og:image","og:image:secure_url","twitter:image","twitter:image:src"].forEach(k=>add(meta(html,k)));
  for(const m of html.matchAll(/<img\b[^>]*(?:src|data-src|data-original|data-lazy-src)\s*=\s*["']([^"']+)["'][^>]*>/gi)){add(m[1]);if(images.length>=30)break}
  for(const m of html.matchAll(/https?:\\?\/\\?\/[^"'<>\s]+?\.(?:jpg|jpeg|png|webp)(?:\?[^"'<>\s]*)?/gi)){add(m[0].replace(/\\\//g,"/"));if(images.length>=30)break}
  return NextResponse.json({ok:true,sourceUrl:r.url||source,title,description,images:images.slice(0,20),imageCount:images.length});
 }catch(e:any){
  const message=e?.name==="AbortError"?"La tienda tardó demasiado en responder.":e?.message||"No pude analizar la URL del producto.";
  return NextResponse.json({error:message},{status:502});
 }
}
