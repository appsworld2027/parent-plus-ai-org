import test from "node:test";
import assert from "node:assert/strict";
import {prepareFrontierCasebook} from "../scripts/frontier-casebook.mjs";
import {interpretRexReview,evaluateRexArtifact} from "../scripts/frontier-review-evaluator.mjs";
const finding={path:"board.mjs",line:10,severity:"high",problem:"Synthetic control defect",reproduction:"Run isolated contract assertion"};
const review=(verdict,findings=[])=>({verdict,findings,summary:"synthetic test fixture"});
const context=(referenceStatus,reproductionStatus,extra={})=>({candidateLineCount:30,referenceStatus,reproductionStatus,reproductionCleanStatus:"behavior-pass",reproductionSameCount:true,...extra});
test("correct approval and changes require independent reproduced behavior",()=>{
  assert.equal(interpretRexReview(review("APPROVE"),context("behavior-pass","behavior-pass")).status,"review-screen-pass");
  assert.equal(interpretRexReview(review("CHANGES",[finding]),context("behavior-fail","behavior-fail")).status,"review-screen-pass");
  assert.equal(interpretRexReview(review("APPROVE"),context("behavior-fail","behavior-fail")).status,"review-screen-fail");
  assert.equal(interpretRexReview(review("CHANGES",[finding]),context("behavior-pass","behavior-pass")).status,"review-screen-fail");
});
test("incorrect false approval, invented or ungrounded findings, missing execution rejected",()=>{
  assert.equal(interpretRexReview(review("CHANGES",[]),context("behavior-fail","behavior-fail")).status,"review-screen-fail");
  assert.equal(interpretRexReview(review("CHANGES",[{...finding,path:"other.mjs"}]),context("behavior-fail","behavior-fail")).status,"review-artifact-invalid");
  assert.equal(interpretRexReview(review("CHANGES",[{...finding,line:99}]),context("behavior-fail","behavior-fail")).status,"review-artifact-invalid");
  assert.equal(interpretRexReview(review("APPROVE"),context("infrastructure-or-incomplete","behavior-pass")).status,"incomplete");
  assert.equal(interpretRexReview(review("CHANGES",[finding]),context("behavior-fail","behavior-pass")).status,"review-screen-fail");
});
test("unconditional failing reproduction or divergent test count does not prove defect",()=>{
  const x=review("CHANGES",[finding]);
  assert.equal(interpretRexReview(x,context("behavior-fail","behavior-fail",{reproductionCleanStatus:"behavior-fail"})).status,"review-screen-fail");
  assert.equal(interpretRexReview(x,context("behavior-fail","behavior-fail",{reproductionSameCount:false})).status,"review-screen-fail");
});
const book=prepareFrontierCasebook({sourceSha:"c".repeat(40),seed:"synthetic-rex-proof-test"});
const get=variant=>book.cases.find(x=>x.fixture.role==="rex-reviewer"&&x.fixture.variant===variant).fixture;
const image=process.env.FRONTIER_TEST_NODE_IMAGE;
const cleanControl=get("normal").starterFiles["board.mjs"];
const repro=`import test from 'node:test'; import assert from 'node:assert/strict'; import {createBoard} from './board.mjs';
test('replay conflict',()=>{ const b=createBoard(),x={tenant:'a',id:'x',title:'one',expectedVersion:0,requestId:'q'}; b.save(x);assert.equal(b.save({...x,title:'two'}).code,'conflict');});
test('tenant leak',()=>{ const b=createBoard();b.save({tenant:'a',id:'x',title:'one',expectedVersion:0,requestId:'q'});assert.deepEqual(b.list('b'),[]);});`;
const candidate=(verdict,testCode=repro)=>({files:[{path:"review.json",content:JSON.stringify(review(verdict,verdict==="CHANGES"?[finding]:[]))},{path:"reproduction.test.mjs",content:testCode}]});
test("actual isolated Rex test controls approve clean and reject both defects",{skip:!image},async()=>{
  for(const variant of ["normal","edge","adversarial"]){
    const x=await evaluateRexArtifact(get(variant),candidate(variant==="normal"?"APPROVE":"CHANGES"),{image,cleanControl});
    assert.equal(x.result.status,"review-screen-pass",JSON.stringify(x));assert.equal(x.qualified,false);
  }
});
test("real isolated unconditional failure detected rather than falsely proving defect",{skip:!image},async()=>{
  const x=await evaluateRexArtifact(get("edge"),candidate("CHANGES","import test from 'node:test';test('fake',()=>{throw Error('fabricated')});"),{image,cleanControl});
  assert.equal(x.result.status,"review-screen-fail");
});
