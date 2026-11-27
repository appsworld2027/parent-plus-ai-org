// Actual model-owned revision; independent verification remains mandatory.
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {coverageIssues} from '../../scripts/course-pilot/declarative-coverage.mjs';
import {compileCourseCases,buttons,tabs,labels} from '../../scripts/course-pilot/declarative-compiler.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex'), d=process.env.RUNNER_TEMP+'/course-author';
const b=JSON.parse(readFileSync(new URL('../evidence/course/46047049922/author-bundle.json',import.meta.url)));
if(b.runId!==46047049922)throw Error('Wrong prior run');
for(const f of b.files)if(sha(f.utf8)!==f.sha256)throw Error('Evidence hash mismatch '+f.file);
const get=n=>b.files.find(f=>f.file===n).utf8;
const previous=JSON.parse(get('receipt.json')), old=JSON.parse(get('raw-author.txt'));
const input=JSON.parse(readFileSync(d+'/input.json')), support=readFileSync(d+'/support.json');
if(previous.artifactSha256!==sha(JSON.stringify(old))||previous.source!==input.source||previous.contractHash!==sha(input.contract)||previous.supportHash!==sha(support))throw Error('Source or provenance mismatch');
const feedback=coverageIssues(old);const expected=['001','002','004','005','006'];
if(!expected.every(s=>feedback.some(x=>x.id.endsWith(s))))throw Error('Negative control did not detect known coverage defects');
let rejected=false;try{compileCourseCases(old)}catch(e){rejected=true}
if(!rejected)throw Error('Known rejected author bundle unexpectedly accepted');
writeFileSync(d+'/coverage-negative-control.json',JSON.stringify({run:b.runId,oldArtifact:previous.artifactSha256,feedback,rejected},null,2));
console.log('Known false-approved artifact rejected: '+JSON.stringify(feedback));
const model='openai/gpt-oss-120b',key=process.env.GROQ_API_KEY;
if(!key)throw Error('Approved free key unavailable');
const prompt='You are Quinn, QA author. Revise your own prior declarative test artifact using the exact contract and objective checker feedback below. Return a complete JSON object with exactly cases and limitations, seven unchanged case IDs. No reference implementation is supplied. Preserve valid operations; repair failing semantic coverage and sequence. Allowed operations: B exact button click; T exact tab click; F fill label/value; V verify label/value; I input visible; H heading visible; X exact text visible; NX exact text absent; VB button visible; NB button absent; VT tab visible; N exact text count; O restored field order array; NET verifies zero observed course/curriculum traffic. Buttons '+JSON.stringify(buttons)+'; tabs '+JSON.stringify(tabs)+'; labels '+JSON.stringify(labels)+'. For stage objective use exact accessible button, not a generic name. Each case starts independently with authenticated mock fixture; positive cases have initial Courses visibility pre-assertion. Local in-memory only. No server save, invalid external identifiers, or paid route. Visible confirmations must be actual contract text/buttons. Provide only revised JSON; no quality or pass claims.';
const context=JSON.stringify({input,priorArtifact:old,feedback,executionFeedback:['SC-003 prior compiler generic objective locator failed; exact stage-specific button is now supported','SC-004 attempted publish from dirty edit without saving first; publish from saved draft','Other four clean cases executed successfully but coverage feedback blocks approval']});
const start=Date.now(), r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,reasoning_effort:'medium',temperature:0,max_completion_tokens:4000,response_format:{type:'json_object'},messages:[{role:'system',content:prompt},{role:'user',content:context}]}),redirect:'error',signal:AbortSignal.timeout(90000)});
const limits=Object.fromEntries(['retry-after','x-ratelimit-reset-requests','x-ratelimit-reset-tokens','x-ratelimit-remaining-requests','x-ratelimit-remaining-tokens'].map(x=>[x,r.headers.get(x)]));
if(!r.ok){writeFileSync(d+'/provider-status.json',JSON.stringify({status:r.status,limits,model,retried:false},null,2));throw Error('Approved free route HTTP '+r.status+'; no retry or fallback')}
const j=await r.json(),c=j.choices?.[0],raw=c?.message?.content;
if(j.model!==model||typeof raw!=='string'||c.finish_reason!=='stop')throw Error('Incomplete or unverified model response');
writeFileSync(d+'/raw-author.txt',raw+'\n');
const a=JSON.parse(raw);
if(Object.keys(a).sort().join()!=='cases,limitations'||typeof a.limitations!=='string')throw Error('Wrong artifact schema');
const rec={schema:'course-quinn-declarative-revision/v1',stage:'ai:tests',role:'quinn-qa',seat:'author',source:input.source,model:j.model,contextSha256:sha(prompt+'\n'+context),contractHash:sha(input.contract),supportHash:sha(support),artifactSha256:sha(JSON.stringify(a)),priorRun:b.runId,priorArtifact:previous.artifactSha256,events:[{model:j.model,phase:'revision',ms:Date.now()-start,usage:j.usage??null,finish:c.finish_reason}],coverageIssues:coverageIssues(a),limits,passed:false,roleAdmission:false,lockApproved:false,quality:'Actual model-owned revision, pending clean/mutant/actual product execution and independent challenge'};
writeFileSync(d+'/receipt.json',JSON.stringify(rec,null,2));
const {spec,guard}=compileCourseCases(a);
rec.testHash=sha(spec);rec.guardHash=sha(guard);
writeFileSync(d+'/quinn-repaired.spec.ts',spec);writeFileSync(d+'/quinn-repaired-guard.spec.ts',guard);writeFileSync(d+'/receipt.json',JSON.stringify(rec,null,2));console.log(JSON.stringify(rec,null,2));
