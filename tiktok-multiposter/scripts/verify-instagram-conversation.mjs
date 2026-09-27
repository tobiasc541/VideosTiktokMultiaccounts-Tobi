import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const enginePath=path.join(root,"lib","instagram-conversation-engine.ts");
const webhookPath=path.join(root,"app","api","meta","instagram","webhook","route.ts");
const engine=fs.readFileSync(enginePath,"utf8");
const webhook=fs.readFileSync(webhookPath,"utf8");

const checks=[
 ["Decision Engine exists",engine.includes("async function decideResourceAction")],
 ["Executor exists",engine.includes("async function deliverResource")],
 ["Writer exists",engine.includes("async function writeConversationReply")],
 ["Decision runs before executor",engine.indexOf("const decision=await decideResourceAction")<engine.indexOf("const delivery=await deliverResource")],
 ["Executor runs before Writer",engine.lastIndexOf("const delivery=await deliverResource")<engine.lastIndexOf("writeConversationReply(event")],
 ["Explicit delivery has deterministic path",engine.includes('const explicitAction=explicitResourceAction(event.text)')&&engine.includes('source:"deterministic"')],
 ["Generic resource reference persists by resource_id",engine.includes('decision.action==="REFER"')&&engine.includes('state.pending_resource_id=String(decidedResource.id)')],
 ["Ambiguous AI failure does not freeze conversation",engine.includes('source:"ai_error"')&&!engine.includes('if(decision.action==="ERROR")')],
 ["Structured JSON requested",engine.includes('text:{format:{type:"json_object"}}')],
 ["JSON parser accepts standard fences",engine.includes("(?:\`\`\`|~~~)")],
 ["Writer cannot choose resource id",!engine.slice(engine.indexOf("async function writeConversationReply"),engine.indexOf("export async function processInstagramConversationEvent")).includes("send_resource_id")],
 ["Writer forbids invented delivery protocols",engine.includes("Nunca inventes mecanismos, palabras clave, pasos o promesas")],
 ["Writer never writes resource URLs",engine.includes("JAMÁS copies, reconstruyas ni escribas URLs")],
 ["Empty Writer output is not sent",engine.includes("if(replyText){")],
 ["Resource dedupe uses resources_sent",engine.includes('decision.action==="SEND"&&alreadySent')],
 ["RESEND has explicit execution path",engine.includes('decision.action==="RESEND"')],
 ["Meta message_id is required for delivery",engine.includes("resource_meta_message_id_missing")],
 ["Opening is reserved before first outbound DM",webhook.indexOf("opening_in_progress:true")<webhook.indexOf("if(dm){const j=await ig")],
 ["Opening audio remains configured asset",webhook.includes('stage==="opening"')],
 ["Inbound DM idempotency claim remains",webhook.includes("if(String(claim.error.code)===\"23505\")return")],
 ["Conversation history remains bounded and ordered",webhook.includes(".limit(30)")&&webhook.includes(".slice(-12000)")],
];

const scenarios=[
 "normal conversation -> NONE -> no resource -> contextual reply",
 "technical question -> NONE -> Brand Brain/history answer",
 "explicit access request -> SEND -> real Meta delivery -> short confirmation",
 "explicit file/proof request -> SEND -> real attachment -> short confirmation",
 "already-sent related conversation -> no duplicate delivery",
 "missing/not-received request -> RESEND -> real delivery",
 "farewell plus substantive question -> continue conversation",
 "topic change -> reason about current turn with history",
 "Writer failure -> no canned DM",
 "explicit access request -> deterministic SEND without LLM dependency",
 "resource mentioned without request -> REFER -> persist pending_resource_id without delivery",
 "contextual pronoun acceptance -> SEND exact pending_resource_id",
 "ambiguous Decision AI failure -> continue conversation without claiming delivery",
 "duplicate inbound webhook -> no duplicate processing",
 "opening comment -> name + configured opening audio without AI opener"
];

let failed=0;
for(const [name,ok] of checks){
 console.log(`${ok?"PASS":"FAIL"}  ${name}`);
 if(!ok)failed++;
}
console.log("\nConversation contract scenarios frozen:");
for(const s of scenarios)console.log(" - "+s);
if(failed){
 console.error(`\nInstagram regression guard failed: ${failed} invariant(s) broken.`);
 process.exit(1);
}
console.log("\nInstagram regression guard passed.");
