// No-key deterministic grade of exact authored cases. A clean failure cannot count as a killed mutant.
import {readFileSync,writeFileSync} from 'node:fs';import {createHash} from 'node:crypto';
const d=process.argv[2],sha=x=>createHash('sha256').update(x).digest('hex'),read=n=>JSON.parse(readFileSync(d+'/'+n));
const c=read('compiled.json'),support=read('support.json');
const mutations=[['missing-entry','001'],['pilot-mislabel','001'],['invalid-title','002'],['invalid-persist','002'],['drop-objective','003'],['overwrite-history','004'],['duplicate-history','004'],['dirty-bypass','005'],['dirty-copy','005'],['lost-fields-on-keep','005'],['network-leak','006']];
const id=s=>'CRS-01-SC-'+s,guard='GUARD-CRS-FLAG-OFF';
function result(label){
 const bytes=readFileSync(d+'/'+label+'.json'),j=JSON.parse(bytes),cases=[];
 const walk=s=>{for(const p of s.specs||[])for(const t of p.tests||[])cases.push({title:p.title,status:t.status,error:t.results.find(x=>x.error)?.error?.message?.slice(0,1200)??null});for(const x of s.suites||[])walk(x)};for(const s of j.suites||[])walk(s);
 return {label,sha256:sha(bytes),exit:Number(readFileSync(d+'/'+label+'.exit')),cases};
}
const clean=result('clean'),red=result('actual-red');
function exactCases(r,expected){return r.cases.length===expected.length&&new Set(r.cases.map(x=>x.title)).size===expected.length&&expected.every(k=>r.cases.some(x=>x.title===k))}
function ok(r,k){return r.cases.some(x=>x.title===k&&x.status==='expected'&&x.error===null)}
function assertion(s){return typeof s==='string'&&s.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g,'').includes('expect(')}
function failed(r,k){return r.exit===1&&r.cases.length===1&&r.cases[0].title===k&&r.cases[0].status==='unexpected'&&assertion(r.cases[0].error)}
const details=mutations.filter(([,s])=>c.positive.includes(id(s))).map(([mode,s])=>{const r=result(mode);return {mode,id:id(s),killed:ok(clean,id(s))&&failed(r,id(s)),result:r}});
const perCase=c.positive.map(k=>({id:k,clean:ok(clean,k),intendedRed:red.cases.some(x=>x.title===k&&x.status==='unexpected'&&assertion(x.error)&&x.error.includes('Courses')&&x.error.includes('toBeVisible')),defects:details.filter(m=>m.id===k).map(m=>({mode:m.mode,killed:m.killed}))}));
for(const x of perCase)x.passed=x.clean&&x.intendedRed&&x.defects.length>0&&x.defects.every(m=>m.killed);
const cleanPass=clean.exit===0&&exactCases(clean,c.positive)&&perCase.every(x=>x.clean);
const intendedRed=red.exit===1&&exactCases(red,c.positive)&&perCase.every(x=>x.intendedRed);
let guardGrade=null;
if(c.guard){const g=result('guard-clean'),gm=result('guard-mutant'),ag=result('actual-guard');guardGrade={clean:g,mutant:gm,actual:ag,passed:g.exit===0&&exactCases(g,[guard])&&ok(g,guard)&&failed(gm,guard)&&ag.exit===0&&exactCases(ag,[guard])&&ok(ag,guard)}}
const mutationRecall=details.filter(x=>x.killed).length;
const passed=cleanPass&&intendedRed&&mutationRecall===details.length&&(!c.guard||guardGrade?.passed===true);
const receipt={schema:'course-suite-grade/v1',source:c.source,contractHash:c.contractHash,testHash:c.testHash,guardHash:c.guardHash,supportHash:sha(readFileSync(d+'/support.json')),support,model:c.model,fullSuite:c.fullSuite,cleanPass,intendedRed,mutationRecall,mutationExpected:details.length,guard:guardGrade,perCase,clean,red,mutations:details,passed,fullSuitePassed:passed&&c.fullSuite&&c.positive.length===6&&mutationRecall===11&&guardGrade?.passed===true,roleAdmission:false,lockApproved:false};
writeFileSync(d+'/suite-grade.json',JSON.stringify(receipt,null,2));
console.log(JSON.stringify({schema:receipt.schema,fullSuite:receipt.fullSuite,fullSuitePassed:receipt.fullSuitePassed,passed:receipt.passed,cleanPass,intendedRed,mutationRecall,mutationExpected:details.length,guard:guardGrade?.passed??null,perCase}));
if(!passed)process.exitCode=1;
