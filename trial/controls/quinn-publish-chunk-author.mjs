// Evaluation only: independent authoring in four fresh bounded contexts.
// Fixed fictional titles coordinate chunks; the model independently supplies every action/assertion.
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {COURSE_IDS,coverageIssues} from '../../scripts/course-pilot/declarative-coverage.mjs';
import {compileCourseOperation,buttons,tabs,labels} from '../../scripts/course-pilot/declarative-compiler.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const source='710082b2d8cf3c1007086df31f87b34ae8e02573',id='CRS-01-SC-004';
const contract=readFileSync(new URL('./coach-course-management.CONTRACT.md',import.meta.url),'utf8');
const contractHash=sha(contract);
if(contractHash!=='6695ab62149003b833c1afa04a2f6e674db3494efe7048864357095de07176aa')throw Error('Locked contract mismatch');
const provider=process.env.ROUTE_PROVIDER,model=process.env.ROUTE_MODEL;
const allowed={groq:['openai/gpt-oss-120b','qwen/qwen3.8-27b'],opencode:['opencode/deepseek-v4.1-flash-free']};
if(!allowed[provider]?.includes(model))throw Error('Unapproved exact model');
const root=join(process.env.RUNNER_TEMP,'course-chunk-author');mkdirSync(root,{recursive:true});
const chunks=[
 {key:'saved-draft',start:'Authenticated Today; Courses available; empty list.',goal:'Start on Today and enter Courses. Create one complete draft with fixture title Course Alpha, valid stage and objective, save and visibly prove the draft exists. Finish on course list.',allowed:['Courses','Create course','Save draft']},
 {key:'publish-first',start:'Course Alpha is a valid saved draft on Courses list.',goal:'The Publish version button is already available on the course list; use it without entering the editor or history. Explicitly prove the confirmation is visible before accepting, then prove Version 1 on the list. Finish on course list.',allowed:['Publish version','Confirm publish']},
 {key:'publish-second',start:'Course Alpha has local immutable Version 1; Courses list.',goal:'Open edit from the list, set Course Beta, save the changed draft first (returns to list), then test the complete second local publish flow on the list, with visible confirmation and Version 2. Do not enter history. Finish on course list.',allowed:['Edit course','Save draft','Publish version','Confirm publish']},
 {key:'immutable-history',start:'Course Beta has Version 2; Course Alpha was Version 1; Courses list.',goal:'Open history and test that both exact original title strings and both exact version labels are visible, each exactly once. Do not assume a click or count alone proves visibility. Remain in history.',allowed:['View history']}
];
const map={clickButton:'B',clickTab:'T',fillInput:'F',assertInputValue:'V',assertInputVisible:'I',assertHeading:'H',assertText:'X',assertTextAbsent:'NX',assertButtonVisible:'VB',assertButtonAbsent:'NB',assertTabVisible:'VT',assertTextCount:'N',assertFieldOrder:'O',assertNoCourseTraffic:'NET'};
const syntax='JSON action arrays: ["clickButton","name"], ["clickTab","tab"], ["fillInput","label","value"], ["assertInputValue","label","value"], ["assertInputVisible","label"], ["assertHeading","text"], ["assertText","visible text"], ["assertTextAbsent","text"], ["assertButtonVisible","name"], ["assertButtonAbsent","name"], ["assertTabVisible","tab"], ["assertTextCount","text",1], ["assertFieldOrder",["label",...]], ["assertNoCourseTraffic"]. Use exact strings. A click is not a visibility assertion.';
const prompt='Independent Quinn QA author. Author one small browser test segment, not the entire feature. Only use allowed exact labels and semantic operations. Start in the stated location and finish in the stated location. No code, no external tools, no execution claims. Return only JSON {"operations":[...],"limitations":"..."} with 3 to 16 operations. '+syntax;
const clean=(v)=>v.trim().replace(/^\x60\x60\x60(?:json)?\s*|\s*\x60\x60\x60$/g,'');
function parse(raw){const a=JSON.parse(clean(raw));if(Object.keys(a).sort().join()!=='limitations,operations'||typeof a.limitations!=='string'||!Array.isArray(a.operations)||a.operations.length<3||a.operations.length>16)throw Error('Invalid chunk shape');return {operations:a.operations.map(op=>{if(!Array.isArray(op)||!Object.hasOwn(map,op[0]))throw Error('Unknown operation');const v=[map[op[0]],...op.slice(1)];compileCourseOperation(v);return v}),limitations:a.limitations}}

