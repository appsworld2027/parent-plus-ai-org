// Focused single-scenario author capability diagnosis, not a full acceptance suite or admission.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {COURSE_IDS,coverageIssues} from '../../scripts/course-pilot/declarative-coverage.mjs';
import {compileCourseOperation} from '../../scripts/course-pilot/declarative-compiler.mjs';
const id='CRS-01-SC-004',model='openai/gpt-oss-120b',sha=x=>createHash('sha256').update(x).digest('hex');
const contract=readFileSync(new URL('./coach-course-management.CONTRACT.md',import.meta.url),'utf8'),line=contract.split('\n').find(x=>x.startsWith('| '+id+' |'));
const source='710082b2d8cf3c1007086df31f87b34ae8e02573';
if(sha(contract)!=='6695ab62149003b833c1afa04a2f6e674db3494efe7048864357095de07176aa'||!line)throw Error('Locked contract mismatch');
const out=process.env.RUNNER_TEMP+'/course-focused';mkdirSync(out,{recursive:true});
const key=process.env.GROQ_API_KEY;if(!key)throw Error('Missing approved free-model route');
const prompt='Quinn QA author: author ONE browser test for the exact locked acceptance row below. Each test starts authenticated on Today, fictional backend and Courses visible. Course feature is mock-only; no real backend or persistence. Save draft returns to the course list; Edit course opens the form; View history displays local immutable versions. Publish a saved draft from the course list. Use only these exact button labels: Courses, Create course, Save draft, Edit course, Publish version, Confirm publish, View history. Inputs: Course title, Stage 1 title, Stage 1 objective 1. Operation syntax: ["B","button name"] click; ["F","input label","value"] fill; ["X","visible exact text"] assertion; ["VB","button name"] visible assertion; ["N","exact text",1] exact count assertion; ["V","input label","value"] input value assertion only. Distinct old/new title strings. Do not use V for plain text or omit a required action. Use the actual confirmation button and prove prior and new version/title each occurs once in history. Return only {"operations":[...],"limitations":"..."} for this one row. No code, other cases, reference tests or claims of execution.';
const context=JSON.stringify({source,acceptance:line,authority:'After a publish, editing creates a new draft from the current version; published history is never overwritten. Publishing in the pilot means a local immutable version only.'});
const start=Date.now(),r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,reasoning_effort:'medium',temperature:0,max_completion_tokens:1800,response_format:{type:'json_object'},messages:[{role:'system',content:prompt},{role:'user',content:context}]}),redirect:'error',signal:AbortSignal.timeout(90000)});
const limits=Object.fromEntries(['retry-after','x-ratelimit-reset-requests','x-ratelimit-reset-tokens','x-ratelimit-remaining-requests','x-ratelimit-remaining-tokens'].map(k=>[k,r.headers.get(k)]));
if(!r.ok){writeFileSync(out+'/provider-status.json',JSON.stringify({status:r.status,model,limits,retried:false},null,2));throw Error('Free route HTTP '+r.status+'; no retries or paid fallback')}
const j=await r.json(),c=j.choices?.[0],raw=c?.message?.content;
if(j.model!==model||c.finish_reason!=='stop'||typeof raw!=='string')throw Error('Unverified/incomplete output');
writeFileSync(out+'/raw-author.txt',raw+'\n');
const a=JSON.parse(raw);
if(Object.keys(a).sort().join()!=='limitations,operations'||!Array.isArray(a.operations)||typeof a.limitations!=='string'||a.operations.length<3||a.operations.length>46)throw Error('Invalid authored case');
const provisional={cases:Object.fromEntries(COURSE_IDS.map(k=>[k,k===id?a.operations:[]]))};
const omissions=coverageIssues(provisional).filter(x=>x.id===id);
const receipt={schema:'course-focused-case-author/v1',id,model:j.model,source,contractHash:sha(contract),contextSha256:sha(prompt+'\n'+context),artifactSha256:sha(JSON.stringify(a)),usage:j.usage,limits,ms:Date.now()-start,omissions,roleAdmission:false,lockApproved:false,passed:false};
writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2));
for(const op of a.operations)compileCourseOperation(op);
if(omissions.length)throw Error('Focused coverage failed: '+JSON.stringify(omissions));
receipt.coveragePassed=true;writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
