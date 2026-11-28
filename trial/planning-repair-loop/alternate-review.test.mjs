import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {sha} from '../nim-per-file/transport.mjs';
import {planningFixture} from '../../scripts/frontier-planning-evaluator.mjs';
import {makeSourceSpans,resolveSelectedSpans} from './indexed-review.mjs';
import {screenQaDependencyQuote} from './qa-quote.mjs';
import {verifyReviewProvenance} from '../openrouter-exact-review/provenance/gate.mjs';
const base='trial/openrouter-exact-review/evidence',source=join(base,'leela-normal-indexed-20261128'),alternate=join(base,'leela-normal-gptoss-v2-20261128');
const json=(dir,name)=>JSON.parse(readFileSync(join(dir,name),'utf8'));
test('locked Leela normal task resource claims have no overlaps',()=>{
 const f=planningFixture('leela-pjm-b','normal'),tasks=f.tasks.filter(t=>['api','database','ui','integration'].includes(t.id));assert.equal(tasks.length,4);
 for(let i=0;i<tasks.length;i++)for(let j=i+1;j<tasks.length;j++)assert.deepEqual(tasks[i].resources.filter(x=>tasks[j].resources.includes(x)),[]);
 const artifact=json(source,'round-3/artifact.json'),conflicts=JSON.parse(artifact.files.find(x=>x.path==='conflict-register.json').content);
 assert.deepEqual(conflicts.conflicts,[]);
});
test('actual GPT-OSS reviewer V2 independently supports saved exact Leela plan',()=>{
 const raw=readFileSync(join(source,'round-3/author/01.raw.txt'),'utf8'),decision=JSON.parse(raw),artifact=json(source,'round-3/artifact.json'),checkpoint=json(source,'checkpoint.json'),record=checkpoint.rounds[3];
 const result=json(alternate,'result.json'),receipt=json(alternate,'review/01.receipt.json'),rr=readFileSync(join(alternate,'review/01.raw.txt'),'utf8');
 const graph=JSON.parse(artifact.files.find(x=>x.path==='lane-plan.json').content),conflicts=JSON.parse(artifact.files.find(x=>x.path==='conflict-register.json').content),controller=JSON.stringify({graph,conflicts,dispatchTaskIds:decision.dispatchTaskIds});
 const spans=makeSourceSpans(decision.handover,controller,decision.dispatchTaskIds,true),review=resolveSelectedSpans(JSON.parse(rr),spans);
 const criteria=[{id:'dispatch-safety',source:'AUTHOR'},{id:'authority-reconciliation',source:'AUTHOR'},{id:'dependency-completion',source:'AUTHOR'},{id:'honest-execution',source:'AUTHOR'},{id:'controller-plan',source:'CONTROLLER'}];
 assert.equal(sha(raw),record.rawHash);assert.equal(result.rawHash,record.rawHash);assert.equal(artifact.artifactHash,record.artifactHash);assert.equal(sha(rr),result.reviewRawHash);
 assert.equal(receipt.reportedModel,'openai/gpt-oss-120b');assert.equal(receipt.finishReason,'stop');assert.equal(receipt.status,'accepted');
 assert.deepEqual(spans,json(alternate,'source-spans.json'));assert.deepEqual(review,result.review);
 assert.equal(verifyReviewProvenance({author:decision.handover,controller,criteria,review}).valid,true);
 assert.equal(screenQaDependencyQuote(graph,review).valid,true);assert.equal(review.verdict,'APPROVE');assert.deepEqual(review.findings,[]);assert.equal(result.qualification,false);
});
