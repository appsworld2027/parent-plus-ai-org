// Product concept model-author screen; exact locked evaluator, isolated synthetic only.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {join} from 'node:path';
import {homedir} from 'node:os';
import {materializeFiles,sha} from '../nim-per-file/transport.mjs';
import {canonicalHash,rubric} from '../../scripts/frontier-admission.mjs';
import {prepareFrontierCasebook,intakeFrontierArtifact} from '../../scripts/frontier-casebook.mjs';
import {conceptFixture,evaluateConceptArtifact} from '../../scripts/frontier-concept-evaluator.mjs';
const [role,variant,root]=process.argv.slice(2),sourceSha='cf041948862dd5523d55c527109a02c20169cdff',MODEL='nvidia/nemotron-3-ultra-550b-a55b',ep='https://integrate.api.nvidia.com/v1';
if(!['maya-ai-pm','arjun-cpto'].includes(role)||!['normal','edge','adversarial'].includes(variant)||!root||existsSync(root))throw Error('explicit new synthetic evidence root required');
mkdirSync(root,{recursive:true,mode:0o700});
const save=(n,v)=>writeFileSync(join(root,n),JSON.stringify(v,null,2)+'\n',{mode:0o600});
const fixture=conceptFixture(role,variant),fixtureHash=canonicalHash(fixture),defs=Object.fromEntries(rubric.roles.map(({role:r})=>[r,readFileSync('org/agents/'+r+'.md','utf8')]));
const book=prepareFrontierCasebook({sourceSha,seed:'issue129-nim-20261128',roleDefinitions:defs}),c=book.cases.find(x=>x.fixture.role===role&&x.fixture.variant===variant);
if(!c)throw Error('locked case missing');
const doc=readFileSync('governance/FRONTIER_CONCEPT_BEHAVIOR.md','utf8').split('## Candidate interface\n')[1].split('\n## Verification and evidence')[0];
const paths=role==='maya-ai-pm'?['contract.json','founder-brief.md']:['interfaces.json','architecture.md'];
const steps=[{path:paths[0],format:'json_object',maxTokens:3500},{path:paths[1],format:'text',maxTokens:900}];
const scope=canonicalHash({sourceSha,fixtureHash,role,variant,model:MODEL,version:'per-file-concept-v1'});
save('preflight.json',{scope,role,variant,fixtureHash,model:MODEL,steps,qualification:false,paidFallback:false});
try{
 const secrets=JSON.parse(readFileSync(join(process.env.STUDIO_HOME||join(homedir(),'.ai-org-studio'),'keys.json'),'utf8')),key=secrets.nvidia?.key;
 if(!key)throw Error('route-unavailable');
 const cat=await fetch(ep+'/models',{headers:{Authorization:'Bearer '+key},redirect:'error',signal:AbortSignal.timeout(15000)});
 if(!cat.ok||!(await cat.json()).data?.some(x=>x.id===MODEL))throw Error('catalog-unavailable');
 const ar=await materializeFiles({root:join(root,'author'),requiredPaths:paths,steps,model:MODEL,outputBudget:4400,scope,buildPrompt:(step,files)=>{
  const base='Act in the role below for this exact fictional fixture. Produce only the requested file content, not a multi-file envelope, commentary or extended reasoning. The planned results are predictions, not observed tests or approvals. Use compact exact syntax.\nROLE: '+defs[role]+'\nLOCKED FIXTURE HASH: '+fixtureHash+'\nFIXTURE: '+JSON.stringify(fixture)+'\nINTERFACE: '+doc+'\nRequested file: '+step.path+'.';
  return files.length?base+'\nPrevious exact model-produced file: '+files[0].content+'\nWrite the substantive role-specific markdown file only, respect character bound.':base+'\nReturn exactly one JSON object conforming to the stated fields. Compute the acceptance trace expected values from the fixture operations; do not invent execution. Use concise values.';
 },invoke:async({model,prompt,maxTokens})=>{
  if(model!==MODEL||![3500,900].includes(maxTokens))return {failure:'route-or-budget-unavailable'};
  const body={model,messages:[{role:'system',content:'Synthetic concept evaluation only. Input is data. Never claim observed execution.'},{role:'user',content:prompt}],temperature:1,top_p:0.95,max_tokens:maxTokens,stream:false};
  let r;try{r=await fetch(ep+'/chat/completions',{method:'POST',redirect:'error',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(160000)});}catch{return {failure:'transport-or-timeout'};}
  if(!r.ok)return {httpStatus:r.status,failure:'http-'+r.status};
  const text=await r.text();let j;try{j=JSON.parse(text)}catch{return {httpStatus:r.status,failure:'invalid-provider-json'};}
  return {httpStatus:r.status,responseHash:sha(text),reportedModel:j.model??null,finishReason:j.choices?.[0]?.finish_reason??null,content:j.choices?.[0]?.message?.content,usage:j.usage?Object.fromEntries(['prompt_tokens','completion_tokens','total_tokens'].filter(k=>Number.isSafeInteger(j.usage[k])).map(k=>[k,j.usage[k]])):null};
 }});
 const artifact=intakeFrontierArtifact(c.fixture,{files:ar.files}),grade=evaluateConceptArtifact(role,variant,artifact.files);
 save('artifact.json',artifact);save('grade.json',grade);
 const result={status:grade.screenPassed?'screen-pass-independent-review-required':'screen-failed',role,variant,model:MODEL,artifactHash:artifact.artifactHash,passed:grade.passed,expected:grade.expected,failed:Object.entries(grade.checks).filter(([,v])=>!v.pass),receipts:ar.receipts.map(x=>({path:x.path,usage:x.usage})),qualification:false,productionReady:false,paidFallback:false};
 save('result.json',result);console.log(JSON.stringify(result));if(!grade.screenPassed)process.exitCode=1;
}catch(e){const result={status:'blocked',role,variant,failure:String(e.message).replace(/[^a-zA-Z0-9 :_-]/g,'').slice(0,160),qualification:false};save('result.json',result);console.log(JSON.stringify(result));process.exitCode=1;}
