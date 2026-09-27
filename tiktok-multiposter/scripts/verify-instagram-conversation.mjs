import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const engine=fs.readFileSync(path.join(root,"lib","instagram-conversation-engine.ts"),"utf8");
const webhook=fs.readFileSync(path.join(root,"app","api","meta","instagram","webhook","route.ts"),"utf8");

const reserve=webhook.indexOf("opening_in_progress:true");
const firstDm=webhook.indexOf("if(dm){const j=await ig");

const checks=[
  ["Opening is reserved before first outbound DM",reserve>=0&&firstDm>=0&&reserve<firstDm],
  ["Opening derives short contact name",webhook.includes("const shortName=instagramFirstName(username)")],
  ["Opening first text is the short name",webhook.includes('const dm=firstVoice?.url?shortName:""')],
  ["Opening sends configured audio",webhook.includes('stage==="opening"')&&webhook.includes('sendAttachment(account,{id:fromId},"audio",audioUrl)')],
  ["Inbound webhook remains idempotent",webhook.includes('if(String(claim.error.code)==="23505")return')],
  ["Post-opening engine is minimal",engine.includes("async function generateReply")&&engine.includes("processInstagramConversationEvent")],
  ["Post-opening engine has no resource catalog",!engine.includes("vyral_business_resources")],
  ["Post-opening engine has no resource state machine",!engine.includes("resources_sent")&&!engine.includes("pending_resource_id")&&!engine.includes("send_resource_id")&&!engine.includes("deliverResource")],
  ["Post-opening engine has no intent classifier",!engine.includes("classifyIntent")&&!engine.includes("decideResourceAction")],
];

let failed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(!ok)failed++}
if(failed){console.error(`\nInstagram baseline guard failed: ${failed} invariant(s) broken.`);process.exit(1)}
console.log("\nInstagram baseline guard passed.");
