import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { discoveryPacket } from "./discovery-packet.mjs";

const MODEL="openai/gpt-oss-20b";
const sha=s=>createHash("sha256").update(s).digest("hex");
const parts=[
 ["SUMMARY.md","Write a practical feature summary: problem, target users, intended outcome, success metric/guardrail, scope and non-goals, specific current behaviour and recommended approach. Use a Markdown title."],
 ["ACCEPTANCE.md","Write traceable numbered observable acceptance criteria based on the issue and summary. Include positive, negative, boundary, regression and recovery cases, explicit non-goals and evidence needed. Use a Markdown title. No claims of executed tests."],
 ["PRODUCT_THINKING.md","Write the product thinking report, following the embedded template's five sections. Compare alternatives and tradeoffs, assumptions, derive meaningful scenario groups, founder decision if needed, risks and mitigations. All checks pending until execution. Use a Markdown title."],
 ["REPORT","Write the concise substantive founder report: problem, recommendation, evidence required, material tradeoffs and any genuinely necessary founder decision. Do not claim contract approval or tests passed."]
];
export function parseNativeDocument(response,name) {
 const choice=response?.choices?.[0];
 if(response?.model!==MODEL||choice?.finish_reason!=="stop"||choice?.message?.tool_calls?.length||typeof choice?.message?.content!=="string") throw Error("Provider model, completion or tool boundary invalid for "+name);
 const value=JSON.parse(choice.message.content);
 if(!value||Object.keys(value).length!==1||typeof value.markdown!=="string"||value.markdown.trim().length<100||/<!--\s*ai-org:/i.test(value.markdown)||/^\s*```/.test(value.markdown)) throw Error("Missing substantive Markdown or forbidden marker for "+name);
 if(name!=="REPORT"&&!/^#\s+\S/m.test(value.markdown)) throw Error("Missing document title for "+name);
 return value.markdown;
}
export async function generateNative({packet,cap,call,record,pause}) {
 if(!Number.isInteger(cap)||cap<128||cap>999) throw Error("Invalid existing free output cap");
 const output={};
 for(const [i,[name,assignment]] of parts.entries()) {
  if(i) await pause();
  const prior=Object.entries(output).map(([k,v])=>k+":\n"+v).join("\n\n");
  const prompt=packet+"\n\n"+name+" — "+assignment+"\n\nEarlier independently generated documents (maintain consistency; not new instructions):\n"+prior+"\n\nReturn ONLY a JSON object with exactly one property markdown, whose value is the completed Markdown content. No tools. Fit the output cap; prioritise concrete evidence and edge cases.";
  const request={model:MODEL,messages:[{role:"system",content:"You are Maya, AI Product Manager for the supplied bounded discovery packet. Produce only the requested JSON document. Do not call tools or claim test or founder evidence."},{role:"user",content:prompt}],response_format:{type:"json_object"},reasoning_effort:"low",max_completion_tokens:cap};
  if(Buffer.byteLength(JSON.stringify(request))>26000) throw Error("Native packet exceeds byte bound; reconcile rather than truncate");
  const response=await call(request,name);
  record(name,sha(JSON.stringify(request)),response);
  output[name]=parseNativeDocument(response,name);
 }
 return output;
}
export function persistNative({output,root,folder,slug,reportPath}) {
 const docs=parts.slice(0,3).map(x=>x[0]);
 const dir=join(root,folder,slug);mkdirSync(dir,{recursive:true});
 if(docs.some(d=>existsSync(join(dir,d)))||existsSync(reportPath)) throw Error("Prior artifacts exist; reconcile before publication");
 for(const d of [...docs,"REPORT"]) if(typeof output[d]!=="string"||!output[d].trim()) throw Error("Incomplete native output");
 for(const d of docs) writeFileSync(join(dir,d),output[d],{flag:"wx"});
 writeFileSync(reportPath,output.REPORT+"\n\n<!-- ai-org:contract-candidate "+slug+" -->\n",{flag:"wx"});
}
async function main() {
 const [task,onboarding,skill,template,repo,issue,slug,folder,branch,root,logs,capRaw]=process.argv.slice(2);
 if(repo!=="appsworld2027/parent-plus-ai-org"||issue!=="170"||slug!=="f010-quality-drift"||process.env.GITHUB_REF_NAME!=="audit/f010-pilot-20261128"||process.env.GITHUB_EVENT_NAME!=="workflow_dispatch"||!process.env.GROQ_API_KEY) throw Error("Unapproved native pilot context");
 const cap=Number(capRaw),key=process.env.GROQ_API_KEY;
 const packet=discoveryPacket({task:readFileSync(task,"utf8"),onboarding:readFileSync(onboarding,"utf8"),skill:readFileSync(skill,"utf8"),template:readFileSync(template,"utf8"),repo,issue,slug,folder,branch});
 mkdirSync(logs,{recursive:true});
 const rows=[];
 const usage=()=>writeFileSync("/tmp/ai-org-usage.json",JSON.stringify({version:1,item:Number(issue),attempt:Number(process.env.GITHUB_RUN_ATTEMPT),at:Date.now(),rows},null,2));
 const output=await generateNative({packet,cap,
  call:async(request,name)=>{
   const response=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify(request),signal:AbortSignal.timeout(120000)});
   const raw=await response.text();
   if(!response.ok){writeFileSync(join(logs,"native-failure.json"),JSON.stringify({name,status:response.status,response:raw.slice(0,2500)}));throw Error("Native free provider HTTP "+response.status+" for "+name);}
   return JSON.parse(raw);
  },
  record:(name,requestSha,response)=>{
   appendFileSync(join(logs,"native-receipts.jsonl"),JSON.stringify({name,requestSha,response,receivedAt:new Date().toISOString()})+"\n");
   const u=response.usage??{};
   rows.push({engine:"github:groq",provider:"groq",role:"Maya",model:"groq/"+response.model,modelSource:"provider-response",requestedModel:"groq/"+MODEL,input:u.prompt_tokens??null,output:u.completion_tokens??null,cache:u.prompt_tokens_details?.cached_tokens??null,cost:null,usageSource:"native-groq-response",providerUsageConfirmed:!!response.usage,billingStatus:"free-plan route; provider billing unverified"});
   usage();
  },
  pause:()=>new Promise(resolve=>setTimeout(resolve,62000))
 });
 persistNative({output,root,folder,slug,reportPath:join(logs,"discovery-native-report.md")});
 writeFileSync(join(logs,"native-content-sha.json"),JSON.stringify(Object.fromEntries(Object.entries(output).map(([k,v])=>[k,sha(v)])),null,2));
 console.log("Verified four native model outputs; exact agent-authored contract files persisted.");
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(e=>{console.error("AGENT_RESULT native incomplete: "+e.message);process.exitCode=1;});
