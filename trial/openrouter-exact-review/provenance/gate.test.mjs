import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyReviewProvenance} from './gate.mjs';
const author='Select api and ui. API generation 4 fences worker-old. Database must unlock migration-lock and complete before QA.';
const controller='api lease generation 4; worker-old fenced; database locked.';
const criteria=[
 {id:'authority-transfer',source:'AUTHOR'},
 {id:'dependency-next-steps',source:'AUTHOR'},
 {id:'actual-lease',source:'CONTROLLER'}
];
const input={author,controller,criteria};
const valid={verdict:'APPROVE',evidence:[
 {criterion:'authority-transfer',source:'AUTHOR',status:'supported',quote:'API generation 4 fences worker-old.'},
 {criterion:'dependency-next-steps',source:'AUTHOR',status:'supported',quote:'Database must unlock migration-lock and complete before QA.'},
 {criterion:'actual-lease',source:'CONTROLLER',status:'supported',quote:'api lease generation 4; worker-old fenced'}
],findings:[]};
test('strict attributed exact evidence accepts a complete ledger without claiming semantic qualification',()=>{
 const r=verifyReviewProvenance({...input,review:valid});assert.equal(r.valid,true);assert.equal(r.qualification,false);
});
test('rejects real Gemma false approval even when its array wrapper is removed',()=>{
 const observed=JSON.parse(readFileSync(new URL('../evidence/openrouter-gemma26-20261128/review/01.raw.txt',import.meta.url),'utf8'));
 assert.equal(observed[0].verdict,'APPROVE');assert.equal(verifyReviewProvenance({...input,review:observed[0]}).valid,false);
});
test('generated controller evidence cannot substitute for author reasoning',()=>{
 const e=structuredClone(valid);e.evidence[0]={criterion:'authority-transfer',source:'CONTROLLER',status:'supported',quote:'api lease generation 4'};
 assert.equal(verifyReviewProvenance({...input,review:e}).valid,false);
 const q=structuredClone(valid);q.evidence[0].quote='api lease generation 4';assert.equal(verifyReviewProvenance({...input,review:q}).valid,false);
});
test('missing author evidence must block approval and cite findings; changes can be a successful review',()=>{
 const e=structuredClone(valid);e.evidence[0]={criterion:'authority-transfer',source:'AUTHOR',status:'missing',quote:null};
 assert.equal(verifyReviewProvenance({...input,review:e}).valid,false);
 e.verdict='CHANGES';e.findings=[{criterion:'authority-transfer',message:'Explain transfer and fencing.'}];
 assert.equal(verifyReviewProvenance({...input,review:e}).valid,true);
 e.findings=[];assert.equal(verifyReviewProvenance({...input,review:e}).valid,false);
});
test('rejects duplicate, unknown or omitted criteria and invented quotes',()=>{
 for(const evidence of [[valid.evidence[0],valid.evidence[0],valid.evidence[2]],valid.evidence.slice(0,2),[...valid.evidence,{criterion:'extra',source:'AUTHOR',status:'supported',quote:'Select api'}]]){
  assert.equal(verifyReviewProvenance({...input,review:{...valid,evidence}}).valid,false);
 }
});
test('real source author cannot inherit its controller generation and fencing claims',()=>{
 const original=JSON.parse(readFileSync(new URL('../evidence/source-ultra/author.raw.json',import.meta.url),'utf8'));
 const artifact=JSON.parse(readFileSync(new URL('../evidence/source-ultra/projected-artifact.json',import.meta.url),'utf8'));
 assert.equal(artifact.artifactHash,'22d6152abb88911f73fa821358fdb41548d64884b08fecca548d9f3b93607a34');
 const graph=JSON.parse(artifact.files.find(x=>x.path==='task-graph.json').content);
 const controllerText=JSON.stringify(graph);
 assert.equal(graph.dispatch.find(x=>x.taskId==='api').generation,4);
 assert.equal(original.handover.includes('generation 4'),false);
 const trusted={author:original.handover,controller:controllerText,criteria:[{id:'authority-transfer',source:'AUTHOR'}]};
 const review={verdict:'APPROVE',evidence:[{criterion:'authority-transfer',source:'AUTHOR',status:'supported',quote:'"generation":4'}],findings:[]};
 assert.ok(controllerText.includes(review.evidence[0].quote));
 assert.equal(verifyReviewProvenance({...trusted,review}).valid,false);
});