function validatePacket(chunk,a){
 const o=a.operations,at=(k,v,w,from=-1)=>o.findIndex((p,i)=>i>from&&p[0]===k&&(v===undefined||p[1]===v)&&(w===undefined||p[2]===w));
 const sequence=(...s)=>{let i=-1;for(const [k,v,w] of s){i=at(k,v,w,i);if(i<0)return false}return true};
 const expected={ 'saved-draft':[7,13],'publish-first':[4,8],'publish-second':[7,14],'immutable-history':[9,12] }[chunk.key];
 if(o.length<expected[0]||o.length>expected[1])throw Error('Packet operation count outside scoped bounds');
 if(o.some(p=>['B','VB','NB'].includes(p[0])&&!chunk.allowed.includes(p[1])||['T','VT','NET','O','NX','NB'].includes(p[0])))throw Error('Packet crossed allowed transition boundary');
 let ok=false;
 if(chunk.key==='saved-draft'){
 const f=at('B','Create course'),s=at('B','Save draft',undefined,f);
 ok=sequence(['B','Courses'],['B','Create course'],['F','Course title','Course Alpha'],['B','Save draft'],['X','Course Alpha'])&&['Stage 1 title','Stage 1 objective 1'].every(l=>{const x=o.findIndex((p,i)=>i>f&&i<s&&p[0]==='F'&&p[1]===l&&typeof p[2]==='string'&&p[2].trim());return x>=0});
 }else if(chunk.key==='publish-first')ok=sequence(['B','Publish version'],['VB','Confirm publish'],['B','Confirm publish'],['X','Version 1']);
 else if(chunk.key==='publish-second')ok=sequence(['B','Edit course'],['F','Course title','Course Beta'],['B','Save draft'],['B','Publish version'],['VB','Confirm publish'],['B','Confirm publish'],['X','Version 2']);
 else if(chunk.key==='immutable-history')ok=at('B','View history')===0&&['Course Alpha','Course Beta','Version 1','Version 2'].every(v=>at('X',v,undefined,0)>0&&at('N',v,1,0)>0);
 if(!ok)throw Error('Packet omitted a critical temporal or exact evidence obligation; no controller insertion');
}

