import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "../../../lib/auth";
import { supabaseAdmin } from "../../../lib/supabase-admin";
import ffmpegPath from "ffmpeg-static";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const runtime = "nodejs";
const execFileAsync = promisify(execFile);
const GRAPH = "https://graph.instagram.com";
const VER = process.env.META_GRAPH_API_VERSION || "v24.0";

async function convertVoiceToM4a(input:Buffer, ext="webm") {
  if (!ffmpegPath) throw new Error("FFmpeg no disponible en el servidor");
  const dir=await mkdtemp(join(tmpdir(),"vyral-voice-"));
  const src=join(dir,`input.${ext.replace(/[^a-z0-9]/gi,"")||"webm"}`),out=join(dir,"voice.m4a");
  try{await writeFile(src,input);await execFileAsync(ffmpegPath,["-y","-i",src,"-vn","-c:a","aac","-b:a","96k","-ar","44100","-ac","1",out],{timeout:25000});return await readFile(out)}finally{await rm(dir,{recursive:true,force:true})}
}
async function sendAudio(account:any,to:string,url:string){
  const r=await fetch(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,{method:"POST",headers:{Authorization:`Bearer ${account.access_token}`,"Content-Type":"application/json"},body:JSON.stringify({recipient:{id:to},message:{attachment:{type:"audio",payload:{url,is_reusable:true}}}}),cache:"no-store"});
  const j=await r.json().catch(()=>({}));if(!r.ok||j.error)throw new Error(j.error?.message||`Instagram HTTP ${r.status}`);return j;
}

export const dynamic = "force-dynamic";

async function inboxSession() {
  const session = await getCustomerSession();
  if (!session) return null;
  const { data } = await supabaseAdmin().auth.admin.getUserById(session.userId);
  const plan = String(data.user?.user_metadata?.plan || session.plan || "").toLowerCase();
  return ["escala","ai"].includes(plan) ? session : null;
}

export async function GET(req: NextRequest) {
  const session = await inboxSession();
  if (!session) return NextResponse.json({ error: "VYRAL Inbox no está habilitado en este plan" }, { status: 403 });
  const db = supabaseAdmin();
  const contact = req.nextUrl.searchParams.get("contact");
  const automation = req.nextUrl.searchParams.get("automation");
  const analytics = req.nextUrl.searchParams.get("analytics");
  const scopedAutomation = automation ? decodeURIComponent(automation).trim() : "";
  if (analytics === "1") {
    const days = Math.min(90, Math.max(1, Number(req.nextUrl.searchParams.get("days") || 30)));
    const since = new Date(Date.now() - days * 86400000).toISOString();
    let leadsQ = db.from("vyral_handoffs").select("id,stage,lead_score,reason,created_at,updated_at").eq("user_id", session.userId).gte("created_at", since); if(scopedAutomation) leadsQ=leadsQ.eq("automation_id",scopedAutomation); const leads=await leadsQ;
    let eventsQ = db.from("vyral_crm_events").select("event_type,created_at").eq("user_id", session.userId).gte("created_at", since); if(scopedAutomation) eventsQ=eventsQ.eq("automation_id",scopedAutomation); const events=await eventsQ;
    const rows = leads.data || [], ev = events.data || [];
    const count = (type:string) => ev.filter((x) => x.event_type === type).length;
    const conversations = rows.length;
    const interested = rows.filter((x) => Number(x.lead_score) >= 60 || ["qualified","won"].includes(String(x.stage))).length;
    const hot = rows.filter((x) => Number(x.lead_score) >= 75).length;
    const whatsapp = count("whatsapp");
    const goals = ev.filter((x) => ["goal_completed","sale","resource_delivered","whatsapp"].includes(String(x.event_type))).length;
    const buckets = 12, span = Math.max(1, days * 86400000 / buckets), now = Date.now();
    const series = Array.from({length:buckets},(_,i)=>{const from=now-(buckets-i)*span,to=from+span;return ev.filter((x)=>{const t=new Date(x.created_at).getTime();return t>=from&&t<to&&["goal_completed","sale","resource_delivered","whatsapp","interested"].includes(String(x.event_type))}).length});
    return NextResponse.json({days,conversations,interested,hot,whatsapp,goals,human:rows.filter((x)=>String(x.reason||"").toLowerCase().includes("persona")).length,conversion:conversations?Math.round(goals/conversations*1000)/10:0,series});
  }
  if (contact) {
    let mq = db.from("vyral_inbox_messages").select("*").eq("user_id", session.userId).eq("contact_id", contact); if(scopedAutomation) mq=mq.eq("automation_id",scopedAutomation); const result = await mq.order("created_at", { ascending: true }).limit(200);
    await db.from("vyral_handoffs").update({ unread: false }).eq("user_id", session.userId).eq("contact_id", contact).eq("status", "open");
    return NextResponse.json({ messages: result.data || [] });
  }
  let hq=db.from("vyral_handoffs").select("*").eq("user_id",session.userId); if(scopedAutomation) hq=hq.eq("automation_id",scopedAutomation); const result=await hq.order("updated_at",{ascending:false}).limit(250);
  const rows = result.data || [];
  return NextResponse.json({
    handoffs: rows,
    stats: {
      total: rows.filter((x) => x.status === "open").length,
      hot: rows.filter((x) => x.status === "open" && Number(x.lead_score) >= 75).length,
      unread: rows.filter((x) => x.status === "open" && x.unread).length,
      human: rows.filter((x) => x.status === "open" && (x.needs_human || String(x.reason || "").toLowerCase().includes("persona"))).length
    }
  });
}

