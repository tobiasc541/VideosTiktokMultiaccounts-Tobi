import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../../../lib/auth";
import {supabaseAdmin} from "../../../../../../lib/supabase-admin";
export const maxDuration=60;
const GRAPH="https://graph.instagram.com";
async function graphJson(url:string,init?:RequestInit){const r=await fetch(url,{...init,cache:"no-store"});const j=await r.json().catch(()=>({}));if(!r.ok||j.error)throw new Error(j.error?.message||j.error_message||`Instagram API HTTP ${r.status}`);return j}
export async function POST(req:Request){
 const session=await getCustomerSession();if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
 try{
  const body=await req.json(),accountId=String(body.accountId||""),caption=String(body.caption||"").trim(),images=Array.isArray(body.images)?body.images.map(String).filter(Boolean):[];
  if(!accountId||!caption||images.length<2||images.length>10)return NextResponse.json({error:"El carrusel necesita entre 2 y 10 imágenes y una descripción."},{status:400});
  const db=supabaseAdmin();const q=await db.from("meta_instagram_accounts").select("instagram_user_id,username,access_token").eq("id",accountId).eq("user_id",session.userId).maybeSingle();
  if(q.error)throw new Error(q.error.message);if(!q.data)return NextResponse.json({error:"Cuenta de Instagram no autorizada."},{status:403});
  const urls:string[]=[];
  for(let i=0;i<images.length;i++){
   const m=/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/i.exec(images[i]);if(!m)throw new Error(`La placa ${i+1} no tiene un formato de imagen válido.`);
   const ext=m[1].toLowerCase()==="jpeg"?"jpg":m[1].toLowerCase();const path=`${session.userId}/instagram/carousel/${crypto.randomUUID()}-${i+1}.${ext}`;const bytes=Uint8Array.from(atob(m[2]),c=>c.charCodeAt(0));
   const up=await db.storage.from("scheduled-media").upload(path,bytes,{contentType:ext==="jpg"?"image/jpeg":`image/${ext}`,upsert:false});if(up.error)throw new Error(up.error.message);
   const signed=await db.storage.from("scheduled-media").createSignedUrl(path,3600);if(signed.error||!signed.data?.signedUrl)throw new Error(signed.error?.message||"No se pudo preparar una placa.");urls.push(signed.data.signedUrl);
  }
  const children:string[]=[];for(const imageUrl of urls){const params=new URLSearchParams({image_url:imageUrl,is_carousel_item:"true",access_token:q.data.access_token});const child=await graphJson(`${GRAPH}/${q.data.instagram_user_id}/media?${params}`,{method:"POST"});if(!child.id)throw new Error("Instagram no devolvió un contenedor de imagen.");children.push(String(child.id))}
  const parentParams=new URLSearchParams({media_type:"CAROUSEL",children:children.join(","),caption,access_token:q.data.access_token});const parent=await graphJson(`${GRAPH}/${q.data.instagram_user_id}/media?${parentParams}`,{method:"POST"});if(!parent.id)throw new Error("Instagram no devolvió el contenedor del carrusel.");
  for(let i=0;i<10;i++){const st=await graphJson(`${GRAPH}/${parent.id}?fields=status_code,status&access_token=${encodeURIComponent(q.data.access_token)}`);if(String(st.status_code)==="FINISHED")break;if(["ERROR","EXPIRED"].includes(String(st.status_code)))throw new Error(st.status||"Instagram rechazó el carrusel.");await new Promise(r=>setTimeout(r,1500))}
  const published=await graphJson(`${GRAPH}/${q.data.instagram_user_id}/media_publish?creation_id=${encodeURIComponent(parent.id)}&access_token=${encodeURIComponent(q.data.access_token)}`,{method:"POST"});
  return NextResponse.json({ok:true,mediaId:published.id||null,containerId:parent.id,username:q.data.username});
 }catch(e:any){return NextResponse.json({error:e?.message||"No se pudo publicar el carrusel en Instagram."},{status:500})}
}