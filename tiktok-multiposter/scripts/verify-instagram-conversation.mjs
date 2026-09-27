import fs from "node:fs";
import path from "node:path";

const root=process.cwd();
const engine=fs.readFileSync(path.join(root,"lib","instagram-conversation-engine.ts"),"utf8");
const webhook=fs.readFileSync(path.join(root,"app","api","meta","instagram","webhook","route.ts"),"utf8");

const checks=[
 ["Opening reservation remains outside conversation agent",webhook.includes("opening_in_progress:true")],
 ["Opening derives and sends the short contact name after reservation",webhook.includes("const shortName=instagramFirstName(username)")&&webhook.includes('const dm=firstVoice?.url?shortName:""')&&webhook.indexOf("opening_in_progress:true")<webhook.indexOf("if(dm){const j=await ig")],
 ["Opening still sends configured audio",webhook.includes('stage==="opening"')],
 ["Inbound webhook remains idempotent",webhook.includes('if(String(claim.error.code)==="23505")return')],
 ["Recent conversation history remains bounded",webhook.includes(".limit(30)")&&webhook.includes(".slice(-12000)")],
 ["One adaptive agent owns post-opening conversation",engine.includes("async function runConversationAgent")],
 ["Agent receives Brand Brain",engine.includes("BRAND BRAIN (fuente factual privada)")],
 ["Agent receives full recent history",engine.includes("HISTORIAL RECIENTE:")],
 ["Agent receives generic resource catalog",engine.includes("RECURSOS REALES DISPONIBLES:")&&engine.includes("formattedResources(resources)")],
 ["Agent selects exact generic resource_id",engine.includes('"send_resource_id":null')&&engine.includes("resources.some((r:any)=>String(r.id)===candidate)")],
 ["Resource executor is separate from AI",engine.includes("async function deliverResource")],
 ["Physical delivery requires Meta message_id",engine.includes("resource_meta_message_id_missing")],
 ["Resource is marked sent only after Meta confirms",engine.indexOf('if(!messageId) throw new Error("resource_meta_message_id_missing")')<engine.indexOf("state.resources_sent = uniq")],
 ["Duplicate delivery is blocked unless resend requested",engine.includes("(!alreadySent||agent.resend)")],
 ["Agent is forbidden to write resource URLs",engine.includes("No escribas URLs ni copies direcciones web")],
 ["Agent is forbidden to claim confirmed delivery",engine.includes('No afirmes que algo "ya llegó"')],
 ["Semantic repetition is explicitly forbidden",engine.includes("Evitá repetición semántica")],
 ["No REFER state machine remains",!engine.includes('action==="REFER"')&&!engine.includes('"REFER" |')],
 ["No hardcoded Discord behavior in engine",!engine.toLowerCase().includes("discord")],
 ["No trading-specific behavior in engine",!engine.toLowerCase().includes("ifvg")&&!engine.toLowerCase().includes("trading")],
];

let failed=0;
for(const [name,ok] of checks){console.log(`${ok?"PASS":"FAIL"}  ${name}`);if(!ok)failed++}
if(failed){console.error(`\nInstagram regression guard failed: ${failed} invariant(s) broken.`);process.exit(1)}
console.log("\nInstagram regression guard passed.");
