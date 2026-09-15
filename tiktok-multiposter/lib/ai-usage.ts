import {supabaseAdmin} from "./supabase-admin";

type Usage={input_tokens?:number;output_tokens?:number;input_tokens_details?:{cached_tokens?:number}};
const prices:Record<string,{input:number;cached:number;output:number}>={"gpt-5.6-luna":{input:.20,cached:.02,output:1.20},"gpt-4o-mini-transcribe":{input:1.25,cached:1.25,output:5}};
export function aiCost(model:string,usage:Usage){const p=prices[model];if(!p)return 0;const input=Number(usage?.input_tokens||0),cached=Math.min(input,Number(usage?.input_tokens_details?.cached_tokens||0)),output=Number(usage?.output_tokens||0);return ((input-cached)*p.input+cached*p.cached+output*p.output)/1e6}
export async function recordAiUsage(userId:string,feature:string,model:string,usage:Usage){try{const input=Number(usage?.input_tokens||0),cached=Number(usage?.input_tokens_details?.cached_tokens||0),output=Number(usage?.output_tokens||0);await supabaseAdmin().from("ai_usage_events").insert({user_id:userId,feature,model,input_tokens:input,cached_tokens:cached,output_tokens:output,cost_usd:aiCost(model,usage)})}catch(e){console.error("ai_usage_tracking_failed",e)}}
