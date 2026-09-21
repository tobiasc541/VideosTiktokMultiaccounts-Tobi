import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../../lib/auth";
import {supabaseAdmin} from "../../../../../lib/supabase-admin";

export const maxDuration=60;
const GRAPH="https://graph.instagram.com";
const BUCKET="scheduled-media";

async function graphJson(url:string,init?:RequestInit){
 const response=await fetch(url,{...init,cache:"no-store"});
 const json=await response.json().catch(()=>({}));
 if(!response.ok||json.error)throw new Error(json.error?.message||json.error_message||`Instagram API HTTP ${response.status}`);
 return json;
}

async function waitForContainer(id:string,token:string){
 for(let attempt=0;attempt<20;attempt++){
  const status=await graphJson(`${GRAPH}/${id}?fields=status_code,status&access_token=${encodeURIComponent(token)}`);
  const code=String(status.status_code||"");
  if(code==="FINISHED")return;
  if(["ERROR","EXPIRED"].includes(code))throw new Error(status.status||"Instagram rechazó una imagen del carrusel.");
  await new Promise(resolve=>setTimeout(resolve,1500));
 }
 throw new Error("Instagram todavía está procesando una imagen. Volvé a intentar en unos segundos.");
}

export async function POST(req:Request){
 const session=await getCustomerSession();
 if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
 try{
  const body=await req.json();
  const accountId=String(body.accountId||"");
  const caption=String(body.caption||"").trim();
  const storagePaths=Array.isArray(body.storagePaths)?body.storagePaths.map(String).filter(Boolean):[];
  if(!accountId||!caption||storagePaths.length<2||storagePaths.length>10)return NextResponse.json({error:"El carrusel necesita entre 2 y 10 imágenes y una descripción."},{status:400});
  const prefix=`${session.userId}/creator-ai/`;
  if(storagePaths.some((path:string)=>!path.startsWith(prefix)))return NextResponse.json({error:"Una o más placas no pertenecen a tu usuario."},{status:403});

  const db=supabaseAdmin();
  const account=await db.from("meta_instagram_accounts").select("instagram_user_id,username,access_token").eq("id",accountId).eq("user_id",session.userId).maybeSingle();
  if(account.error)throw new Error(account.error.message);
  if(!account.data)return NextResponse.json({error:"Cuenta de Instagram no autorizada."},{status:403});

  const urls:string[]=[];
  for(const path of storagePaths){
   const signed=await db.storage.from(BUCKET).createSignedUrl(path,3600);
   if(signed.error||!signed.data?.signedUrl)throw new Error(signed.error?.message||"No se pudo preparar una placa.");
   urls.push(signed.data.signedUrl);
  }

  const children:string[]=[];
  for(const imageUrl of urls){
   const params=new URLSearchParams({image_url:imageUrl,is_carousel_item:"true",access_token:account.data.access_token});
   const child=await graphJson(`${GRAPH}/${account.data.instagram_user_id}/media?${params}`,{method:"POST"});
   if(!child.id)throw new Error("Instagram no devolvió un contenedor de imagen.");
   const childId=String(child.id);
   await waitForContainer(childId,account.data.access_token);
   children.push(childId);
  }

  const parentParams=new URLSearchParams({media_type:"CAROUSEL",children:children.join(","),caption,access_token:account.data.access_token});
  const parent=await graphJson(`${GRAPH}/${account.data.instagram_user_id}/media?${parentParams}`,{method:"POST"});
  if(!parent.id)throw new Error("Instagram no devolvió el contenedor del carrusel.");
  await waitForContainer(String(parent.id),account.data.access_token);

  const published=await graphJson(`${GRAPH}/${account.data.instagram_user_id}/media_publish?creation_id=${encodeURIComponent(parent.id)}&access_token=${encodeURIComponent(account.data.access_token)}`,{method:"POST"});
  return NextResponse.json({ok:true,mediaId:published.id||null,containerId:parent.id,username:account.data.username});
 }catch(e:any){
  return NextResponse.json({error:e?.message||"No se pudo publicar el carrusel en Instagram."},{status:500});
 }
}