async function groq(context,dir,attempt=1){
 const key=process.env.GROQ_API_KEY;if(!key)throw Error('Missing configured approved free credential');
 let r;try{r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,temperature:0,max_completion_tokens:model==='qwen/qwen3.8-27b'?1800:1400,...(model==='openai/gpt-oss-120b'?{reasoning_effort:'low'}:{}),messages:[{role:'system',content:prompt},{role:'user',content:context}]}),redirect:'error',signal:AbortSignal.timeout(75000)})}catch(e){writeFileSync(join(dir,'provider-status.json'),JSON.stringify({provider,model,transportError:e.name,retried:false}));throw e}
 const limits=Object.fromEntries(['retry-after','x-ratelimit-reset-requests','x-ratelimit-reset-tokens','x-ratelimit-remaining-requests','x-ratelimit-remaining-tokens'].map(k=>[k,r.headers.get(k)]));
 if(!r.ok){writeFileSync(join(dir,'provider-status.json'),JSON.stringify({provider,model,status:r.status,limits,attempt,retried:attempt>1})); const retry=Number(limits['retry-after']); if(r.status===429&&attempt===1&&Number.isFinite(retry)&&retry>0&&retry<=60){console.log(JSON.stringify({provider,model,status:429,retryAfterSeconds:retry,action:'wait-once'}));await new Promise(r=>setTimeout(r,(retry+2)*1000));return groq(context,dir,2)} throw Error('Approved free route HTTP '+r.status+'; checkpoint preserved; no paid fallback')}
 const j=await r.json(),c=j.choices?.[0];
 if(j.model!==model||c.finish_reason!=='stop'||typeof c.message?.content!=='string'||!Number.isSafeInteger(j.usage?.total_tokens))throw Error('Incomplete or wrong model response');
 return {raw:c.message.content,actualModel:j.model,usage:j.usage,limits};
}
async function oc(context,dir){
 const cat=await fetch('https://opencode.ai/inference/v1/models',{redirect:'error',signal:AbortSignal.timeout(20000)});
 const m=cat.ok?(await cat.json()).data?.find(x=>x.id==='deepseek-v4.1-flash-free'):null,c=m?.cost?.text;
 if(c?.input?.price!==0||c?.output?.price!==0||(c.input.cache&&Object.values(c.input.cache).some(v=>v!==0)))throw Error('Free model pricing not verified; do not invoke');
 const bin=process.env.OPENCODE_BIN;if(!bin)throw Error('Pinned official OpenCode binary unavailable');
 for(const sub of ['home','config','data','work'])mkdirSync(join(dir,sub),{recursive:true});
 const cfg=join(dir,'work','opencode.json');
 writeFileSync(cfg,JSON.stringify({model,small_model:model,enabled_providers:['opencode'],provider:{opencode:{whitelist:['deepseek-v4.1-flash-free']}},permission:{'*':'deny'},autoupdate:false}));
 const env={PATH:process.env.PATH,HOME:join(dir,'home'),XDG_CONFIG_HOME:join(dir,'config'),XDG_DATA_HOME:join(dir,'data'),OPENCODE_CONFIG:cfg,OPENCODE_DISABLE_AUTOUPDATE:'1',OPENCODE_DISABLE_TELEMETRY:'1'};
 const v=spawnSync(bin,['--version'],{cwd:join(dir,'work'),env,encoding:'utf8',timeout:15000});
 if(v.status!==0||v.stdout.trim()!=='1.19.6')throw Error('OpenCode version not pinned');
 const list=spawnSync(bin,['models'],{cwd:join(dir,'work'),env,encoding:'utf8',timeout:30000});
 if(list.status!==0||!list.stdout.split(/\r?\n/).includes(model))throw Error('Exact signed-out model unavailable');
 const run=spawnSync(bin,['run','--model',model,'--format','json',prompt+'\n'+context],{cwd:join(dir,'work'),env,encoding:'utf8',timeout:90000,maxBuffer:4*1024*1024});
 writeFileSync(join(dir,'events.jsonl'),run.stdout||'');
 if(run.status!==0){writeFileSync(join(dir,'provider-status.json'),JSON.stringify({provider,model,exit:run.status,signal:run.signal,error:run.error?.code??null,retried:false}));throw Error('Official free CLI did not complete; no retry')}
 const ev=run.stdout.split(/\r?\n/).filter(Boolean).map(JSON.parse);
 if(ev.some(x=>x.type==='tool_use'||x.type==='error'))throw Error('Unexpected tool use or provider error');
 const raw=ev.filter(x=>x.type==='text').map(x=>x.part?.text??'').join('');
 const finishes=ev.filter(x=>x.type==='step_finish').map(x=>x.part||x);
 if(!raw||!finishes.length||finishes.some(x=>x.cost!==0||!x.tokens))throw Error('No explicit zero-cost completed usage receipt');
 const session=ev.find(x=>x.sessionID)?.sessionID??ev.find(x=>x.part?.sessionID)?.part?.sessionID;
 if(!/^ses_[A-Za-z0-9]+$/.test(session??''))throw Error('No exact session ID');
 const ex=spawnSync(bin,['export',session],{cwd:join(dir,'work'),env,encoding:'utf8',timeout:20000,maxBuffer:4*1024*1024});
 if(ex.status!==0)throw Error('Cannot verify observed model identity');
 const ids=[];(function walk(x){if(!x||typeof x!=='object')return;if(x.role==='assistant'&&typeof x.modelID==='string'&&typeof x.providerID==='string')ids.push(x.providerID+'/'+x.modelID);for(const v of Object.values(x))walk(v)})(JSON.parse(ex.stdout));
 if(!ids.length||ids.some(x=>x!==model))throw Error('Observed model missing or different');
 return {raw,actualModel:ids[0],usage:finishes.map(x=>x.tokens),cost:0,session};
}
let parts=[];
for(const chunk of chunks){
 const dir=join(root,chunk.key);mkdirSync(dir,{recursive:true});
 const context=JSON.stringify({source,contractHash,scenario:id,fixture:chunk,buttons:chunk.allowed,labels:labels.slice(0,3),ui:'Save draft returns to list; local publishing requires confirmation; View history shows immutable versions.'});
 const start=Date.now(),response=provider==='opencode'?await oc(context,dir):await groq(context,dir);
 const {raw,...observed}=response;writeFileSync(join(dir,'raw.txt'),raw+'\n');
 const artifact=parse(raw);try{validatePacket(chunk,artifact)}catch(e){writeFileSync(join(dir,'packet-rejected.json'),JSON.stringify({key:chunk.key,reason:e.message,artifact}));throw e}const receipt={schema:'course-author-chunk/v1',key:chunk.key,id,source,contractHash,contextSha256:sha(prompt+'\n'+context),artifactSha256:sha(JSON.stringify(artifact)),rawSha256:sha(raw+'\n'),provider,...observed,ms:Date.now()-start};
 writeFileSync(join(dir,'artifact.json'),JSON.stringify(artifact,null,2));writeFileSync(join(dir,'receipt.json'),JSON.stringify(receipt,null,2));
 parts.push({artifact,receipt});console.log(JSON.stringify({key:chunk.key,actualModel:receipt.actualModel,usage:receipt.usage,ms:receipt.ms,packetPassed:true}));
 if(provider==='groq'&&chunk!==chunks.at(-1))await new Promise(r=>setTimeout(r,12000));
}
const normalized={operations:parts.flatMap(p=>p.artifact.operations),limitations:parts.map(p=>p.artifact.limitations).join(' | ')};
if(normalized.operations.length>46)throw Error('Combined operation count exceeds frozen compiler limit');
const coverage=coverageIssues({cases:Object.fromEntries(COURSE_IDS.map(k=>[k,k===id?normalized.operations:[]]))}).filter(x=>x.id===id);
const receipt={schema:'course-chunk-assembly/v1',source,contractHash,id,model,provider,chunks:parts.map(p=>p.receipt),artifactSha256:sha(JSON.stringify(normalized)),coveragePassed:coverage.length===0,coverageIssues:coverage,executableGradePassed:false,roleAdmission:false,lockApproved:false};
writeFileSync(join(root,'normalized.json'),JSON.stringify(normalized,null,2));writeFileSync(join(root,'receipt.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify(receipt,null,2));
if(coverage.length)throw Error('Combined artifact missing locked acceptance evidence; reject');
