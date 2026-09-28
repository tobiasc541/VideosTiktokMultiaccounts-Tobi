import fs from "node:fs";
import path from "node:path";
const root=process.cwd();
const engine=fs.readFileSync(path.join(root,"lib","instagram-conversation-engine.ts"),"utf8");
const webhook=fs.readFileSync(path.join(root,"app","api","meta","instagram","webhook","route.ts"),"utf8");
const reserve=webhook.indexOf("opening_in_progress:true"),firstDm=webhook.indexOf("if(dm){const j=await ig");
const checks=[
 ["Opening reserved before first DM",reserve>=0&&firstDm>=0&&reserve<firstDm],
 ["Opening sends short name",webhook.includes("const shortName=instagramFirstName(username)")&&webhook.includes('const dm=firstVoice?.url?shortName:""')],
 ["Opening sends configured audio",webhook.includes('sendAttachment(account,{id:fromId},"audio",audioUrl)')],
 ["Inbound webhook idempotent",webhook.includes('if(String(claim.error.code)==="23505")return')],
 ["Conversation remains one minimal agent",engine.includes("async function generateReply")],
 ["Real resource library is available",engine.includes('from("vyral_business_resources")')],
 ["Agent can select exact resource id",engine.includes('"send_resource_id":null')&&engine.includes("resources.some((x:any)=>String(x.id)===candidate)")],
 ["Selected resource is physically sent",engine.includes("async function sendResource")&&engine.includes("if(selected)")],
 ["No legacy pending state",!engine.includes("pending_resource_id")],
 ["Sent-resource memory only guards duplicate delivery",engine.includes('.select("id,resources_sent")')&&engine.includes("sentResourceIds.includes(String(candidate.id))")&&engine.includes("!alreadySent||reply.resendResource===true")&&engine.includes("resources_sent:nextSent")&&!engine.includes("pending_resource_id")],
 ["No intent classifier or REFER engine",!engine.includes("classifyIntent")&&!engine.includes("decideResourceAction")&&!engine.includes('action==="REFER"')],
];
let failed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(!ok)failed++}
if(failed){console.error(`\nInstagram minimal-resource guard failed: ${failed} invariant(s) broken.`);process.exit(1)}
console.log("\nInstagram minimal-resource guard passed.");
