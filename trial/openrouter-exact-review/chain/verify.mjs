// Verifies the exact retained experimental chain. Does not certify model identity cryptographically,
// semantic completeness beyond recorded criteria, live production eligibility or full role qualification.
import {readFileSync} from 'node:fs';
import {sha} from '../../nim-per-file/transport.mjs';
import {canonicalHash,rubric} from '../../../scripts/frontier-admission.mjs';
import {prepareFrontierCasebook,intakeFrontierArtifact} from '../../../scripts/frontier-casebook.mjs';
import {planningFixture} from '../../../scripts/frontier-planning-evaluator.mjs';
import {compilePlanningDelta} from '../../nim-hybrid-planning/compile.mjs';
import {verifyReviewProvenance} from '../provenance/gate.mjs';
const REVIEWS=['groq-qwen-provenance-20261128','groq-qwen-repaired-review-20261128','groq-qwen-repair2-review-20261128','groq-qwen-repair3-review-20261128'];
const REPAIRS=['nvidia-ultra-repair-20261128','nvidia-ultra-repair2-20261128','nvidia-ultra-repair3-20261128'];
const AUTHOR='nvidia/nemotron-3-ultra-550b-a55b',REVIEWER='qwen/qwen3.8-27b';
const check=(v,why)=>{if(!v)throw Error(why);};
export function verifyRepairChain(read){
 try{
  const j=p=>JSON.parse(read(p)),fixture=planningFixture('kiran-pjm-a','edge');
  const defs=Object.fromEntries(rubric.roles.map(({role})=>[role,readFileSync(new URL('../../../org/agents/'+role+'.md',import.meta.url),'utf8')]));
  const book=prepareFrontierCasebook({sourceSha:'cf041948862dd5523d55c527109a02c20169cdff',seed:'issue129-nim-20261128',roleDefinitions:defs});
  const c=book.cases.find(x=>x.fixture.role==='kiran-pjm-a'&&x.fixture.variant==='edge');
  function project(raw,dir){
   const compiled=compilePlanningDelta('kiran-pjm-a','edge',raw),artifact=intakeFrontierArtifact(c.fixture,{files:compiled.files});
   check(compiled.grade.passed===12&&compiled.grade.expected===12&&compiled.grade.qualified===true,'locked-12-checks');
   check(canonicalHash(artifact)===canonicalHash(j(dir+'/projected-artifact.json'))&&canonicalHash(compiled.grade)===canonicalHash(j(dir+'/grade.json')),'projection-mismatch');
   return artifact;
  }
  let raw=read('source-ultra/author.raw.json'),artifact=project(raw,'source-ultra');
  check(sha(raw)==='c5115b43163ad3424b121d21d3686a3e34977d039f109f740f85649bb3c1ed83'&&artifact.artifactHash==='22d6152abb88911f73fa821358fdb41548d64884b08fecca548d9f3b93607a34','source-mismatch');
  const usage={prompt_tokens:0,completion_tokens:0,total_tokens:0};
  function receipt(dir,role,model,report){
   const text=read(dir+'/'+role+'/01.raw.txt'),r=j(dir+'/'+role+'/01.receipt.json');
   check(r.status==='accepted'&&r.reportedModel===model&&r.finishReason==='stop'&&r.httpStatus===200&&r.rawHash===sha(text),'receipt-invalid');
   const summary=report.receipt;check(summary?.rawHash===r.rawHash&&summary?.model===model&&summary?.status==='accepted'&&summary?.finish==='stop'&&canonicalHash(summary.usage)===canonicalHash(r.usage),'receipt-summary-mismatch');
   for(const k of Object.keys(usage)){check(Number.isSafeInteger(r.usage?.[k])&&r.usage[k]>=0,'usage-invalid');usage[k]+=r.usage[k];}
   return {text,hash:r.rawHash};
  }
  for(let i=0;i<REVIEWS.length;i++){
   const dir=REVIEWS[i],report=j(dir+'/report.json'),r=receipt(dir,'review',REVIEWER,report);
   check(report.rawDecisionHash===sha(raw)&&report.artifactHash===artifact.artifactHash&&report.qualification===false,'review-input-mismatch');
   const verdict=JSON.parse(r.text),expected=i===REVIEWS.length-1?'APPROVE':'CHANGES';
   check(verdict.verdict===expected&&canonicalHash(verdict)===canonicalHash(report.verdict),'verdict-mismatch');
   const graph=JSON.parse(artifact.files.find(x=>x.path==='task-graph.json').content);
   const criteria=[{id:'authority-transfer',source:'AUTHOR'},{id:'dependency-next-steps',source:'AUTHOR'},...(i?[{id:'honest-execution-status',source:'AUTHOR'}]:[]),{id:'actual-lease',source:'CONTROLLER'}];
   check(verifyReviewProvenance({author:JSON.parse(raw).handover,controller:JSON.stringify({fixture,graph}),criteria,review:verdict}).valid===true&&report.provenance?.valid===true,'provenance-invalid');
   if(i===REVIEWS.length-1)break;
   const repairDir=REPAIRS[i],repair=j(repairDir+'/report.json'),a=receipt(repairDir,'author',AUTHOR,repair);
   check(repair.originalRawHash===sha(raw)&&repair.originalArtifactHash===artifact.artifactHash&&repair.reviewRawHash===r.hash&&repair.newRawHash===a.hash&&repair.qualification===false,'repair-link-mismatch');
   raw=a.text;artifact=project(raw,repairDir);
   check(repair.newArtifactHash===artifact.artifactHash&&repair.passed===12&&repair.expected===12,'repaired-artifact-mismatch');
  }
  return {valid:true,reviewCount:4,repairCount:3,finalVerdict:'APPROVE',finalArtifact:artifact.artifactHash,usage,qualification:false,unattended:false,productionReady:false};
 }catch(e){return {valid:false,reason:String(e.message).slice(0,120),qualification:false};}
}
