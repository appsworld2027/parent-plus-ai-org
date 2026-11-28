import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';import {homedir} from 'node:os';
import {materializeFiles,sha} from '../nim-per-file/transport.mjs';
import {canonicalHash} from '../../scripts/frontier-admission.mjs';
import {planningFixture} from '../../scripts/frontier-planning-evaluator.mjs';
import {verifyNextActions} from '../openrouter-exact-review/plan-contract/next-actions.mjs';
const [mode,root]=process.argv.slice(2);if(!['preflight','plan'].includes(mode)||!root)throw Error('explicit mode required');
const rawText=readFileSync(new URL('../openrouter-exact-review/evidence/nvidia-ultra-repair2-20261128/author/01.raw.txt',import.meta.url),'utf8');
const expectedRawHash='c1f1438d53c0114a874a3d253f3c885daed53723e1d675a7e1b48e4938070cbe';
if(sha(rawText)!==expectedRawHash)throw Error('source hash mismatch');
const raw=JSON.parse(rawText),fixture=planningFixture('kiran-pjm-a','edge');
const prompt='Create a structured future plan for this fictional task state. Do not claim any execution. Include every non-completed task exactly once in a valid order. Output one JSON object with steps array. Each step has task (actual task id), requires (all incomplete direct prerequisites that MUST COMPLETE before this task, not simply become unblocked; omit already-complete tasks), unblock (actual blocker string if blocked or null otherwise). Put every prerequisite before its dependent. A blocker clearing is not task completion. No invented task, blocker or execution. Existing author handover: '+JSON.stringify(raw.handover)+'\nTrusted fixture:'+JSON.stringify(fixture);
const model='nvidia/nemotron-3-ultra-550b-a55b',maxTokens=2600;
const info={model,sourceRawHash:expectedRawHash,scope:'synthetic-next-actions-contract-only',promptChars:prompt.length,outputBudget:maxTokens,paidFallback:false,qualification:false};
mkdirSync(root,{recursive:true,mode:0o700});const save=(n,v)=>writeFileSync(join(root,n),JSON.stringify(v,null,2)+'\n',{mode:0o600});
save('preflight.json',info);if(mode==='preflight'){console.log(JSON.stringify(info));process.exit(0);}
const report={...info,status:'blocked'};
try{
 const key=JSON.parse(readFileSync(join(process.env.STUDIO_HOME||join(homedir(),'.ai-org-studio'),'keys.json'),'utf8')).nvidia?.key;if(!key)throw Error('credential unavailable');
 const ep='https://integrate.api.nvidia.com/v1',cat=await fetch(ep+'/models',{headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!cat.ok||!(await cat.json()).data?.some(x=>x.id===model))throw Error('catalog unavailable');
 async function invoke({model:m,prompt,maxTokens:n}){
  if(m!==model||n!==maxTokens)throw Error('route mismatch');
  let r;try{r=await fetch(ep+'/chat/completions',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:m,messages:[{role:'system',content:'Return one JSON object representing a future plan, no execution.'},{role:'user',content:prompt}],temperature:1,top_p:0.95,max_tokens:n,stream:false}),signal:AbortSignal.timeout(120000)});}catch{return {failure:'transport-or-timeout'};}
  if(!r.ok)return {httpStatus:r.status,failure:'http-'+r.status};
  const body=await r.text();let x;try{x=JSON.parse(body)}catch{return {httpStatus:r.status,failure:'invalid-provider-json'};}
  return {httpStatus:r.status,responseHash:sha(body),reportedModel:x.model??null,finishReason:x.choices?.[0]?.finish_reason??null,content:x.choices?.[0]?.message?.content,usage:x.usage?Object.fromEntries(['prompt_tokens','completion_tokens','total_tokens'].filter(k=>Number.isSafeInteger(x.usage[k])).map(k=>[k,x.usage[k]])):null};
 }
 const result=await materializeFiles({root:join(root,'author'),requiredPaths:['next-actions.json'],steps:[{path:'next-actions.json',format:'json_object',maxTokens}],model,outputBudget:maxTokens,scope:canonicalHash(info),buildPrompt:()=>prompt,invoke});
 const plan=JSON.parse(result.files[0].content);if(Object.keys(plan).join()!=='steps')throw Error('unexpected plan fields');
 const grade=verifyNextActions({fixture,steps:plan.steps});save('plan.json',plan);save('grade.json',grade);
 report.status=grade.valid?'next-action-plan-screen-pass':'next-action-plan-screen-fail';report.grade=grade;
}catch(e){report.failure=String(e.message).replace(/[^a-zA-Z0-9 :_-]/g,'').slice(0,160);}
const rp=join(root,'author/01.receipt.json');if(existsSync(rp)){const r=JSON.parse(readFileSync(rp,'utf8'));report.receipt={status:r.status,model:r.reportedModel,finish:r.finishReason,usage:r.usage,rawHash:r.rawHash,failure:r.failure};}
save('report.json',report);console.log(JSON.stringify(report));if(report.status!=='next-action-plan-screen-pass')process.exitCode=1;
