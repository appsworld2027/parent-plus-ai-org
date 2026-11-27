// Actual, isolated one-case author; semantic action names avoid opaque token grammar.
// No expected test sequence is supplied; existing strict coverage and executable graders remain authoritative.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {COURSE_IDS,coverageIssues} from '../../scripts/course-pilot/declarative-coverage.mjs';
import {compileCourseOperation,buttons,tabs,labels} from '../../scripts/course-pilot/declarative-compiler.mjs';
const id=process.env.COURSE_CASE||'CRS-01-SC-004',provider=process.env.ROUTE_PROVIDER,model=process.env.ROUTE_MODEL;
const allowed={groq:['openai/gpt-oss-120b','qwen/qwen3.8-27b'],nvidia:['z-ai/glm-5.3-flash','nvidia/nemotron-3-ultra-550b-a55b']};
if(!COURSE_IDS.includes(id)||!allowed[provider]?.includes(model))throw Error('Unapproved route or scenario');
const sha=x=>createHash('sha256').update(x).digest('hex'),source='710082b2d8cf3c1007086df31f87b34ae8e02573';
const contract=readFileSync(new URL('./coach-course-management.CONTRACT.md',import.meta.url),'utf8');
if(sha(contract)!=='6695ab62149003b833c1afa04a2f6e674db3494efe7048864357095de07176aa')throw Error('Locked contract mismatch');
const i=COURSE_IDS.indexOf(id),row=i<6?contract.split('\n').find(x=>x.startsWith('| '+id+' |')):'Flag OFF: authenticated Today tab visible, Courses button absent, no course/curriculum traffic.';
if(!row)throw Error('Contract row missing');
const semantics=[
 'After entering, prove heading, honest pilot label, empty state, create entry and all five original tabs.',
 'Show all three input labels; try blank title with the two other fields filled; prove error and preserved values for both. Discard invalid edits via Today confirmation, reopen Courses and prove no course created.',
 'Create valid nonblank values across two ordered stages and a second objective in stage 1. Save, prove distinct title and Draft status, edit and assert every restored value plus full field order.',
 'Publishing is from a saved draft on the course list. Both versions require Save draft, Publish version, visible Confirm publish, actual Confirm publish click and the respective Version 1/2 visible. Edit a distinct title between versions. View history; prove both original titles and both exact version labels visibly and exactly once. Use distinct text values and real assertions, not just clicks.',
 'Dirty form includes title and another nonblank field; navigate Today, prove exact leave confirmation, choose Keep editing, assert preservation of every entered value. Navigate again, prove confirmation, discard, reopen Courses and prove empty.',
 'Save complete valid draft, prove title in list, navigate Today and back to Courses, prove same title and honest pilot not-synced label. Assert zero course/curriculum traffic after returning.',
 'With flag off, authenticated Today tab visible, exact Courses button absent, zero course/curriculum network calls. Do not enter Courses.'
][i];
const map={clickButton:'B',clickTab:'T',fillInput:'F',assertInputValue:'V',assertInputVisible:'I',assertHeading:'H',assertText:'X',assertTextAbsent:'NX',assertButtonVisible:'VB',assertButtonAbsent:'NB',assertTabVisible:'VT',assertTextCount:'N',assertFieldOrder:'O',assertNoCourseTraffic:'NET'};
const syntax='Use action arrays only: ["clickButton","button name"], ["clickTab","tab"], ["fillInput","label","value"], ["assertInputValue","label","value"], ["assertInputVisible","label"], ["assertHeading","text"], ["assertText","visible text"], ["assertTextAbsent","text"], ["assertButtonVisible","button"], ["assertButtonAbsent","button"], ["assertTabVisible","tab"], ["assertTextCount","text",1], ["assertFieldOrder",["label",...]], ["assertNoCourseTraffic"]. Do not use input-value assertions for labels or visible text; an action is not evidence of a visible assertion.';
const prompt='You are independent Quinn QA author for ONE locked browser acceptance scenario. Start authenticated on Today, fictional backend; positive cases already have Courses visible. Use only exact permitted labels. Work out a complete action/assertion sequence yourself, with precise temporal ordering. No real data, no backend writes, no code, no other cases, no claims of execution. Return a single JSON object {"operations":[...],"limitations":"..."} only. '+syntax;
const context=JSON.stringify({source,scenario:row,requiredEvidence:semantics,buttons,tabs,inputs:labels,ui:'Save draft returns to list; Edit course opens form; local publish requires confirmation from list; View history shows immutable versions. Exact pilot text: Course pilot — not synced. Dirty confirmation: Leave your unsaved changes?'});
const out=process.env.RUNNER_TEMP+'/course-semantic-author';mkdirSync(out,{recursive:true});
const key=process.env[provider==='nvidia'?'NVIDIA_NIM_API_KEY':'GROQ_API_KEY'];if(!key)throw Error('Approved existing developer key missing');
const url=provider==='nvidia'?'https://integrate.api.nvidia.com/v1/chat/completions':'https://api.groq.com/openai/v1/chat/completions';
const body={model,temperature:0,messages:[{role:'system',content:prompt},{role:'user',content:context}],...(provider==='nvidia'?{max_tokens:2600}:{max_completion_tokens:2600,...(model==='openai/gpt-oss-120b'?{reasoning_effort:'medium'}:{})})};
const start=Date.now(),r=await fetch(url,{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(120000)});
const limits=Object.fromEntries(['retry-after','x-ratelimit-reset-requests','x-ratelimit-reset-tokens','x-ratelimit-remaining-requests','x-ratelimit-remaining-tokens'].map(k=>[k,r.headers.get(k)]));
if(!r.ok){let errorCode=null;try{const j=await r.json();errorCode=typeof j?.error?.code==='string'?j.error.code.slice(0,100):null}catch{}writeFileSync(out+'/provider-status.json',JSON.stringify({status:r.status,provider,model,limits,errorCode,retried:false},null,2));throw Error('Approved developer route HTTP '+r.status+'; no retry or paid fallback')}
const j=await r.json(),c=j.choices?.[0],raw=c?.message?.content;
if(j.model!==model||c.finish_reason!=='stop'||typeof raw!=='string'||!Number.isSafeInteger(j.usage?.total_tokens))throw Error('Unverified exact model or incomplete response');
writeFileSync(out+'/raw-author.txt',raw+'\n');
const a=JSON.parse(raw.trim().replace(/^\x60\x60\x60(?:json)?\s*|\s*\x60\x60\x60$/g,''));
if(Object.keys(a).sort().join()!=='limitations,operations'||typeof a.limitations!=='string'||!Array.isArray(a.operations)||a.operations.length<3||a.operations.length>46)throw Error('Invalid authored scenario shape');
const operations=a.operations.map(op=>{if(!Array.isArray(op)||!Object.hasOwn(map,op[0]))throw Error('Unknown semantic action');const result=[map[op[0]],...op.slice(1)];compileCourseOperation(result);return result});
const normalized={operations,limitations:a.limitations};
const coverage=coverageIssues({cases:Object.fromEntries(COURSE_IDS.map(k=>[k,k===id?operations:[]]))}).filter(x=>x.id===id);
const receipt={schema:'course-semantic-case-author/v1',id,provider,model:j.model,source,contractHash:sha(contract),contextSha256:sha(prompt+'\n'+context),rawSha256:sha(raw+'\n'),artifactSha256:sha(JSON.stringify(normalized)),usage:j.usage,limits,ms:Date.now()-start,coverageIssues:coverage,coveragePassed:coverage.length===0,roleAdmission:false,lockApproved:false,executableGradePassed:false};
writeFileSync(out+'/normalized.json',JSON.stringify(normalized,null,2));writeFileSync(out+'/receipt.json',JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
if(coverage.length)throw Error('Scenario coverage failed; no assertion inserted by controller');
