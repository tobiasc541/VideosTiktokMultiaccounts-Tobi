import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabase-admin";
import { getCustomerSession } from "../../../../../lib/auth";
import ffmpegStatic from "ffmpeg-static";
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";

export const runtime = "nodejs";
export const maxDuration = 60;
const GRAPH="https://graph.instagram.com";
const VER=process.env.META_GRAPH_API_VERSION||"v24.0";

function resolveFfmpeg(){
  const candidates=[ffmpegStatic,process.env.FFMPEG_PATH,"/usr/bin/ffmpeg","/usr/local/bin/ffmpeg"].filter(Boolean) as string[];
  return candidates[0]||"ffmpeg";
}
function runFfmpeg(input:string,output:string){
  return new Promise<void>((resolve,reject)=>{
    const bin=resolveFfmpeg();
    const p=spawn(bin,["-y","-i",input,"-vn","-ac","1","-ar","48000","-c:a","aac","-b:a","128k","-movflags","+faststart",output]);
    let err=""; p.stderr.on("data",d=>err+=String(d));
    p.on("error",e=>reject(new Error(`No se pudo ejecutar FFmpeg (${bin}): ${e.message}`))); p.on("close",code=>code===0?resolve():reject(new Error(`ffmpeg exited ${code}: ${err.slice(-1200)}`)));
  });
}

export async function POST(req:Request){
  const session=await getCustomerSession();
  if(!session)return NextResponse.json({error:"No autorizado"},{status:401});
  const body=await req.json().catch(()=>({}));
  const automationId=String(body.automationId||""),storagePath=String(body.storagePath||"");
  if(!automationId||!storagePath)return NextResponse.json({error:"automationId y storagePath son obligatorios"},{status:400});

  const db=supabaseAdmin();
  const q=await db.from("meta_instagram_accounts").select("id,instagram_user_id,access_token,user_id").eq("user_id",session.userId).limit(1).maybeSingle();
  if(q.error||!q.data)return NextResponse.json({error:"Cuenta de Instagram no encontrada"},{status:404});
  const last=await db.from("instagram_automation_runs").select("commenter_id").eq("user_id",session.userId).eq("automation_id",automationId).not("commenter_id","is",null).order("created_at",{ascending:false}).limit(1).maybeSingle();
  const recipient=String(last.data?.commenter_id||"");
  if(!recipient)return NextResponse.json({error:"Todavía no hay una conversación de Instagram para probar este agente."},{status:400});

  const dl=await db.storage.from("scheduled-media").download(storagePath);
  if(dl.error||!dl.data)return NextResponse.json({error:"No se pudo leer el audio",detail:dl.error?.message},{status:400});

  const id=crypto.randomUUID(),input=path.join(os.tmpdir(),`${id}.webm`),output=path.join(os.tmpdir(),`${id}.m4a`);
  try{
    await fs.writeFile(input,Buffer.from(await dl.data.arrayBuffer()));
    await runFfmpeg(input,output);
    const bytes=await fs.readFile(output);
    const normalized=`automation-audio-normalized/${q.data.user_id}/${id}.m4a`;
    const up=await db.storage.from("scheduled-media").upload(normalized,bytes,{contentType:"audio/mp4",upsert:false});
    if(up.error)throw new Error(up.error.message);
    const signed=await db.storage.from("scheduled-media").createSignedUrl(normalized,600);
    if(signed.error||!signed.data?.signedUrl)throw new Error(signed.error?.message||"No signed URL");

    const r=await fetch(`${GRAPH}/${VER}/${encodeURIComponent(q.data.instagram_user_id)}/messages`,{
      method:"POST",headers:{Authorization:`Bearer ${q.data.access_token}`,"Content-Type":"application/json"},
      body:JSON.stringify({recipient:{id:recipient},message:{attachment:{type:"audio",payload:{url:signed.data.signedUrl}}}}),cache:"no-store",signal:AbortSignal.timeout(15000)
    });
    const raw=await r.text(); let meta:any={}; try{meta=JSON.parse(raw)}catch{meta={raw}}
    return NextResponse.json({ok:r.ok,httpStatus:r.status,format:"m4a/aac",storagePath:normalized,meta},{status:r.ok?200:502});
  }catch(e:any){
    return NextResponse.json({ok:false,error:String(e?.message||e)},{status:500});
  }finally{
    await Promise.allSettled([fs.unlink(input),fs.unlink(output)]);
  }
}
