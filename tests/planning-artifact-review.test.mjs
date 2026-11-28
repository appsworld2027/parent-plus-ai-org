import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { preparePlanningReview, validatePlanningReview } from "../scripts/planning-artifact-review.mjs";
const artifact="Courses tab is added despite the frozen Today-button scope.\nNo verification has run.\n";
const sha=x=>createHash("sha256").update(x).digest("hex");
const input={artifact, author:"maya-ai-pm",authorReceipt:{role:"maya-ai-pm",artifactSha256:sha(artifact),source:"a".repeat(40),structuralCheck:true,finish:"stop",model:"openai/gpt-oss-120b"},contract:"Courses is a button on Today, not a tab.",reviewerMethod:"Verify exact evidence and reject missing critical gates.",reviewerCard:"Rex is an independent reviewer."};
const result={verdict:"CHANGES",scores:{correctness:15,edgeCases:10,evidence:10,efficiency:5},findings:[{severity:"critical",line:1,quote:"Courses tab is added",issue:"Contradicts locked navigation scope.",fix:"Use a button on Today and preserve existing tabs."}]};
test("planning review binds actual author bytes and distinct approved model",()=>{
  const p=preparePlanningReview(input);
  assert.equal(p.model,"qwen/qwen3.8-27b");
  assert.ok(p.prompt.includes("1: Courses tab is added"));
  const r=validatePlanningReview(p,artifact,p.model,result);
  assert.equal(r.score,40);
  assert.equal(r.verdict,"CHANGES");
  assert.equal(r.independentReviewPassed,false);
  assert.equal(r.roleAdmission,false);
  assert.equal(r.productWriteAuthorized,false);
});
test("altered artifact, same model and unsupported author model are denied",()=>{
  assert.throws(()=>preparePlanningReview({...input,artifact:artifact+"x"}),/identity or artifact/);
  assert.throws(()=>preparePlanningReview({...input,authorReceipt:{...input.authorReceipt,model:"paid"}}),/identity or artifact/);
  const p=preparePlanningReview(input);
  assert.throws(()=>validatePlanningReview(p,artifact,input.authorReceipt.model,result),/identity mismatch/);
});
test("false approval, ungrounded quote, invalid score and unsupported output are denied",()=>{
  const p=preparePlanningReview(input);
  assert.throws(()=>validatePlanningReview(p,artifact,p.model,{...result,verdict:"APPROVE"}),/Contradictory approval/);
  assert.throws(()=>validatePlanningReview(p,artifact,p.model,{...result,findings:[{...result.findings[0],quote:"invented source quote"}]}),/ungrounded finding/);
  assert.throws(()=>validatePlanningReview(p,artifact,p.model,{...result,scores:{...result.scores,correctness:41}}),/score dimension/);
  assert.throws(()=>validatePlanningReview(p,artifact,p.model,{...result,roleAdmission:true}),/review shape/);
});
test("structurally valid high score never authorizes a role or product write",()=>{
  const p=preparePlanningReview(input);
  const r=validatePlanningReview(p,artifact,p.model,{verdict:"APPROVE",scores:{correctness:40,edgeCases:25,evidence:20,efficiency:15},findings:[]});
  assert.equal(r.score,100);
  assert.equal(r.independentReviewPassed,false);
  assert.equal(r.roleAdmission,false);
  assert.equal(r.productWriteAuthorized,false);
});
