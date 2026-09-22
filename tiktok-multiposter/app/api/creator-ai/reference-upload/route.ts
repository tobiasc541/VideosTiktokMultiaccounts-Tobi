import crypto from "crypto";
import {NextResponse} from "next/server";
import {getCustomerSession} from "../../../../lib/auth";
import {supabaseAdmin} from "../../../../lib/supabase-admin";

const BUCKET="scheduled-media";
const ALLOWED=new Set(["image/png","image/jpeg","image/webp"]);
const MAX=8*1024*1024;
function ext(mime:string){return mime==="image/jpeg"?"jpg":mime.split("/")[1]||"img"}

export async function POST(req:Request){
 const session=await getCustomerSession();
 if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
 try{
  const body=await req.json();
  const mimeType=String(body.mimeType||"");
  const fileSize=Number(body.fileSize||0);
  const kind=body.kind==="logo"?"logo":"person";
  if(!ALLOWED.has(mimeType))return NextResponse.json({error:"Usá PNG, JPG o WebP."},{status:400});
  if(!Number.isFinite(fileSize)||fileSize<=0||fileSize>MAX)return NextResponse.json({error:"Cada imagen puede pesar hasta 8 MB."},{status:400});
  const path=`${session.userId}/creator-ai/references/${crypto.randomUUID()}-${kind}.${ext(mimeType)}`;
  const signed=await supabaseAdmin().storage.from(BUCKET).createSignedUploadUrl(path);
  if(signed.error||!signed.data)throw new Error(signed.error?.message||"No se pudo preparar la referencia.");
  return NextResponse.json({path,token:signed.data.token,signedUrl:signed.data.signedUrl});
 }catch(e:any){return NextResponse.json({error:e?.message||"No se pudo preparar la referencia."},{status:500})}
}
