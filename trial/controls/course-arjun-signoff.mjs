// Course acceptance lock evaluation. No source checkout, product writes or admission.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {selectExecutionStrategy} from '../../scripts/execution-strategy.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const source='710082b2d8cf3c1007086df31f87b34ae8e02573',contractHash='6695ab62149003b833c1afa04a2f6e674db3494efe7048864357095de07176aa';
const model='openai/gpt-oss-120b',role='arjun-cpto',stage='ai:tests-signoff';
const contract=readFileSync(new URL('./coach-course-management.CONTRACT.md',import.meta.url),'utf8');
const card=readFileSync(new URL('../../org/agents/arjun-cpto.md',import.meta.url),'utf8');
if(sha(contract)!==contractHash||!card.includes('slug: arjun-cpto'))throw Error('Locked role/contract mismatch');
const aggregateBytes=execFileSync(process.execPath,[new URL('./quinn-case-packet-challenger.mjs',import.meta.url).pathname,'verify-all'],{encoding:'utf8',env:{PATH:process.env.PATH}});
const aggregate=JSON.parse(aggregateBytes);
const saved=readFileSync(new URL('../evidence/course/46104163953/aggregate.json',import.meta.url),'utf8');
if(aggregateBytes!==saved||!aggregate.independentAcceptanceReviewPassed||aggregate.approvals.length!==7||aggregate.roleAdmission||aggregate.lockApproved)throw Error('Independent receipt mismatch');
const gradeBundle=JSON.parse(readFileSync(new URL('../evidence/course/46067075908/suite-grade-bundle.json',import.meta.url),'utf8'));
const g=gradeBundle.files.find(f=>f.file==='suite-grade.json');
if(!g||sha(g.utf8)!==g.sha256)throw Error('Grade digest mismatch');
const grade=JSON.parse(g.utf8);
if(grade.source!==source||grade.contractHash!==contractHash||!grade.fullSuitePassed||!grade.cleanPass||!grade.intendedRed||grade.mutationRecall!==11||!grade.guard.passed)throw Error('Grade not adequate');
const strategy=selectExecutionStrategy({engine:'free',stage,model:'groq/'+model});
const fixed={role,stage,source,contractHash,aggregateSha256:sha(saved),gradeSha256:g.sha256,authorModel:aggregate.authorModel,reviewerModel:aggregate.model,calibrationPassed:aggregate.calibrationPassed,diffModel:aggregate.authorModel!==aggregate.model,cleanCases:grade.perCase.filter(x=>x.passed).length,intendedRed:grade.intendedRed,mutationRecall:grade.mutationRecall,mutationExpected:grade.mutationExpected,guardPassed:grade.guard.passed,approvedCases:aggregate.approvals.map(x=>x.id),runtimeQualified:false,paidEnabled:false,privateSourceEgress:false,productWritesAuthorized:false};
const contexts=[{...fixed,guardPassed:false,approvedCases:fixed.approvedCases.filter(x=>x!=='GUARD-CRS-FLAG-OFF')},fixed];
const prompt=card+'\n\nYou are executing the actual AI Org ai:tests-signoff role. Assess the supplied sanitized evidence against the locked acceptance contract. Decide whether the acceptance TESTS may be locked, not whether product writes or release are allowed. Reject missing guard, failed mutation/RED, missing approval, invalid identity or non-independent review. Runtime qualification and data safety are separate mandatory gates and must not be overridden. Never authorize product writes at this stage. Return strict JSON verdict LOCK_ACCEPTANCE or CHANGES, reasons, remainingGates.\n'+contract;
const schema={type:'object',additionalProperties:false,required:['verdict','reasons','remainingGates','authorizeProductWrites'],properties:{verdict:{type:'string',enum:['LOCK_ACCEPTANCE','CHANGES']},reasons:{type:'array',minItems:1,maxItems:5,items:{type:'string'}},remainingGates:{type:'array',minItems:1,maxItems:5,items:{type:'string'}},authorizeProductWrites:{type:'boolean'}}};
if(process.argv[2]==='preflight'){console.log(JSON.stringify({role,stage,source,contractHash,aggregateSha256:fixed.aggregateSha256,gradeSha256:fixed.gradeSha256,noInference:true,calibrationMissingGuard:true}));process.exit(0)}
if(process.argv[2]!=='run'||!process.env.GROQ_API_KEY||!process.env.RUNNER_TEMP)throw Error('Owner-gated run required');
const root=join(process.env.RUNNER_TEMP,'course-arjun-signoff');mkdirSync(root,{recursive:true});
const receipts=[];
for(let i=0;i<contexts.length;i++){
 const ctx=JSON.stringify(contexts[i]),dir=join(root,i===0?'blind-calibration':'exact-acceptance');mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'context.json'),ctx);writeFileSync(join(dir,'prompt.txt'),prompt);
 const response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+process.env.GROQ_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model,temperature:0,reasoning_effort:strategy.packet.reasoningEffort,max_completion_tokens:strategy.packet.completionTokenLimit,response_format:{type:'json_schema',json_schema:{name:'course_arjun_lock',strict:true,schema}},messages:[{role:'system',content:prompt},{role:'user',content:ctx}]}),redirect:'error',signal:AbortSignal.timeout(90000)});
 const limits=Object.fromEntries(['retry-after','x-ratelimit-remaining-tokens','x-ratelimit-reset-tokens'].map(k=>[k,response.headers.get(k)]));
 if(!response.ok){writeFileSync(join(dir,'provider-status.json'),JSON.stringify({status:response.status,limits}));throw Error('Provider '+response.status+'; fail closed');}
 const j=await response.json(),c=j.choices?.[0],raw=c?.message?.content;
 if(typeof raw==='string')writeFileSync(join(dir,'raw-review.txt'),raw);
 const observed={actualModel:j.model,usage:j.usage,finish:c?.finish_reason,limits};writeFileSync(join(dir,'observed.json'),JSON.stringify(observed));
 if(j.model!==model||c?.finish_reason!=='stop'||!Number.isSafeInteger(j.usage?.total_tokens)||j.usage.total_tokens<1)throw Error('Invalid provider receipt');
 const r=JSON.parse(raw);
 if(Object.keys(r).sort().join()!=='authorizeProductWrites,reasons,remainingGates,verdict'||r.authorizeProductWrites!==false||!Array.isArray(r.reasons)||!r.reasons.length||!Array.isArray(r.remainingGates)||!r.remainingGates.some(x=>/runtime|execution|provider|data.safety|egress/i.test(x))||r.verdict!==(i===0?'CHANGES':'LOCK_ACCEPTANCE')||i===0&&!r.reasons.some(x=>/guard/i.test(x)))throw Error('Arjun rejected or calibration failed');
 const receipt={role,stage,source,contractHash,model,contextSha256:sha(ctx),rawSha256:sha(raw),promptSha256:sha(prompt),usage:j.usage,verdict:r.verdict,authorizeProductWrites:false,roleAdmission:false,review:r};
 writeFileSync(join(dir,'receipt.json'),JSON.stringify(receipt,null,2));receipts.push(receipt);
 if(i===0)await new Promise(r=>setTimeout(r,strategy.quota.interPacketDelaySeconds*1000));
}
writeFileSync(join(root,'summary.json'),JSON.stringify({role,stage,source,contractHash,aggregateSha256:fixed.aggregateSha256,gradeSha256:fixed.gradeSha256,calibrationPassed:true,acceptanceLockApproved:true,roleAdmission:false,runtimeQualified:false,productWritesAuthorized:false,receipts},null,2));
console.log(JSON.stringify({acceptanceLockApproved:true,roleAdmission:false,productWritesAuthorized:false}));
