import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
export const AUTHOR='nvidia/nemotron-3.5-lightning-30b-a3b';
export const REVIEWER='nvidia/nemotron-3.5-super-vl-120b-a12b';
export const CONTRACT=await readFile(new URL('./contract.md',import.meta.url),'utf8');
export const TESTS=await readFile(new URL('./locked.test.txt',import.meta.url),'utf8');
export const hash=x=>createHash('sha256').update(x).digest('hex');
export const contractHash=hash(CONTRACT), testHash=hash(TESTS);
export const head=process.env.TRIAL_HEAD||'';
export const requireHead=()=>{if(!/^[a-f0-9]{40}$/.test(head))throw Error('missing exact trial head')};
export const read=(d,f)=>readFile(join(d,f),'utf8');
export const json=async(d,f)=>JSON.parse(await read(d,f));
export const save=async(d,f,x)=>{await mkdir(d,{recursive:true});await writeFile(join(d,f),typeof x==='string'?x:JSON.stringify(x,null,2)+'\n',{mode:0o600})};
export const validReceipt=(r,phase,model,result)=>r?.status==='accepted'&&r.phase===phase&&r.model===model&&r.reportedModel===model&&r.sourceSha===head&&r.contractHash===contractHash&&r.resultHash===hash(result)&&r.finishReason==='stop';
export function releaseInputs(candidateHash){
 requireHead();const clean={ci:'pass',releaseSha:head,artifactSha:head,ciSha:head,founderOnly:true,publicFlag:false,smoke:'pass',rollbackRehearsed:true,authorization:'founder-only-rehearsal'};
 return [
  {id:'clean-rehearsal',candidateHash,inputs:clean},
  {id:'failed-smoke',candidateHash,inputs:{...clean,smoke:'fail'}},
  {id:'mismatched-revision',candidateHash,inputs:{...clean,artifactSha:'f'.repeat(40)}},
  {id:'no-authorization',candidateHash,inputs:{...clean,authorization:'none'}}
 ];
}
export const validCandidate=c=>typeof c==='string'&&c.length>30&&Buffer.byteLength(c)<=12000&&/^export function selectDue\s*\(/.test(c.trim())&&!/\b(?:import|require|process|globalThis|console|fetch|eval|Function|WebAssembly|setTimeout|setInterval|Buffer|Deno|Bun|constructor|prototype|__proto__)\b/.test(c)&&!c.includes('\u0000')&&[...c.matchAll(/\bexport\b/g)].length===1;
export const validGrade=(g,c)=>g?.status==='accepted'&&g.sourceSha===head&&g.contractHash===contractHash&&g.testHash===testHash&&g.candidateHash===hash(c)&&g.behavior?.status==='behavior-pass'&&g.behavior.counts.tests===12&&g.behavior.counts.pass===12&&g.behavior.exitCode===0;
export const exactKeys=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join(',')===[...keys].sort().join(',');
export const textValue=v=>typeof v==='string'&&v.trim().length>0&&v.length<=1000;
export const stringList=v=>Array.isArray(v)&&v.length>0&&v.length<=20&&v.every(textValue);
export const validPlan=v=>exactKeys(v,['summary','invariants','edgeCases'])&&textValue(v.summary)&&stringList(v.invariants)&&stringList(v.edgeCases);
export const reviewIds=['tenant','validation','ordering','immutability'];
export function validReview(v,c){
 return exactKeys(v,['verdict','candidateHash','checks','findings'])&&['APPROVE','CHANGES'].includes(v.verdict)&&v.candidateHash===hash(c)&&
 Array.isArray(v.checks)&&v.checks.length===reviewIds.length&&reviewIds.every(id=>v.checks.filter(x=>x?.id===id).length===1)&&
 v.checks.every(x=>exactKeys(x,['id','pass','evidence'])&&typeof x.pass==='boolean'&&textValue(x.evidence))&&Array.isArray(v.findings)&&v.findings.length<=10&&v.findings.every(textValue)&&
 (v.verdict==='APPROVE'?v.checks.every(x=>x.pass)&&v.findings.length===0:v.findings.length>0);
}