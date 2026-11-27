// Evaluation-only independent case challenger. No product edits, model fallback or implied role admission.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {COURSE_IDS,coverageIssues} from '../../scripts/course-pilot/declarative-coverage.mjs';
import {selectExecutionStrategy} from '../../scripts/execution-strategy.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex'),blob=x=>createHash('sha1').update('blob '+x.length+'\0').update(x).digest('hex');
const source='710082b2d8cf3c1007086df31f87b34ae8e02573',contractHash='6695ab62149003b833c1afa04a2f6e674db3494efe7048864357095de07176aa',authorModel='qwen/qwen3.8-27b',model='openai/gpt-oss-120b',provider='groq';
const strategy=selectExecutionStrategy({engine:'free',stage:'ai:tests-review',model:provider+'/'+model});
const contract=readFileSync(new URL('./coach-course-management.CONTRACT.md',import.meta.url),'utf8');if(sha(contract)!==contractHash)throw Error('Locked contract changed');
const readBundle=(run,name,expected)=>{const b=readFileSync(new URL('../evidence/course/'+run+'/'+name,import.meta.url));if(blob(b)!==expected)throw Error('Evidence blob mismatch');const v=JSON.parse(b);if(v.runId!==run||v.files.some(f=>sha(f.utf8)!==f.sha256)||new Set(v.files.map(f=>f.file)).size!==v.files.length)throw Error('Evidence byte mismatch');return n=>{const f=v.files.find(x=>x.file===n);if(!f)throw Error('Missing '+n);return f.utf8}};
const get=readBundle(46064920144,'suite-author-bundle.json','52c4890f0e466fbd9c49a45361fbb2d6f82fc94e');
const gradeGet=readBundle(46064920144,'suite-grade-bundle.json','d99aa3178264983944583f3f8c77a2122da9adef');
const original=readBundle(46058881332,'chunk-complete-bundle.json','54afcfe1f0e556f153c0d8ce41468f3989633156');
const nativeGet=readBundle(46065297280,'native-gpt-bundle.json','e500bac327beed5440dfc79e28d2d98e6fc504d3');
const native=JSON.parse(nativeGet('grade/grade.json'));
if(!native.passed||native.mode!=='actual'||!native.actualProviderIdentity||native.model!==model||native.casesPassed!==12||native.casesTotal!==12||native.negativeControlCount!==5||!native.syntheticOnly||native.roleAdmission)throw Error('Exact distinct provider synthetic qualification absent');
const grade=JSON.parse(gradeGet('suite-grade.json')),compiled=JSON.parse(gradeGet('compiled.json'));
if(!grade.passed||!grade.cleanPass||!grade.intendedRed||grade.mutationRecall!==7||grade.source!==source||grade.contractHash!==contractHash||grade.testHash!==compiled.testHash||grade.model!==authorModel||grade.lockApproved||grade.roleAdmission)throw Error('Exact four-case executable verification absent');
const cases=Object.fromEntries(COURSE_IDS.slice(0,3).map(id=>{const c=JSON.parse(get(id+'/case.json'));if(c.id!==id||c.receipts.some(r=>r.actualModel!==authorModel||r.source!==source||r.contractHash!==contractHash)||JSON.stringify(c.receipts)!==JSON.stringify(compiled.origins[id]))throw Error('Author receipt mismatch');return [id,c.operations]}));
const sc4=COURSE_IDS[3],old=JSON.parse(original('normalized.json')),oldReceipt=JSON.parse(original('receipt.json'));
if(oldReceipt.source!==source||oldReceipt.contractHash!==contractHash||oldReceipt.model!==authorModel||oldReceipt.artifactSha256!==sha(JSON.stringify(old))||oldReceipt.artifactSha256!==compiled.origins[sc4].artifactSha256)throw Error('Original SC004 receipt mismatch');
cases[sc4]=old.operations;
function staticIssues(id,ops){return coverageIssues({cases:Object.fromEntries(COURSE_IDS.map(k=>[k,k===id?ops:[]]))}).filter(x=>x.id===id)}
for(const [id,ops] of Object.entries(cases))if(staticIssues(id,ops).length||!grade.perCase.find(x=>x.id===id&&x.passed))throw Error('Not a verified author case: '+id);
const historyIndex=cases[sc4].findIndex(o=>o[0]==='B'&&o[1]==='View history');const firstTitle=cases[sc4].find(o=>o[0]==='F'&&o[1]==='Course title')[2];const calibrationOps=cases[sc4].filter((o,i)=>!(i>historyIndex&&['X','N'].includes(o[0])&&o[1]===firstTitle));if(calibrationOps.length===cases[sc4].length||!staticIssues(sc4,calibrationOps).length)throw Error('Calibration is not known deficient');
const prompt='Independent Quinn QA challenger. One fresh source-bound browser test case; review actual operations as written, never assume omitted evidence. Common setup only authenticates, mocks backend, listens for course/curriculum requests, and checks Courses visibility for positive cases. B exact button click; T tab click; F fill; V value assertion; I accessible input assertion; H heading; X exact visible text; NX absent text; VB visible button; NB absent; VT visible tab; N exact text count; O DOM field order; NET zero course/curriculum network calls. Inspect ordering, required behavior, negative evidence, and whether key defects could survive. No test-execution claims. Output ONLY JSON {"id":"exact case ID","verdict":"APPROVE or CHANGES","defects":[],"evidence":[{"index":0,"operation":["exact operation"],"rationale":"specific reason"}]}. At least two distinct zero-based indices with exact operation copied. Approve only if the test covers all obligations of this case. CHANGES must identify specific missing/incorrect evidence. Other case IDs and broader implementation/unit/security obligations are reviewed separately. Do not recommend real data or deployment.';
function context(id,ops){return JSON.stringify({source,contractHash,scenario:id,contract,operations:ops.map((operation,index)=>({index,operation}))})}
function parse(raw,id,ops){
 const r=JSON.parse(raw.trim().replace(/^\x60\x60\x60(?:json)?\s*|\s*\x60\x60\x60$/g,''));
 if(!r||Object.keys(r).sort().join()!=='defects,evidence,id,verdict'||r.id!==id||!['APPROVE','CHANGES'].includes(r.verdict)||!Array.isArray(r.defects)||r.defects.length>8||r.defects.some(d=>typeof d!=='string'||d.trim().length<15||d.length>500)||(r.verdict==='CHANGES')!==!!r.defects.length||!Array.isArray(r.evidence)||r.evidence.length<2||r.evidence.length>8||new Set(r.evidence.map(x=>x.index)).size!==r.evidence.length)throw Error('Malformed review or inconsistent verdict');
 for(const e of r.evidence)if(!e||Object.keys(e).sort().join()!=='index,operation,rationale'||!Number.isInteger(e.index)||e.index<0||e.index>=ops.length||JSON.stringify(e.operation)!==JSON.stringify(ops[e.index])||typeof e.rationale!=='string'||e.rationale.trim().length<12||e.rationale.length>500)throw Error('Ungrounded operation evidence');
 return r;
}
const root=join(process.env.RUNNER_TEMP||'/tmp','course-case-challenger');
if(process.argv[2]==='preflight'){console.log(JSON.stringify({preflightPassed:true,exactCases:Object.keys(cases),calibrationKnownDefect:staticIssues(sc4,calibrationOps).length,distinctModel:authorModel!==model,inference:false}));process.exit(0)}
if(process.argv[2]!=='review'||!process.env.RUNNER_TEMP||!process.env.GROQ_API_KEY)throw Error('Use preflight or approved actual review');
mkdirSync(root,{recursive:true});
const queue=[{id:sc4,ops:calibrationOps,calibration:true},...Object.entries(cases).map(([id,ops])=>({id,ops,calibration:false}))];
const receipts=[];let blocked=null;
for(const {id,ops,calibration} of queue){
 const dir=join(root,calibration?'blind-calibration':id);mkdirSync(dir,{recursive:true});
 const ctx=context(id,ops),start=Date.now();writeFileSync(join(dir,'context.json'),ctx);writeFileSync(join(dir,'prompt.txt'),prompt);
 let response;try{response=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+process.env.GROQ_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model,temperature:0,reasoning_effort:strategy.packet.reasoningEffort,max_completion_tokens:strategy.packet.completionTokenLimit,messages:[{role:'system',content:prompt},{role:'user',content:ctx}]}),redirect:'error',signal:AbortSignal.timeout(90000)})}catch(e){blocked={id,calibration,reason:'provider transport failure',error:e.name};break}
 const limits=Object.fromEntries(['retry-after','x-ratelimit-reset-requests','x-ratelimit-reset-tokens','x-ratelimit-remaining-requests','x-ratelimit-remaining-tokens'].map(k=>[k,response.headers.get(k)]));
 if(!response.ok){blocked={id,calibration,status:response.status,limits};writeFileSync(join(dir,'provider-status.json'),JSON.stringify(blocked));break}
 const j=await response.json(),c=j.choices?.[0],raw=c?.message?.content;
 if(typeof raw==='string')writeFileSync(join(dir,'raw-review.txt'),raw);
 const observation={provider,actualModel:j.model,usage:j.usage,limits,finish:c?.finish_reason,ms:Date.now()-start};writeFileSync(join(dir,'observed.json'),JSON.stringify(observation,null,2));
 try{
  if(j.model!==model||c?.finish_reason!=='stop'||typeof raw!=='string'||!Number.isSafeInteger(j.usage?.total_tokens)||j.usage.total_tokens<=0)throw Error('Incomplete exact provider response');
  const review=parse(raw,id,ops),issues=staticIssues(id,ops);
  const calibrated=!calibration||review.verdict==='CHANGES'&&review.defects.some(d=>/history|version|count|duplicat|exactly once/i.test(d));
  if(issues.length&&review.verdict!=='CHANGES'||!calibrated)throw Error('Blind calibration false approval or not grounded in missing history evidence');
  const receipt={schema:'course-case-challenge/v1',source,contractHash,id,calibration,authorModel,model,provider,artifactSha256:sha(JSON.stringify(ops)),contextSha256:sha(prompt+'\n'+ctx),receiptSha256:sha(raw),usage:j.usage,limits,review,calibrationPassed:calibration?calibrated:null,roleAdmission:false,lockApproved:false};
  writeFileSync(join(dir,'review-receipt.json'),JSON.stringify(receipt,null,2));receipts.push({id,calibration,verdict:review.verdict,artifactSha256:receipt.artifactSha256,contextSha256:receipt.contextSha256,receiptSha256:receipt.receiptSha256,tokens:j.usage.total_tokens});
 }catch(e){blocked={id,calibration,reason:e.message};writeFileSync(join(dir,'rejected.json'),JSON.stringify(blocked));break}
 await new Promise(r=>setTimeout(r,strategy.quota.interPacketDelaySeconds*1000));
}
const summary={schema:'course-case-challenge-summary/v1',source,contractHash,authorModel,model,calibrationPassed:receipts.some(x=>x.calibration&&x.verdict==='CHANGES'),reviews:receipts.filter(x=>!x.calibration),blocked,fullSuite:false,roleAdmission:false,lockApproved:false};writeFileSync(join(root,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));
if(!summary.calibrationPassed||blocked)process.exitCode=1;
