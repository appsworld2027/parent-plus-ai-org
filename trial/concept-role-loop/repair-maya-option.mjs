import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {materializeFiles,sha} from '../nim-per-file/transport.mjs';
import {canonicalHash,rubric} from '../../scripts/frontier-admission.mjs';
import {prepareFrontierCasebook,intakeFrontierArtifact} from '../../scripts/frontier-casebook.mjs';
import {conceptFixture,evaluateConceptArtifact} from '../../scripts/frontier-concept-evaluator.mjs';
import {renderMayaBrief} from './brief-render.mjs';
const [source,review,root]=process.argv.slice(2),role='maya-ai-pm',variant='edge',model='nvidia/nemotron-3-ultra-550b-a55b';
if(!source||!review||!root||existsSync(root))throw Error('explicit new evidence paths required');
const read=(d,n)=>JSON.parse(readFileSync(join(d,n),'utf8')),prior=read(source,'artifact.json'),original=read(source,'result.json'),reviewed=read(review,'result.json'),decision=read(review,'decision.json'),fixture=conceptFixture(role,variant),fixtureHash=canonicalHash(fixture);
if(!reviewed.valid||reviewed.artifactHash!==prior.artifactHash||decision.verdict!=='REJECT'||decision.checks.filter(x=>!x.pass).map(x=>x.id).join(',')!=='R3'||original.passed!==12)throw Error('exact single defect review binding invalid');
const c=JSON.parse(prior.files.find(f=>f.path==='contract.json').content),before=c.options.find(o=>o.id==='improve-chat').reason,scope=canonicalHash({fixtureHash,model,priorArtifactHash:prior.artifactHash,reviewHash:canonicalHash(decision),version:'single-option-repair-v1'});
mkdirSync(root,{recursive:true,mode:0o700});const save=(n,v)=>writeFileSync(join(root,n),JSON.stringify(v,null,2)+'\n',{mode:0o600});
save('preflight.json',{scope,role,variant,model,priorArtifactHash:prior.artifactHash,reviewHash:canonicalHash(decision),qualification:false,paidFallback:false});
try{
 const key=JSON.parse(readFileSync(join(process.env.STUDIO_HOME||join(homedir(),'.ai-org-studio'),'keys.json'),'utf8')).nvidia?.key;if(!key)throw Error('route unavailable');
 const prompt='Repair one synthetic PM alternative rationale only. CHAT IMPROVEMENT IS A HYPOTHETICAL ALTERNATIVE, NOT NECESSARILY PUBLIC RELEASE OR CROSS-TENANT. Compare how improving chat would address finding reminders versus the approved shared-board version-control goal, based on sources. Do not invent risks or outcomes. Return only JSON object with exactly one key reason, 25–150 characters, one concise evidence-grounded sentence. Sources '+JSON.stringify(fixture.sources)+' Exact rejected rationale '+JSON.stringify(before)+' Reviewer defect '+decision.checks.find(x=>x.id==='R3').reason;
 const ar=await materializeFiles({root:join(root,'author'),requiredPaths:['option.json'],steps:[{path:'option.json',format:'json_object',maxTokens:1600}],model,outputBudget:1600,scope,buildPrompt:()=>prompt,invoke:async({model,prompt,maxTokens})=>{
 let r;try{r=await fetch('https://integrate.api.nvidia.com/v1/chat/completions',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:'Output only the requested JSON object.'},{role:'user',content:prompt}],temperature:1,top_p:0.95,max_tokens:maxTokens,stream:false}),signal:AbortSignal.timeout(120000)});}catch{return {failure:'transport-or-timeout'};}
 if(!r.ok)return {httpStatus:r.status,failure:'http-'+r.status};const raw=await r.text();let j;try{j=JSON.parse(raw)}catch{return {httpStatus:r.status,failure:'invalid-provider-json'};}
 return {httpStatus:r.status,responseHash:sha(raw),reportedModel:j.model??null,finishReason:j.choices?.[0]?.finish_reason??null,content:j.choices?.[0]?.message?.content,usage:j.usage?Object.fromEntries(['prompt_tokens','completion_tokens','total_tokens'].filter(k=>Number.isSafeInteger(j.usage[k])).map(k=>[k,j.usage[k]])):null};
 }});
 const p=JSON.parse(ar.files[0].content);if(Object.keys(p).join(',')!=='reason'||typeof p.reason!=='string'||p.reason.length<25||p.reason.length>150||p.reason===before||/public.release|cross.tenant/i.test(p.reason))throw Error('bounded rationale patch invalid');
 c.options=c.options.map(o=>o.id==='improve-chat'?{...o,reason:p.reason}:o);
 const book=prepareFrontierCasebook({sourceSha:'cf041948862dd5523d55c527109a02c20169cdff',seed:'issue129-nim-20261128',roleDefinitions:Object.fromEntries(rubric.roles.map(({role:r})=>[r,readFileSync('org/agents/'+r+'.md','utf8')]))}),caseSpec=book.cases.find(x=>x.fixture.role===role&&x.fixture.variant===variant),md=renderMayaBrief(c),artifact=intakeFrontierArtifact(caseSpec.fixture,{files:[{path:'contract.json',content:JSON.stringify(c,null,2)+'\n'},{path:'founder-brief.md',content:md}]}),grade=evaluateConceptArtifact(role,variant,artifact.files);
 save('artifact.json',artifact);save('grade.json',grade);const result={status:grade.screenPassed?'screen-pass-independent-review-required':'screen-failed',role,variant,model,validationModel:original.validationModel,artifactHash:artifact.artifactHash,priorArtifactHash:prior.artifactHash,passed:grade.passed,expected:grade.expected,briefChars:md.length,repairedField:'options.improve-chat.reason',usage:ar.receipts[0].usage,qualification:false,paidFallback:false};save('result.json',result);console.log(JSON.stringify(result));if(!grade.screenPassed)process.exitCode=1;
}catch(e){const result={status:'blocked',role,variant,model,failure:String(e.message).replace(/[^a-zA-Z0-9 :_-]/g,'').slice(0,160),qualification:false};save('result.json',result);console.log(JSON.stringify(result));process.exitCode=1;}
