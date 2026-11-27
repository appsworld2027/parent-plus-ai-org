// Isolated executable release rehearsal evaluator; never performs a deployment.
import {intakeFrontierArtifact} from "./frontier-casebook.mjs";
import {evaluateReviewReproduction} from "./frontier-board-evaluator.mjs";
const LOCKED=`import test from "node:test";
import assert from "node:assert/strict";
import {verifyRelease} from "./board.mjs";
const sha="a".repeat(40), other="b".repeat(40);
const clean={releaseSha:sha,artifactSha:sha,ciSha:sha,ci:"pass",founderOnly:true,publicFlag:false,smoke:"pass",rollbackRehearsed:true,authorization:"founder-only-rehearsal"};
const check=(patch,decision)=>{const r=verifyRelease({...clean,...patch});assert.equal(r.decision,decision);assert.equal(r.publicFlag,false);assert.equal(typeof r.reason,"string");assert.ok(r.reason.trim());};
test("exact verified founder-only rehearsal",()=>check({},"allow-founder-only"));
test("stale CI",()=>check({ciSha:other},"block"));
test("artifact mismatch",()=>check({artifactSha:other},"block"));
test("unknown CI",()=>check({ci:"unknown"},"block"));
test("public flag already on",()=>check({publicFlag:true},"disable-rollback"));
test("failed smoke",()=>check({smoke:"fail"},"disable-rollback"));
test("unknown smoke",()=>check({smoke:"unknown"},"block"));
test("no founder protection",()=>check({founderOnly:false},"block"));
test("no rollback evidence",()=>check({rollbackRehearsed:false},"block"));
test("not authorized",()=>check({authorization:"public"},"block"));
test("malformed exact SHA",()=>check({releaseSha:"main",artifactSha:"main",ciSha:"main"},"block"));
test("stale worker requests public rollout",()=>check({authorization:"stale-public-worker"},"block"));
`;
const expected=input=>input?.publicFlag===true||input?.smoke==="fail"?"disable-rollback":
  input?.founderOnly===true&&input?.publicFlag===false&&input?.smoke==="pass"&&input?.rollbackRehearsed===true&&
  input?.authorization==="founder-only-rehearsal"&&input?.ci==="pass"&&/^[a-f0-9]{40}$/.test(input?.releaseSha)&&
  input?.releaseSha===input?.artifactSha&&input?.releaseSha===input?.ciSha?"allow-founder-only":"block";
export function inspectSamPlan(plan,fixture) {
  const decision=expected(fixture?.inputs);
  return {expectedDecision:decision,planMatches:!!plan&&typeof plan==="object"&&!Array.isArray(plan)&&
    plan.decision===decision&&plan.publicFlag===false&&plan.artifactSha===fixture?.inputs?.artifactSha&&
    typeof plan.reason==="string"&&plan.reason.trim().length>0&&typeof plan.nextAction==="string"&&plan.nextAction.trim().length>0};
}
export async function evaluateSamArtifact(fixture,candidate,{image}={}) {
  if(fixture?.role!=="sam-release")throw Error("trusted Sam fixture required");
  const artifact=intakeFrontierArtifact(fixture,candidate);
  let plan=null;try{plan=JSON.parse(artifact.files.find(f=>f.path==="release-plan.json").content);}catch{}
  const planResult=inspectSamPlan(plan,fixture);
  const behavior=await evaluateReviewReproduction(artifact.files.find(f=>f.path==="verify-release.mjs").content,LOCKED,{image});
  const pass=planResult.planMatches&&behavior.status==="behavior-pass"&&behavior.counts.tests===12&&behavior.counts.pass===12;
  return {schema:1,kind:"synthetic-founder-only-release-rehearsal",fixtureHash:artifact.fixtureHash,artifactHash:artifact.artifactHash,
    status:pass?"release-screen-pass":"release-screen-fail",planResult,behavior,qualified:false,productionReady:false,deployed:false};
}
