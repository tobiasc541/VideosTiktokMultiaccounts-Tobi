import { supabaseAdmin } from "./supabase-admin";

const GRAPH = "https://graph.instagram.com";
const VER = process.env.META_GRAPH_API_VERSION || "v24.0";

export type ConversationOrigin = "post_comment" | "story_reply" | "direct_dm";

export type InstagramConversationEvent = {
  account: any;
  automation: any;
  contactId: string;
  threadId?: string | null;
  messageId: string;
  text: string;
  origin?: ConversationOrigin;
  contextPayload?: Record<string, any>;
  history?: string;
  firstName?: string;
  source: "webhook" | "polling";
};

async function metaSend(account:any,recipientId:string,text:string){
  const r=await fetch(`${GRAPH}/${VER}/${encodeURIComponent(account.instagram_user_id)}/messages`,{
    method:"POST",
    headers:{Authorization:`Bearer ${account.access_token}`,"Content-Type":"application/json"},
    body:JSON.stringify({recipient:{id:recipientId},message:{text}}),
    cache:"no-store"
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok||j.error||!j.message_id)throw new Error(j.error?.message||`Instagram send failed HTTP ${r.status}`);
  return j;
}

function responseText(j:any){
  if(j?.output_text)return String(j.output_text).trim();
  let out="";
  for(const item of j?.output||[])for(const part of item?.content||[])if(part?.type==="output_text")out+=part.text||"";
  return out.trim();
}

async function generateReply(event:InstagramConversationEvent,profile:any){
  const key=process.env.VYRAL_CREATOR_PRODUCTION;
  if(!key)throw new Error("openai_key_missing");

  const prompt=`Respondé el mensaje actual como si fueras la persona detrás de este negocio.

NEGOCIO:
${JSON.stringify(profile||{})}

CONTEXTO:
${JSON.stringify(event.contextPayload||{})}

CONVERSACIÓN:
${event.history||""}

MENSAJE ACTUAL:
${event.text}`;

  const r=await fetch("https://api.openai.com/v1/responses",{
    method:"POST",
    headers:{Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({model:"gpt-5.6-luna",input:prompt,max_output_tokens:700}),
    signal:AbortSignal.timeout(15000)
  });
  const j=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(j?.error?.message||`OpenAI HTTP ${r.status}`);
  const text=responseText(j);
  if(!text)throw new Error("openai_empty_output");
  return text;
}

export async function processInstagramConversationEvent(event:InstagramConversationEvent){
  const db=supabaseAdmin();
  const automationId=String(event.automation?.id||"");
  const profileQ=await db.from("vyral_bussines_profile").select("*").eq("user_id",String(event.account.user_id)).maybeSingle();
  const reply=await generateReply(event,profileQ.data||{});
  const sent=await metaSend(event.account,event.contactId,reply);
  const textMessageId=String(sent.message_id||"");

  await db.from("vyral_inbox_messages").insert({
    user_id:event.account.user_id,
    account_id:event.account.id,
    platform:"instagram",
    contact_id:event.contactId,
    message_id:textMessageId,
    body:reply,
    direction:"out",
    sender_type:"ai",
    automation_id:automationId
  });

  return{
    success:true,
    attachmentConfirmed:false,
    messageId:textMessageId,
    textMessageId,
    resourceMessageId:"",
    selectedResourceId:null,
    resourceAction:"NONE",
    deliveryStatus:"none"
  };
}
