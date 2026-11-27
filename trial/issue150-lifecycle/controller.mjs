// Controller only; this process must never receive hosted model keys.
import assert from 'node:assert/strict';
import {evaluateReviewReproduction} from '../../scripts/frontier-board-evaluator.mjs';
import {gateDecision,qaChainStep,checksState} from '../../scripts/loop.mjs';
import {inspectSamPlan} from '../../scripts/frontier-release-evaluator.mjs';
import {AUTHOR,REVIEWER,CONTRACT,TESTS,contractHash,testHash,head,requireHead,hash,read,json,save,validReceipt,validCandidate,validGrade,validReview,releaseInputs} from './shared.mjs';
const [phase,out,...dirs]=process.argv.slice(2),image=process.env.TRIAL_NODE_IMAGE||'';
const base={schema:1,scope:'isolated-synthetic',issue:150,phase,sourceSha:head,contractHash,testHash,image,status:'blocked',qualified:false,productionReady:false,deployed:false};
const evalCode=code=>evaluateReviewReproduction(code,TESTS,{image});
const pass=r=>r.status==='behavior-pass'&&r.counts.tests===12&&r.counts.pass===12&&r.exitCode===0;
const fail=r=>r.status==='behavior-fail'&&r.counts.tests===12&&r.counts.fail>0&&r.exitCode===1;
const summary=r=>({status:r.status,tests:r.counts.tests,pass:r.counts.pass,fail:r.counts.fail,exitCode:r.exitCode,candidateHash:r.candidateHash,lockedTestHash:r.lockedTestHash});
const pre=async()=>{
 const c=await read(new URL('.',import.meta.url).pathname,'reference.txt');
 assert.ok(validCandidate(c));
 const cases=[
  ['reference',c,true],
  ['missing-feature-red',"export function selectDue(){return []}\n",false],
  ['tenant-leak',c.replace('if(row.tenant!==tenant)continue;','if(false)continue;'),false],
  ['exclusive-due',c.replace('row.dueAt<=now','row.dueAt<now'),false],
  ['missing-duplicate-guard',c.replace("if(seen.has(row.id))throw new Error('duplicate id');","if(false)throw new Error('duplicate id');"),false]
 ];
 base.controls=[];
 for(const [id,code,shouldPass] of cases){
   if(id!=='reference')assert.notEqual(code,c);
   const r=await evalCode(code);
   base.controls.push({id,...summary(r)});
   assert.equal(r.lockedTestHash,testHash);
   assert.ok(shouldPass?pass(r):fail(r),'control '+id+' failed expected disposition');
 }
 base.canonicalControl={
  acceptancePending:gateDecision([]),acceptanceRed:gateDecision([{context:'acceptance-gate',state:'failure'}],2,2),
  acceptancePass:gateDecision([{context:'acceptance-gate',state:'success'}]),
  independentChallengeRequired:qaChainStep({raci:{reviewer:'Rex',accountable:'Arjun'}}),
  accountableSignoffRequired:qaChainStep({raci:{reviewer:'Rex',accountable:'Arjun'},verdicts:{challenger:'approve'}}),
  bothApproved:qaChainStep({raci:{reviewer:'Rex',accountable:'Arjun'},verdicts:{challenger:'approve',signoff:'approve'}})
 };
 assert.deepEqual(base.canonicalControl,{acceptancePending:'wait',acceptanceRed:'block',acceptancePass:'build',independentChallengeRequired:'challenge',accountableSignoffRequired:'signoff',bothApproved:'build'});
};
async function build(d){
 const code=await read(d,'board.mjs'),receipt=await json(d,'call.json');
 assert.ok(validReceipt(receipt,'build',AUTHOR,code)&&validCandidate(code),'build provenance/intake');
 return code;
}
async function grade(){
 const code=await build(dirs[0]);base.candidateHash=hash(code);
 base.behavior=await evalCode(code);
 assert.equal(base.behavior.candidateHash,base.candidateHash);assert.equal(base.behavior.lockedTestHash,testHash);
 assert.ok(pass(base.behavior),'candidate failed locked controls');
}
async function release(){
 const code=await build(dirs[0]),g=await json(dirs[1],'grade.json');assert.ok(validGrade(g,code)&&g.image===image,'grade provenance');
 const review=await read(dirs[2],'review.json'),rr=await json(dirs[2],'call.json');
 assert.ok(validReceipt(rr,'review',REVIEWER,review)&&AUTHOR!==REVIEWER&&validReview(JSON.parse(review),code)&&JSON.parse(review).verdict==='APPROVE','independent model review');
 const plan=await read(dirs[3],'release-plan.json'),rp=await json(dirs[3],'call.json');assert.ok(validReceipt(rp,'release',AUTHOR,plan),'release plan provenance');
 const plans=JSON.parse(plan);const cases=releaseInputs(hash(code));
 base.candidateHash=hash(code);base.reviewHash=hash(review);base.releasePlanHash=hash(plan);base.reviewModel=REVIEWER;
 base.releaseControls=cases.map(c=>({id:c.id,...inspectSamPlan(plans.find(p=>p.id===c.id),c)}));
 assert.ok(base.releaseControls.every(x=>x.planMatches),'release safety control');
 base.smoke=await evalCode(code);assert.ok(pass(base.smoke)&&base.smoke.candidateHash===base.candidateHash&&base.smoke.lockedTestHash===testHash,'exact artifact smoke');
 base.canonicalChecks=checksState([{name:'acceptance',status:'completed',conclusion:'success'}],['acceptance']);
 assert.equal(base.canonicalChecks,'success');
 base.publicFlag=false;base.previewSimulated=true;base.actualReleaseAuthorized=false;base.rollbackSimulated=true;
}
try{
 requireHead();assert.ok(!process.env.NVIDIA_NIM_API_KEY&&!process.env.GROQ_API_KEY,'key-free controller required');
 assert.match(image,/^(?:docker\.io\/library\/)?node@sha256:[a-f0-9]{64}$/);
 if(phase==='preflight')await pre();else if(phase==='grade')await grade();else if(phase==='release')await release();else throw Error('unknown phase');
 base.status='accepted';
}catch(e){base.failure=typeof e?.message==='string'?e.message.slice(0,160):'controller-failure';process.exitCode=1}
finally{
 await save(out,phase+'.json',base);
 console.log(JSON.stringify({phase,sourceSha:head,status:base.status,failure:base.failure,controls:base.controls?.map(({id,status,tests,pass,fail})=>({id,status,tests,pass,fail})),candidate:base.behavior?summary(base.behavior):undefined,releaseControls:base.releaseControls,smoke:base.smoke?summary(base.smoke):undefined,productionReady:false}));
}