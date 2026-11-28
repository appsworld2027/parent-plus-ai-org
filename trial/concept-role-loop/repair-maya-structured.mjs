import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {materializeFiles,sha} from '../nim-per-file/transport.mjs';
import {canonicalHash,rubric} from '../../scripts/frontier-admission.mjs';
import {prepareFrontierCasebook,intakeFrontierArtifact} from '../../scripts/frontier-casebook.mjs';
import {conceptFixture,evaluateConceptArtifact} from '../../scripts/frontier-concept-evaluator.mjs';
import {applyMayaPatch,renderMayaBrief} from './brief-render.mjs';
const root=process.argv[2],role='maya-ai-pm',variant='normal',model='openai/gpt-oss-120b',source='trial/openrouter-exact-review/evidence/maya-normal-hybrid-20261128';
if(!root||existsSync(root))throw Error('new synthetic root required');
mkdirSync(root,{recursive:true,mode:0o700});
const save=(n,v)=>writeFileSync(join(root,n),JSON.stringify(v,null,2)+'\n',{mode:0o600});
const prior=JSON.parse(readFileSync(join(source,'artifact.json'),'utf8')),fixture=conceptFixture(role,variant),fixtureHash=canonicalHash(fixture),scope=canonicalHash({role,variant,fixtureHash,priorArtifactHash:prior.artifactHash,model,version:'bounded-structured-patch-v1'});
const steps=[{path:'patch.json',format:'json_object',maxTokens:900}];
save('preflight.json',{scope,role,variant,fixtureHash,model,steps,priorArtifactHash:prior.artifactHash,paidFallback:false,qualification:false});
try{
 const key=JSON.parse(readFileSync(join(process.env.STUDIO_HOME||join(homedir(),'.ai-org-studio'),'keys.json'),'utf8')).groq?.key;
 if(!key)throw Error('route-unavailable');
 const prompt='Synthetic product manager. Given fictional source evidence and approved scope, propose ONE testable user-value hypothesis within this scope, one validation method with a measurable target, and next action for versioned architecture review before any build. Output ONLY a JSON object with exactly three string keys: hypothesis (18-120 chars), validation (18-180 chars), nextAction (20-160 chars). No imagined observed result. No chat integration, archiving, or external deployment. Sources: '+JSON.stringify(fixture.sources)+' Approved scope: '+JSON.stringify(fixture.approvedScope);
 const ar=await materializeFiles({root:join(root,'author'),requiredPaths:['patch.json'],steps,model,outputBudget:900,scope,buildPrompt:()=>prompt,invoke:async({model,prompt,maxTokens})=>{
 let r;try{r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,messages:[{role:'system',content:'Return only valid JSON. No extra keys or explanation.'},{role:'user',content:prompt}],temperature:0.2,max_completion_tokens:maxTokens,reasoning_effort:'low',stream:false}),signal:AbortSignal.timeout(90000)});}catch{return {failure:'transport-or-timeout'};}
 if(!r.ok)return {httpStatus:r.status,failure:'http-'+r.status};
 const raw=await r.text();let j;try{j=JSON.parse(raw)}catch{return {httpStatus:r.status,failure:'invalid-provider-json'};}
 return {httpStatus:r.status,responseHash:sha(raw),reportedModel:j.model??null,finishReason:j.choices?.[0]?.finish_reason??null,content:j.choices?.[0]?.message?.content,usage:j.usage?Object.fromEntries(['prompt_tokens','completion_tokens','total_tokens'].filter(k=>Number.isSafeInteger(j.usage[k])).map(k=>[k,j.usage[k]])):null};
 }});
 const c=applyMayaPatch(JSON.parse(prior.files.find(f=>f.path==='contract.json').content),JSON.parse(ar.files[0].content));const md=renderMayaBrief(c);
 const book=prepareFrontierCasebook({sourceSha:'cf041948862dd5523d55c527109a02c20169cdff',seed:'issue129-nim-20261128',roleDefinitions:Object.fromEntries(rubric.roles.map(({role:r})=>[r,readFileSync('org/agents/'+r+'.md','utf8')]))}),caseSpec=book.cases.find(x=>x.fixture.role===role&&x.fixture.variant===variant);
const artifact=intakeFrontierArtifact(caseSpec.fixture,{files:[{path:'contract.json',content:JSON.stringify(c,null,2)+'\n'},{path:'founder-brief.md',content:md}]}), grade=evaluateConceptArtifact(role,variant,artifact.files);
 save('artifact.json',artifact);save('grade.json',grade);
 const result={status:grade.screenPassed?'screen-pass-independent-review-required':'screen-failed',role,variant,model,artifactHash:artifact.artifactHash,priorArtifactHash:prior.artifactHash,passed:grade.passed,expected:grade.expected,briefChars:md.length,failed:Object.entries(grade.checks).filter(([,v])=>!v.pass),usage:ar.receipts.map(x=>x.usage),modelOwnedFields:['hypothesis','validation','nextAction'],toolFields:['assumption-id','founder-brief-rendering'],qualification:false,productionReady:false,paidFallback:false};
 save('result.json',result);console.log(JSON.stringify(result));if(!grade.screenPassed)process.exitCode=1;
}catch(e){const result={status:'blocked',role,variant,model,failure:String(e.message).replace(/[^a-zA-Z0-9 :_-]/g,'').slice(0,160),qualification:false};save('result.json',result);console.log(JSON.stringify(result));process.exitCode=1;}
