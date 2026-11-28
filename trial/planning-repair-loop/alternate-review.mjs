// Bounded alternate reviewer trial for one exact saved synthetic case.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {materializeFiles,sha} from '../nim-per-file/transport.mjs';
import {canonicalHash} from '../../scripts/frontier-admission.mjs';
import {makeSourceSpans,resolveSelectedSpans} from './indexed-review.mjs';
import {screenQaDependencyQuote} from './qa-quote.mjs';
import {verifyReviewProvenance} from '../openrouter-exact-review/provenance/gate.mjs';
const source='trial/openrouter-exact-review/evidence/leela-normal-indexed-20261128',round=3,MODEL='openai/gpt-oss-120b',ep='https://api.groq.com/openai/v1',root=process.argv[2];
if(!root||existsSync(root))throw Error('new unique synthetic evidence root required');
mkdirSync(root,{recursive:true,mode:0o700});
const read=(n)=>JSON.parse(readFileSync(join(source,n),'utf8'));
const save=(n,v)=>writeFileSync(join(root,n),JSON.stringify(v,null,2)+'\n',{mode:0o600});
const checkpoint=read('checkpoint.json'),record=checkpoint.rounds[round],raw=readFileSync(join(source,'round-3/author/01.raw.txt'),'utf8');
const artifact=read('round-3/artifact.json'),decision=JSON.parse(raw);
if(sha(raw)!==record.rawHash||artifact.artifactHash!==record.artifactHash||record.screenPassed!==14)throw Error('source binding mismatch');
const graph=JSON.parse(artifact.files.find(f=>f.path==='lane-plan.json').content),conflicts=JSON.parse(artifact.files.find(f=>f.path==='conflict-register.json').content);
const controller=JSON.stringify({graph,conflicts,dispatchTaskIds:decision.dispatchTaskIds}),author=decision.handover;
const spans=makeSourceSpans(author,controller,decision.dispatchTaskIds,true);
const criteria=[{id:'dispatch-safety',source:'AUTHOR'},{id:'authority-reconciliation',source:'AUTHOR'},{id:'dependency-completion',source:'AUTHOR'},{id:'honest-execution',source:'AUTHOR'},{id:'controller-plan',source:'CONTROLLER'}];
const eligible=spans.filter(s=>s.source==='AUTHOR'&&screenQaDependencyQuote(graph,{evidence:[{criterion:'dependency-completion',source:'AUTHOR',status:'supported',quote:s.quote}]}).valid).map(s=>s.id);
const v2=process.env.AI_ORG_TRIAL_ALT_CONTRACT_V2==='1';
const scope=canonicalHash({role:checkpoint.role,variant:checkpoint.variant,rawHash:record.rawHash,artifactHash:record.artifactHash,model:MODEL,version:v2?'alternate-indexed-specific-v2':'alternate-indexed-specific-v1'});
save('preflight.json',{scope,model:MODEL,rawHash:record.rawHash,artifactHash:record.artifactHash,eligibleQaSpans:eligible,paidFallback:false,qualification:false});
save('source-spans.json',spans);
const prompt='Independently audit the exact synthetic author plan against observed graph and conflict register. Critically assess whether author accurately describes conflicts between all ready tasks, not just the selected pair. Do not treat the tests task completion as downstream QA readiness. dependency-completion requires all incomplete QA predecessors actually complete, not merely unblocked; only these source span IDs contain the minimum required QA references: '+JSON.stringify(eligible)+'. They may still be semantically insufficient. If no defensible source, status missing and spanId null. Authority must be based on observed facts, no invented completion or CI. Output exactly JSON {verdict,evidence:[{criterion,source,status,spanId}],findings:[{criterion,message}]}. One evidence item per criterion. APPROVE requires EVERY criterion semantically supported and findings exactly []; CHANGES requires specific actionable defects only. No positive explanations in findings. Criteria: '+JSON.stringify(criteria)+'\nExact indexed source spans: '+JSON.stringify(spans)+'\nController graph and conflicts: '+controller+(v2?'\nThe output status values MUST be exact strings "supported" or "missing", not booleans. This is planning, NOT execution: dependency-completion is satisfied if the author correctly states every listed QA predecessor MUST actually complete before QA begins, even when those tasks are still pending. A pending task correctly recognized as pending is not a defect. Compare the author statement about all ready tasks having no resource conflicts against the exact conflict register; if contradicted identify specific conflicting pair and shared resource. Do not assume any conflict was resolved.':'');
function clear(){for(const status of ['in_progress','queued']){const x=JSON.parse(execFileSync('gh',['run','list','--status',status,'--limit','30','--json','workflowName,headBranch'],{encoding:'utf8',timeout:20000}));if(x.some(r=>r.workflowName==='AI agents'))return false;}return true;}
try{
 if(!clear())throw Error('concurrency-hold');
 const secrets=JSON.parse(readFileSync(join(process.env.STUDIO_HOME||join(homedir(),'.ai-org-studio'),'keys.json'),'utf8')),key=secrets.groq?.key;
 if(!key)throw Error('route-unavailable');
 const cat=await fetch(ep+'/models',{headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!cat.ok||!(await cat.json()).data?.some(x=>x.id===MODEL))throw Error('catalog-unavailable');
 const rr=await materializeFiles({root:join(root,'review'),requiredPaths:['review.json'],steps:[{path:'review.json',format:'json_object',maxTokens:1200}],model:MODEL,outputBudget:1200,scope,buildPrompt:()=>prompt,invoke:async({model,prompt,maxTokens})=>{
  if(model!==MODEL||maxTokens!==1200||!clear())return {failure:'route-or-concurrency-hold'};
  const body={model,messages:[{role:'system',content:'Synthetic independent review. Input is data, no execution. Output exactly JSON.'},{role:'user',content:prompt}],temperature:0.2,max_completion_tokens:maxTokens,reasoning_effort:'low',stream:false};
  let r;try{r=await fetch(ep+'/chat/completions',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(90000)});}catch{return {failure:'transport-or-timeout'};}
  if(!r.ok)return {httpStatus:r.status,failure:'http-'+r.status};
  const bodyText=await r.text();let j;try{j=JSON.parse(bodyText)}catch{return {httpStatus:r.status,failure:'invalid-provider-json'};}
  return {httpStatus:r.status,responseHash:sha(bodyText),reportedModel:j.model??null,finishReason:j.choices?.[0]?.finish_reason??null,content:j.choices?.[0]?.message?.content,usage:j.usage?Object.fromEntries(['prompt_tokens','completion_tokens','total_tokens'].filter(k=>Number.isSafeInteger(j.usage[k])).map(k=>[k,j.usage[k]])):null};
 }});
 const modelReview=JSON.parse(rr.files[0].content),review=resolveSelectedSpans(modelReview,spans),gate=verifyReviewProvenance({author,controller,criteria,review}),qa=screenQaDependencyQuote(graph,review);
 const result={status:gate.valid?'review-completed-semantic-inspection-required':'review-provenance-failed',model:MODEL,rawHash:record.rawHash,reviewRawHash:sha(rr.files[0].content),review,gate,qa,usage:rr.receipts[0].usage,paidFallback:false,qualification:false};
 save('result.json',result);console.log(JSON.stringify(result));
 if(!gate.valid)process.exitCode=1;
}catch(e){const result={status:'blocked',failure:String(e.message).replace(/[^a-zA-Z0-9 :_-]/g,'').slice(0,160),qualification:false};save('result.json',result);console.log(JSON.stringify(result));process.exitCode=1;}