export async function POST(req: NextRequest) {
  const session = await inboxSession();
  if (!session) return NextResponse.json({ error: "VYRAL Inbox no está habilitado en este plan" }, { status: 403 });
  const contentType=req.headers.get("content-type")||"";
  const db = supabaseAdmin();
  if(contentType.includes("multipart/form-data")){
    const form=await req.formData(),action=String(form.get("action")||"");
    if(action!=="audio")return NextResponse.json({error:"Acción inválida"},{status:400});
    const handoffId=String(form.get("handoffId")||""),file=form.get("audio");
    if(!(file instanceof File)||!handoffId)return NextResponse.json({error:"Audio o conversación faltante"},{status:400});
    const handoff=await db.from("vyral_handoffs").select("*").eq("id",handoffId).eq("user_id",session.userId).single();
    if(handoff.error||!handoff.data)return NextResponse.json({error:"Conversación no encontrada"},{status:404});
    const account=await db.from("meta_instagram_accounts").select("instagram_user_id,access_token").eq("id",handoff.data.account_id).eq("user_id",session.userId).single();
    if(account.error||!account.data)return NextResponse.json({error:"Cuenta no disponible"},{status:404});
    try{
      const ext=(file.name.split(".").pop()||file.type.split("/").pop()||"webm").replace("x-m4a","m4a");
      const converted=await convertVoiceToM4a(Buffer.from(await file.arrayBuffer()),ext);
      const path=`${session.userId}/${handoff.data.account_id}/${Date.now()}-${crypto.randomUUID()}.m4a`;
      const upload=await db.storage.from("voice-notes").upload(path,converted,{contentType:"audio/mp4",cacheControl:"3600",upsert:false});
      if(upload.error)throw new Error(upload.error.message);
      const publicUrl=db.storage.from("voice-notes").getPublicUrl(path).data.publicUrl;
      const sent=await sendAudio(account.data,handoff.data.contact_id,publicUrl);
      await db.from("vyral_inbox_messages").insert({user_id:session.userId,account_id:handoff.data.account_id,contact_id:handoff.data.contact_id,contact_username:handoff.data.contact_username,message_id:String(sent.message_id||crypto.randomUUID()),body:"[Audio]",direction:"out",sender_type:"human",automation_id:handoff.data.automation_id,attachment_type:"audio",attachment_url:publicUrl,attachment_meta:{mime:"audio/mp4"}});
      await db.from("vyral_handoffs").update({last_message:"[Audio]",unread:false,updated_at:new Date().toISOString()}).eq("id",handoff.data.id);
      return NextResponse.json({ok:true,messageId:sent.message_id||null});
    }catch(e:any){return NextResponse.json({error:String(e?.message||e)},{status:400})}
  }
  const body = await req.json();

  if (body.action === "event") {
    const handoff = await db.from("vyral_handoffs").select("account_id,contact_id,automation_id").eq("id", String(body.id)).eq("user_id", session.userId).single();
    if (handoff.error || !handoff.data) return NextResponse.json({ error: "Lead no encontrado" }, { status: 404 });
    const allowed = ["whatsapp","interested","payment_intent","sale","goal_completed","resource_delivered"];
    if (!allowed.includes(String(body.eventType))) return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
    const inserted=await db.from("vyral_crm_events").insert({user_id:session.userId,account_id:handoff.data.account_id,contact_id:handoff.data.contact_id,event_type:String(body.eventType),source:"human",automation_id:handoff.data.automation_id});
    if(inserted.error)return NextResponse.json({error:inserted.error.message},{status:500});
    const eventPatch:Record<string,unknown>={updated_at:new Date().toISOString()};
    if(body.eventType==="interested")Object.assign(eventPatch,{stage:"qualified",lead_score:75});
    if(body.eventType==="whatsapp")Object.assign(eventPatch,{stage:"qualified",lead_score:85});
    if(body.eventType==="payment_intent")Object.assign(eventPatch,{stage:"qualified",lead_score:90,priority:"high"});
    if(body.eventType==="sale"||body.eventType==="goal_completed")Object.assign(eventPatch,{stage:"won",lead_score:100,priority:"normal"});
    const updated=await db.from("vyral_handoffs").update(eventPatch).eq("id",String(body.id)).eq("user_id",session.userId).select("*").single();
    if(updated.error)return NextResponse.json({error:updated.error.message},{status:500});
    return NextResponse.json({ok:true,handoff:updated.data,eventType:String(body.eventType)});
  }

  if (body.action === "update") {
    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (["new", "contacted", "qualified", "won", "lost"].includes(body.stage)) patch.stage = body.stage;
    if (["normal", "high", "urgent"].includes(body.priority)) patch.priority = body.priority;
    if (typeof body.notes === "string") patch.notes = body.notes.slice(0, 4000);
    if (typeof body.assignedTo === "string") patch.assigned_to = body.assignedTo.slice(0, 120);
    if (typeof body.aiPaused === "boolean") patch.ai_paused = body.aiPaused;
    if (typeof body.needsHuman === "boolean") patch.needs_human = body.needsHuman;
    if (body.status === "resolved" || body.status === "open") patch.status = body.status;
    const result = await db.from("vyral_handoffs").update(patch).eq("id", String(body.id)).eq("user_id", session.userId).select("*").single();
    return NextResponse.json({ ok: !result.error, handoff: result.data, error: result.error?.message });
  }

  const handoff = await db.from("vyral_handoffs").select("*").eq("id", String(body.handoffId)).eq("user_id", session.userId).single();
  if (handoff.error || !handoff.data) return NextResponse.json({ error: "Conversación no encontrada" }, { status: 404 });
  const account = await db.from("meta_instagram_accounts").select("instagram_user_id,access_token").eq("id", handoff.data.account_id).eq("user_id", session.userId).single();
  if (account.error || !account.data) return NextResponse.json({ error: "Cuenta no disponible" }, { status: 404 });

  const response = await fetch(`https://graph.instagram.com/${process.env.META_GRAPH_API_VERSION || "v24.0"}/${account.data.instagram_user_id}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${account.data.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ recipient: { id: handoff.data.contact_id }, message: { text: String(body.message || "").slice(0, 1800) } })
  });
  const json = await response.json();
  if (!response.ok) return NextResponse.json({ error: json.error?.message || "No se pudo enviar" }, { status: 400 });

  await db.from("vyral_inbox_messages").insert({ user_id: session.userId, account_id: handoff.data.account_id, contact_id: handoff.data.contact_id, contact_username: handoff.data.contact_username, message_id: String(json.message_id || crypto.randomUUID()), body: String(body.message || "").slice(0, 1800), direction: "out", sender_type: "human", automation_id: handoff.data.automation_id });
  await db.from("vyral_handoffs").update({ last_message: String(body.message || "").slice(0, 500), stage: handoff.data.stage === "new" ? "contacted" : handoff.data.stage, unread: false, updated_at: new Date().toISOString() }).eq("id", handoff.data.id);
  return NextResponse.json({ ok: true });
}
