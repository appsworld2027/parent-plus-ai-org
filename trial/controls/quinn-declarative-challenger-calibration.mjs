// Blind independent challenge of known deficient artifact. No reference answers in model context.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {checkCourseChallenge} from '../../scripts/course-pilot/declarative-challenge-gate.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const bundle=JSON.parse(readFileSync(new URL('../evidence/course/46047049922/author-bundle.json',import.meta.url)));
for(const f of bundle.files)if(sha(f.utf8)!==f.sha256)throw Error('Bundle byte hash mismatch');
const get=n=>bundle.files.find(x=>x.file===n).utf8;
const a=JSON.parse(get('receipt.json')),artifact=JSON.parse(get('raw-author.txt'));
a.receiptSha256=sha(get('receipt.json'));
const contract=readFileSync(new URL('./coach-course-management.CONTRACT.md',import.meta.url),'utf8');
if(sha(contract)!==a.contractHash)throw Error('Locked contract mismatch');
const out=process.env.RUNNER_TEMP+'/course-challenge';mkdirSync(out,{recursive:true});
const model='qwen/qwen3.8-27b',key=process.env.GROQ_API_KEY;if(!key)throw Error('Missing approved free key');
const prompt='You are Quinn independent QA challenger, not author. Challenge every case against the exact contract. The operation list is the entire substantive test; common setup is login/mock backend/network listeners/initial Courses visibility only. Do not assume omitted behavior is checked. B exact button click, T tab, F fill, V value, I accessible input, H heading, X exact visible text, NX absent text, VB visible button, NB absent, VT visible tab, N exact text count, O DOM order, NET zero observed course/curriculum calls; legacy B Add objective occurrence 0/1 maps to exact stage button. Review actual ordering, error and local-only behavior, restoration, distinct history and negative evidence. Each of seven exact IDs must have verdict APPROVE or CHANGES, defects [] if approve or specific defects if changes, evidence array of >=2 distinct zero-based index and exact operation copied from that case with rationale. Overall verdict CHANGES if any case changes. Return JSON ONLY {"verdict":"...","reviews":[{"id":"...","verdict":"...","defects":["..."],"evidence":[{"index":0,"operation":["..."],"rationale":"..."}]}]}. Do not claim tests executed. Evaluate independent of prior authors or reviewers.';
const context=JSON.stringify({contract,artifact});
const start=Date.now(),r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,temperature:0,max_completion_tokens:4300,messages:[{role:'system',content:prompt},{role:'user',content:context}]}),redirect:'error',signal:AbortSignal.timeout(90000)});
const limits=Object.fromEntries(['retry-after','x-ratelimit-reset-requests','x-ratelimit-reset-tokens','x-ratelimit-remaining-requests','x-ratelimit-remaining-tokens'].map(x=>[x,r.headers.get(x)]));
if(!r.ok){writeFileSync(out+'/provider-status.json',JSON.stringify({status:r.status,limits,model,retried:false},null,2));throw Error('Free route HTTP '+r.status+'; no retries or paid fallback')}
const j=await r.json(),c=j.choices?.[0],raw=c?.message?.content;
if(j.model!==model||c.finish_reason!=='stop'||typeof raw!=='string')throw Error('Incomplete exact provider response');
writeFileSync(out+'/raw-review.txt',raw+'\n');const review=JSON.parse(raw.trim().replace(/^\x60\x60\x60(?:json)?\s*|\s*\x60\x60\x60$/g,''));
if(Object.keys(review).sort().join()!=='reviews,verdict')throw Error('Wrong review schema');
const receipt={schema:'course-challenge/v2',role:'quinn-qa',seat:'challenger',model:j.model,artifactSha256:a.artifactSha256,contextSha256:sha(prompt+'\n'+context),receiptSha256:sha(raw),...review};
writeFileSync(out+'/review-receipt.json',JSON.stringify({receipt,usage:j.usage,limits,ms:Date.now()-start,source:a.source,calibration:true},null,2));
const result=checkCourseChallenge(artifact,a,receipt,{calibration:true});
writeFileSync(out+'/challenge-grade.json',JSON.stringify(result,null,2));console.log(JSON.stringify({result,usage:j.usage,limits},null,2));
