// Evaluation-only Course QA author: bounded fresh contexts, exact receipts, no product access.
import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {selectExecutionStrategy} from '../../scripts/execution-strategy.mjs';
import {COURSE_IDS,coverageIssues} from '../../scripts/course-pilot/declarative-coverage.mjs';
import {compileCourseOperation,buttons,tabs,labels} from '../../scripts/course-pilot/declarative-compiler.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex'),gitBlob=x=>createHash('sha1').update('blob '+x.length+'\0').update(x).digest('hex');
const source='710082b2d8cf3c1007086df31f87b34ae8e02573',contractHash='6695ab62149003b833c1afa04a2f6e674db3494efe7048864357095de07176aa',provider='groq',model='qwen/qwen3.8-27b';
const contract=readFileSync(new URL('./coach-course-management.CONTRACT.md',import.meta.url));if(sha(contract)!==contractHash)throw Error('Locked contract changed');
const strategy=selectExecutionStrategy({engine:'free',stage:'ai:tests',model:provider+'/'+model});
const id=n=>COURSE_IDS[n-1],guard=COURSE_IDS[6],initial=labels.slice(0,3),full=[...initial,labels[3],labels[4],labels[5]];
const fixture=Object.fromEntries(full.map((l,i)=>[l,['Course River','Stage River','Observe water','Draw river','Stage Hills','Compare heights'][i]]));
const rows=[
 {id:id(1),parts:[{key:'entry',start:'Authenticated Today; Courses available, empty course list.',goal:'Open Courses. Prove heading Courses, exact honest pilot label, No courses yet, Create course button, all original five tabs. Stay on course list.',allowed:['Courses','Create course']}]},
 {id:id(2),parts:[{key:'invalid',start:'Authenticated Today; Courses available; empty list.',goal:'Enter Courses and create form. Prove all three initial accessible inputs before save. Leave Course title blank; fill both other fields with distinct nonblank fictional values. Click Save draft; prove exact visible Course title is required, then exact preservation of both entered values. Navigate using Today tab, prove exact leave dialog, choose Discard and leave. Reopen Courses and prove No courses yet. Stay on course list.',allowed:['Courses','Create course','Save draft','Discard and leave']}]},
 {id:id(3),parts:[{key:'create-ordered',start:'Authenticated Today; Courses available; empty list.',goal:'Enter Courses, create and fill all six fixed fixture values. Add stage and objective specifically to stage 1, fill added fields only after creation. Save draft, prove exact title Course River and Draft on list. End on list. Do not edit until next packet.',allowed:['Courses','Create course','Add stage','Add objective to stage 1','Save draft'],fixture},{key:'restore-ordered',start:'Course River draft has just been saved on Courses list, with all six fixed fixture values.',goal:'From list open Edit course; assert every exact restored value and complete input order: course title, stage 1 title, stage 1 objective 1, stage 1 objective 2, stage 2 title, stage 2 objective 1. End in editor.',allowed:['Edit course'],fixture}]},
 {id:id(5),parts:[{key:'dirty',start:'Authenticated Today; Courses available; empty list.',goal:'Enter Courses and create form. Populate all three initial fields with distinct nonblank values. Navigate using Today tab, assert visible exact leave dialog, choose Keep editing, assert every entered value remains. Navigate Today again, prove exact dialog, choose Discard and leave, reopen Courses and prove No courses yet.',allowed:['Courses','Create course','Keep editing','Discard and leave']}]},
 {id:id(6),parts:[{key:'session-local',start:'Authenticated Today; Courses available; empty list.',goal:'Enter Courses/create form, fill valid all three initial inputs, save, prove exact draft title on list. Navigate via Today tab and reopen Courses, prove same exact title and exact Course pilot — not synced; finally assert no course/curriculum traffic. End on list.',allowed:['Courses','Create course','Save draft']}]},
 {id:guard,parts:[{key:'flag-off',start:'Authenticated Today, flag OFF. Courses is absent.',goal:'Prove authenticated Today tab is visible, Courses exact button is absent, and zero course/curriculum network calls. No navigation or actions.',allowed:['Courses']}]}
];
const map={clickButton:'B',clickTab:'T',fillInput:'F',assertInputValue:'V',assertInputVisible:'I',assertHeading:'H',assertText:'X',assertTextAbsent:'NX',assertButtonVisible:'VB',assertButtonAbsent:'NB',assertTabVisible:'VT',assertTextCount:'N',assertFieldOrder:'O',assertNoCourseTraffic:'NET'};
const prompt='Independent Quinn QA author. One small locked browser acceptance packet in a fresh context. Work out your own ordered actions and evidence. Start and end exactly in the stated location. Exact authorized labels only. A click is not a visibility assertion. No code, execution claims, extra cases or network access. Return only {"operations":[...],"limitations":"..."}; 3–30 operations. Allowed JSON operation examples: ["clickButton","name"],["clickTab","tab"],["fillInput","label","value"],["assertInputValue","label","value"],["assertInputVisible","label"],["assertHeading","text"],["assertText","exact text"],["assertTextAbsent","text"],["assertButtonVisible","name"],["assertButtonAbsent","name"],["assertTabVisible","tab"],["assertTextCount","text",1],["assertFieldOrder",["label",...]],["assertNoCourseTraffic"].';
const ui='Source-bound: pinned App.tsx Today uses dynamic greeting, NOT heading Today. Do not assert a Today heading or an unspecified editor heading. Actual five tabs are role tab. Courses is exact button. Save draft returns to list; Edit course opens form. Existing dirty confirmation is exactly Leave your unsaved changes?; Keep editing stays in dirty form, Discard and leave goes Today. Honest pilot label exactly Course pilot — not synced. Add stage and Add objective to stage 1 are exact buttons. Test against fictional in-memory fixtures, no production data.';
function context(row,part,feedback=null){return JSON.stringify({source,contractHash,scenario:row.id,fixture:part,buttons:part.allowed,tabs,labels,ui,feedback})}
function parse(raw){const a=JSON.parse(raw.trim().replace(/^\x60\x60\x60(?:json)?\s*|\s*\x60\x60\x60$/g,''));if(Object.keys(a).sort().join()!=='limitations,operations'||typeof a.limitations!=='string'||a.limitations.length>1500||!Array.isArray(a.operations)||a.operations.length<3||a.operations.length>30)throw Error('Invalid packet JSON shape');return {operations:a.operations.map(op=>{if(!Array.isArray(op)||!Object.hasOwn(map,op[0]))throw Error('Unapproved action');const o=[map[op[0]],...op.slice(1)];compileCourseOperation(o);return o}),limitations:a.limitations}}
function issues(id,ops){return coverageIssues({cases:Object.fromEntries(COURSE_IDS.map(k=>[k,k===id?ops:[]]))}).filter(x=>x.id===id)}
const has=(o,k,v,w)=>o.some(p=>p[0]===k&&(v===undefined||p[1]===v)&&(w===undefined||p[2]===w));
function validate(row,part,a){
 const o=a.operations;
 if(o.some(p=>['B','VB','NB'].includes(p[0])&&!part.allowed.includes(p[1])||p[0]==='H'&&p[1]!=='Courses'||p[0]==='T'&&p[1]!=='Today'))throw Error('Packet crossed allowed source-bound UI transition');
 if(row.parts.length===1){const x=issues(row.id,o);if(x.length)throw Error(x.map(v=>v.reason).join('; '));if(row.id===id(5)&&!initial.every(l=>o.some(p=>p[0]==='F'&&p[1]===l&&p[2].trim())))throw Error('Dirty packet needs all three populated fields to prove loss-of-fields control');if(row.id===guard&&o.some(p=>['B','T','F'].includes(p[0])))throw Error('Flag-off test must not take actions');return;}
 if(part.key==='create-ordered'){
  const find=(k,v)=>o.findIndex(p=>p[0]===k&&p[1]===v),b=find('B','Courses'),c=find('B','Create course'),s=find('B','Save draft'),stage=find('B','Add stage'),obj=find('B','Add objective to stage 1');
  if(!(b>=0&&c>b&&stage>c&&obj>c&&s>stage&&s>obj&&full.every(l=>{const i=o.findIndex(p=>p[0]==='F'&&p[1]===l&&p[2]===fixture[l]);return i>c&&i<s&&(!l.startsWith('Stage 2')||i>stage)&&(l!=='Stage 1 objective 2'||i>obj)})&&o.findIndex((p,i)=>i>s&&p[0]==='X'&&p[1]===fixture['Course title'])>=0&&o.findIndex((p,i)=>i>s&&p[0]==='X'&&p[1]==='Draft')>o.findIndex((p,i)=>i>s&&p[0]==='X'&&p[1]===fixture['Course title'])))throw Error('Ordered create packet missing creation, exact data, or saved list evidence');
 }else if(part.key==='restore-ordered'){
  if(o[0][0]!=='B'||o[0][1]!=='Edit course'||!full.every(l=>has(o.slice(1),'V',l,fixture[l]))||!o.slice(1).some(p=>p[0]==='O'&&JSON.stringify(p[1])===JSON.stringify(full)))throw Error('Edit packet missing exact restored values or field order');
 }else throw Error('Unknown packet');
}
function checkPacket(row,part,dir){
 const raw=readFileSync(join(dir,'raw.txt'),'utf8'),a=JSON.parse(readFileSync(join(dir,'artifact.json'))),r=JSON.parse(readFileSync(join(dir,'receipt.json'))),ctx=readFileSync(join(dir,'context.json'),'utf8');
 const feedback=JSON.parse(ctx).feedback;if(feedback!==null&&(typeof feedback!=='string'||feedback.length>1800))throw Error('Invalid repair context');
 if(ctx!==context(row,part,feedback)||r.schema!=='course-suite-packet/v1'||r.id!==row.id||r.key!==part.key||r.source!==source||r.contractHash!==contractHash||r.actualModel!==model||r.provider!==provider||r.contextSha256!==sha(prompt+'\n'+ctx)||r.rawSha256!==sha(raw)||r.artifactSha256!==sha(JSON.stringify(a))||JSON.stringify(parse(raw))!==JSON.stringify(a)||!Number.isSafeInteger(r.usage?.total_tokens)||r.usage.total_tokens<=0)throw Error('Exact packet receipt mismatch '+row.id+'/'+part.key);
 validate(row,part,a);return {artifact:a,receipt:r};
}
const oldBundle='trial/evidence/course/46058881332/chunk-complete-bundle.json',oldGrade='trial/evidence/course/46058881332/single-case-grade.json';
function prior004(){
 const b=readFileSync(new URL('../evidence/course/46058881332/chunk-complete-bundle.json',import.meta.url)),g=readFileSync(new URL('../evidence/course/46058881332/single-case-grade.json',import.meta.url));
 if(gitBlob(b)!=='54afcfe1f0e556f153c0d8ce41468f3989633156'||gitBlob(g)!=='8ff71145059ee68e3305340452ffe4d7177684d6')throw Error('Published SC004 checkpoint mismatch');
 const v=JSON.parse(b),grade=JSON.parse(g);if(v.runId!==46058881332||v.files.some(f=>sha(f.utf8)!==f.sha256)||grade.passed!==true||grade.source!==source||grade.contractHash!==contractHash||grade.roleAdmission!==false||grade.lockApproved!==false)throw Error('Prior grade identity mismatch');
 const get=n=>{const f=v.files.find(x=>x.file===n);if(!f)throw Error('Missing prior file');return f.utf8};
 const a=JSON.parse(get('normalized.json')),r=JSON.parse(get('receipt.json'));if(r.source!==source||r.contractHash!==contractHash||r.id!==id(4)||r.model!==model||r.coveragePassed!==true||r.artifactSha256!==sha(JSON.stringify(a))||r.artifactSha256!==grade.artifactSha256||issues(id(4),a.operations).length)throw Error('Prior SC004 author mismatch');
 const ops=[];for(const k of ['saved-draft','publish-first','publish-second','immutable-history']){const raw=get(k+'/raw.txt'),p=JSON.parse(get(k+'/artifact.json')),q=JSON.parse(get(k+'/receipt.json'));if(q.actualModel!==model||q.source!==source||q.contractHash!==contractHash||q.rawSha256!==sha(raw)||q.artifactSha256!==sha(JSON.stringify(p))||JSON.stringify(parse(raw))!==JSON.stringify(p)||JSON.stringify(q)!==JSON.stringify(r.chunks.find(x=>x.key===k)))throw Error('Prior SC004 packet mismatch');ops.push(...p.operations)}
 if(JSON.stringify(ops)!==JSON.stringify(a.operations))throw Error('Prior SC004 assembly mismatch');
 return {operations:a.operations,origin:{runId:46058881332,artifact:oldBundle,grade:oldGrade,artifactSha256:r.artifactSha256,testHash:grade.testHash,inference:false}};
}
const resumeIndexURL=new URL('../evidence/course/suite-resume-index.json',import.meta.url);
function restore(row,part,dir){
 if(!existsSync(resumeIndexURL))return null;
 const index=JSON.parse(readFileSync(resumeIndexURL));if(index.schema!=='course-suite-resume/v1'||index.source!==source||index.contractHash!==contractHash||!Array.isArray(index.bundles))throw Error('Invalid resume index');
 for(const item of index.bundles){
  if(!/^trial\/evidence\/course\/[0-9]+\/suite-author-bundle\.json$/.test(item.path)||!/^[a-f0-9]{40}$/.test(item.blob))throw Error('Untrusted resume location');
  const bytes=readFileSync(new URL('../../'+item.path,import.meta.url));if(gitBlob(bytes)!==item.blob)throw Error('Resume blob mismatch');
  const bundle=JSON.parse(bytes);if(bundle.runId!==item.runId||!Array.isArray(bundle.files)||bundle.files.some(f=>sha(f.utf8)!==f.sha256))throw Error('Resume bundle mismatch');
  const prefix=row.id+'/'+part.key+'/',names=['artifact.json','receipt.json','raw.txt','context.json'];
  if(!names.every(n=>bundle.files.some(f=>f.file===prefix+n)))continue;
  for(const n of names)writeFileSync(join(dir,n),bundle.files.find(f=>f.file===prefix+n).utf8);
  const r=checkPacket(row,part,dir);writeFileSync(join(dir,'resume-origin.json'),JSON.stringify({runId:item.runId,blob:item.blob,artifactSha256:r.receipt.artifactSha256}));return r;
 }return null;
}
class RouteBlocked extends Error{}
async function invoke(ctx,dir,number,retry=0){
 const key=process.env.GROQ_API_KEY;if(!key)throw new RouteBlocked('Approved developer credential unavailable');
 const start=Date.now();let r;
 try{r=await fetch('https://api.groq.com/openai/v1/chat/completions',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model,temperature:0,max_completion_tokens:strategy.packet.completionTokenLimit,messages:[{role:'system',content:prompt},{role:'user',content:ctx}]}),redirect:'error',signal:AbortSignal.timeout(75000)})}catch(e){writeFileSync(join(dir,'provider-status.json'),JSON.stringify({provider,model,transportError:e.name,attempt:number,retry}));throw new RouteBlocked('Free route transport failure')}
 const limits=Object.fromEntries(['retry-after','x-ratelimit-reset-requests','x-ratelimit-reset-tokens','x-ratelimit-remaining-requests','x-ratelimit-remaining-tokens'].map(k=>[k,r.headers.get(k)]));
 if(!r.ok){writeFileSync(join(dir,'provider-status.json'),JSON.stringify({provider,model,status:r.status,limits,attempt:number,retry}));const delay=Number(limits['retry-after']);if(r.status===429&&retry<strategy.quota.maxTransientRetries&&Number.isFinite(delay)&&delay>0&&delay<=strategy.quota.maxInlineRetrySeconds){await new Promise(r=>setTimeout(r,(delay+2)*1000));return invoke(ctx,dir,number,retry+1)}throw new RouteBlocked('Free route HTTP '+r.status+'; checkpoint saved; no alternate paid route')}
 const j=await r.json(),c=j.choices?.[0];if(j.model!==model||c?.finish_reason!=='stop'||typeof c.message?.content!=='string'||!Number.isSafeInteger(j.usage?.total_tokens)||j.usage.total_tokens<=0)throw new RouteBlocked('Exact model or completion evidence missing');
 return {raw:c.message.content+'\n',observed:{actualModel:j.model,usage:j.usage,limits,ms:Date.now()-start}};
}
async function author(root){
 mkdirSync(root,{recursive:true});const complete=[],partial=[],errors=[],restored=[],newPackets=[];prior004();
 let blocked=false;
 for(const row of rows){
  if(blocked)break;
  const rowDir=join(root,row.id);mkdirSync(rowDir,{recursive:true});const parts=[];
  for(const part of row.parts){
   const dir=join(rowDir,part.key);mkdirSync(dir,{recursive:true});const recovered=restore(row,part,dir);
   if(recovered){parts.push(recovered);restored.push(row.id+'/'+part.key);console.log(JSON.stringify({id:row.id,key:part.key,checkpointRestored:true,inference:false}));continue;}
   let feedback=null,accepted=null;
   for(let i=0;i<=Math.min(1,strategy.packet.repairRounds);i++){
    const ctx=context(row,part,feedback),attemptDir=join(dir,'attempt-'+(i+1));mkdirSync(attemptDir,{recursive:true});writeFileSync(join(attemptDir,'context.json'),ctx);
    try{
     const {raw,observed}=await invoke(ctx,attemptDir,i+1);writeFileSync(join(attemptDir,'raw.txt'),raw);writeFileSync(join(attemptDir,'observed.json'),JSON.stringify(observed));
     const artifact=parse(raw);validate(row,part,artifact);
     const receipt={schema:'course-suite-packet/v1',id:row.id,key:part.key,source,contractHash,provider,contextSha256:sha(prompt+'\n'+ctx),rawSha256:sha(raw),artifactSha256:sha(JSON.stringify(artifact)),...observed};
     writeFileSync(join(dir,'raw.txt'),raw);writeFileSync(join(dir,'context.json'),ctx);writeFileSync(join(dir,'artifact.json'),JSON.stringify(artifact,null,2));writeFileSync(join(dir,'receipt.json'),JSON.stringify(receipt,null,2));
     accepted=checkPacket(row,part,dir);newPackets.push({id:row.id,key:part.key,tokens:receipt.usage.total_tokens});console.log(JSON.stringify({id:row.id,key:part.key,passed:true,tokens:receipt.usage.total_tokens}));break;
    }catch(e){
     if(e instanceof RouteBlocked){errors.push({id:row.id,key:part.key,reason:e.message,blocked:true});blocked=true;break;}
     feedback=String(e.message).slice(0,1600);writeFileSync(join(attemptDir,'rejected.json'),JSON.stringify({reason:feedback}));console.log(JSON.stringify({id:row.id,key:part.key,attempt:i+1,reason:feedback}));
    }
    await new Promise(r=>setTimeout(r,strategy.quota.interPacketDelaySeconds*1000));
   }
   if(!accepted){if(!blocked)errors.push({id:row.id,key:part.key,reason:feedback,blocked:false});break;}
   parts.push(accepted);
   await new Promise(r=>setTimeout(r,strategy.quota.interPacketDelaySeconds*1000));
  }
  if(parts.length===row.parts.length){const operations=parts.flatMap(p=>p.artifact.operations),errorsForCase=issues(row.id,operations);if(operations.length>46||errorsForCase.length){errors.push({id:row.id,reason:'Assembly coverage failed',errors:errorsForCase});partial.push(row.id)}else{writeFileSync(join(rowDir,'case.json'),JSON.stringify({id:row.id,operations,receipts:parts.map(p=>p.receipt)},null,2));complete.push(row.id)}}
  else partial.push(row.id);
 }
 const summary={schema:'course-suite-author/v1',source,contractHash,model,provider,prior004:true,complete,partial,errors,restored,newPackets,blocked,fullSuiteComplete:complete.length===rows.length,roleAdmission:false,lockApproved:false};writeFileSync(join(root,'summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary,null,2));if(process.env.GITHUB_OUTPUT)writeFileSync(process.env.GITHUB_OUTPUT,'accepted='+complete.length+'\n',{flag:'a'});
}
function verify(root,out){
 mkdirSync(out,{recursive:true});const cases={[id(4)]:prior004().operations},origins={[id(4)]:prior004().origin},contextHashes=new Set();const exact=JSON.parse(readFileSync(join(root,'summary.json')));
 if(exact.source!==source||exact.contractHash!==contractHash||exact.model!==model||exact.provider!==provider||!Array.isArray(exact.complete)||exact.complete.some(k=>!rows.some(r=>r.id===k))||new Set(exact.complete).size!==exact.complete.length)throw Error('Author summary mismatch');
 for(const row of rows){
  if(!exact.complete.includes(row.id))continue;const parts=row.parts.map(p=>checkPacket(row,p,join(root,row.id,p.key))),ops=parts.flatMap(x=>x.artifact.operations),caseReceipt=JSON.parse(readFileSync(join(root,row.id,'case.json')));
  if(caseReceipt.id!==row.id||JSON.stringify(caseReceipt.operations)!==JSON.stringify(ops)||JSON.stringify(caseReceipt.receipts)!==JSON.stringify(parts.map(p=>p.receipt))||ops.length>46||issues(row.id,ops).length)throw Error('Exact case assembly mismatch '+row.id);
  for(const p of parts){if(contextHashes.has(p.receipt.contextSha256))throw Error('Reused context');contextHashes.add(p.receipt.contextSha256)}
  cases[row.id]=ops;origins[row.id]=parts.map(p=>p.receipt);
 }
 const header="import { test, expect } from '@playwright/test';\nimport { backend, login } from '../support/backend';\n";
 function render(k){return "test("+JSON.stringify(k)+", async ({page})=>{\n    const networkRequests:string[]=[];\n    page.on('request',req=>{if(/course|curriculum/i.test(req.url()))networkRequests.push(req.url());});\n    await backend(page,{academy:true}); await login(page);\n"+(k===guard?'':"    await expect(page.getByRole('button',{name:'Courses',exact:true})).toBeVisible();\n")+cases[k].map(compileCourseOperation).map(s=>'    '+s).join('\n')+'\n});\n'}
 const positive=COURSE_IDS.slice(0,6).filter(k=>Object.hasOwn(cases,k)),spec=header+positive.map(render).join('\n'),guardSpec=Object.hasOwn(cases,guard)?header+render(guard):null;
 writeFileSync(join(out,'suite.spec.ts'),spec);if(guardSpec)writeFileSync(join(out,'guard.spec.ts'),guardSpec);
 const receipt={schema:'course-suite-compiled/v1',source,contractHash,model,positive,guard:!!guardSpec,fullSuite:positive.length===6&&!!guardSpec,testHash:sha(spec),guardHash:guardSpec?sha(guardSpec):null,origins,roleAdmission:false,lockApproved:false};writeFileSync(join(out,'compiled.json'),JSON.stringify(receipt,null,2));console.log(JSON.stringify({positive,guard:!!guardSpec,fullSuite:receipt.fullSuite,testHash:receipt.testHash}));
}
const [mode,a,b]=process.argv.slice(2);
if(mode==='author'){if(!process.env.RUNNER_TEMP)throw Error('Missing runner directory');await author(join(process.env.RUNNER_TEMP,'course-suite-author'))}
else if(mode==='verify'&&a&&b)verify(a,b);else throw Error('Use author or verify <artifact dir> <output>');
