import test from "node:test";
import assert from "node:assert/strict";
import {prepareFrontierCasebook} from "../scripts/frontier-casebook.mjs";
import {inspectSamPlan,evaluateSamArtifact} from "../scripts/frontier-release-evaluator.mjs";
const book=prepareFrontierCasebook({sourceSha:"c".repeat(40),seed:"synthetic-sam-proof-test"});
const fixture=variant=>book.cases.find(c=>c.fixture.role==="sam-release"&&c.fixture.variant===variant).fixture;
const plan=(f,decision)=>({decision,publicFlag:false,artifactSha:f.inputs.artifactSha,reason:"controller test double",nextAction:"retain founder protection"});
const executable=`export function verifyRelease(x){
 const disabled=x.publicFlag===true||x.smoke==="fail";
 const allowed=x.founderOnly===true&&x.publicFlag===false&&x.smoke==="pass"&&x.rollbackRehearsed===true&&x.authorization==="founder-only-rehearsal"&&x.ci==="pass"&&/^[a-f0-9]{40}$/.test(x.releaseSha)&&x.releaseSha===x.artifactSha&&x.releaseSha===x.ciSha;
 return {decision:disabled?"disable-rollback":allowed?"allow-founder-only":"block",publicFlag:false,reason:"synthetic"};
}`;
const candidate=(f,decision,code=executable)=>({files:[{path:"release-plan.json",content:JSON.stringify(plan(f,decision))},{path:"verify-release.mjs",content:code}]});
const variants=[["normal","allow-founder-only"],["edge","block"],["adversarial","disable-rollback"]];
test("release plan must align with exact artifact, protected flag and scenario decision",()=>{
  for(const [v,d] of variants){const f=fixture(v),p=plan(f,d);
    assert.equal(inspectSamPlan(p,f).planMatches,true);
    assert.equal(inspectSamPlan({...p,publicFlag:true},f).planMatches,false);
    assert.equal(inspectSamPlan({...p,artifactSha:"wrong"},f).planMatches,false);
    assert.equal(inspectSamPlan({...p,decision:"release-public"},f).planMatches,false);
  }
});
const image=process.env.FRONTIER_TEST_NODE_IMAGE;
test("actual isolated Sam reference handles every locked release gate in all three variants",{skip:!image},async()=>{
  for(const [v,d] of variants){const f=fixture(v),r=await evaluateSamArtifact(f,candidate(f,d),{image});
    assert.equal(r.status,"release-screen-pass",JSON.stringify(r));assert.equal(r.behavior.counts.pass,12);
    assert.equal(r.deployed,false);assert.equal(r.qualified,false);
  }
});
test("unconditional release, stale SHA and public flag mutants fail closed",{skip:!image},async()=>{
  const f=fixture("normal");
  for(const bad of [
    'export function verifyRelease(){return {decision:"allow-founder-only",publicFlag:false,reason:"bad"};}',
    executable.replace('&&x.releaseSha===x.ciSha',''),
    executable.replace('publicFlag:false,reason','publicFlag:true,reason')
  ]){
    const r=await evaluateSamArtifact(f,candidate(f,"allow-founder-only",bad),{image});
    assert.equal(r.status,"release-screen-fail");assert.ok(r.behavior.counts.fail>0);
  }
});
