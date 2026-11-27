import test from "node:test";
import assert from "node:assert/strict";
import { assessFrontierAdmission, canonicalHash, rubric, rubricHash } from "../scripts/frontier-admission.mjs";

const H = x => canonicalHash({label:x});
const base = "a".repeat(40);
const result = (label, verdict="pass") => ({verdict,reason:"Synthetic unit test: "+label,evidenceHash:H(label)});
const checks = keys => Object.fromEntries(keys.map(k=>[k,result(k)]));
function makeInput() {
  const plan={schema:1,scope:rubric.scope,rubricHash,sourceSha:base,
    slots:rubric.roles.flatMap(r=>rubric.variants.map(v=>({role:r.role,variant:v,
      fixtureHash:H(r.role+"/"+v+"/fixture"),promptHash:H(r.role+"/"+v+"/prompt")})))};
  const planHash=canonicalHash(plan);
  const runs=plan.slots.map((s,i)=>{
    const execution={schema:1,scope:rubric.scope,planHash,sourceSha:base,...s,
      runId:"run-"+i,agentInstance:"agent-"+i,provider:"fictional-free",model:"fictional-model",
      routeReceiptHash:H("route-"+i),toolReceiptHash:H("tools-"+i),artifactHash:H("artifact-"+i)};
    const evaluation={schema:1,executionHash:canonicalHash(execution),evaluatorId:"evaluator-"+i,
      evaluatorRunId:"eval-"+i,mode:"independent-human",
      checks:checks(rubric.roles.find(r=>r.role===s.role).checks.map(c=>c.id)),hardGates:checks(rubric.hardGates)};
    return {execution,evaluation,executionReceiptId:"exec-receipt-"+i,evaluationReceiptId:"eval-receipt-"+i};
  });
  return {plan:{payload:plan,receiptId:"plan-receipt"},runs,integrated:{receiptId:"integrated-receipt",
    payload:{schema:1,scope:rubric.scope,planHash,sourceSha:base,artifactHash:H("integration"),
      runIds:runs.map(r=>r.execution.runId),checks:checks(rubric.integratedGates)}}};
}
// These receipts are TEST DOUBLES ONLY. A production caller must validate the
// source of canonical workflow/evaluator artifacts independently of candidate JSON.
function verifier(input) {
  const values=new Map();
  const add=(kind,receiptId,payload)=>values.set(kind+":"+receiptId,canonicalHash(payload));
  add("frozen-plan",input.plan.receiptId,input.plan.payload);
  for(const r of input.runs) {
    add("agent-execution",r.executionReceiptId,r.execution);
    add("independent-evaluation",r.evaluationReceiptId,r.evaluation);
  }
  if(input.integrated) add("integrated-evaluation",input.integrated.receiptId,input.integrated.payload);
  return {verifyReceipt:({kind,receiptId,subjectHash})=>values.get(kind+":"+receiptId)===subjectHash};
}
const rebind = r => {r.evaluation.executionHash=canonicalHash(r.execution);};

test("catalog has exact eleven roles, three variants and frozen 40/25/20/15 scoring",()=>{
  assert.equal(rubric.roles.length,11); assert.deepEqual(rubric.variants,["normal","edge","adversarial"]);
  for(const r of rubric.roles) assert.equal(r.checks.reduce((n,c)=>n+c.points,0),100);
  assert.match(rubricHash,/^[a-f0-9]{64}$/);
});
test("canonical hash is stable for key order, but not changed values",()=>{
  assert.equal(canonicalHash({b:[1,2],a:"x"}),canonicalHash({a:"x",b:[1,2]}));
  assert.notEqual(canonicalHash({b:[1,2]}),canonicalHash({b:[2,1]}));
});
test("33 separately verified role runs plus integrated gates only become eligible for independent review",()=>{
  const x=makeInput(), a=assessFrontierAdmission(x,verifier(x));
  assert.equal(a.status,"eligible-for-independent-review"); assert.equal(a.counts.eligible,33);
  assert.equal(a.integrated.status,"eligible"); assert.equal(a.productionReady,false);
  assert.equal(a.qualityEquivalence,"not-established");
  assert.ok(a.rows.every(r=>r.score===100));
});
test("candidate claims or untrusted receipt cannot certify any run",()=>{
  const x=makeInput(); x.passed=true; x.verified=true;
  const a=assessFrontierAdmission(x);
  assert.equal(a.status,"incomplete"); assert.equal(a.counts.eligible,0);
  const b=assessFrontierAdmission(x,{verifyReceipt:()=>Promise.resolve(true)});
  assert.equal(b.counts.eligible,0);
});
test("tampering with separately attested results after receipt cannot pass",()=>{
  const x=makeInput(), v=verifier(x);
  x.runs[0].evaluation.checks.c1.reason="tampered";
  const a=assessFrontierAdmission(x,v);
  assert.equal(a.status,"incomplete");assert.equal(a.counts.unverified,1);
});
test("one missing role variant never passes even when other 32 have perfect scores",()=>{
  const x=makeInput();x.runs.pop();delete x.integrated;
  const a=assessFrontierAdmission(x,verifier(x));
  assert.equal(a.status,"incomplete");assert.equal(a.counts.missing,1);
  assert.equal(a.counts.eligible,32);
});
test("a duplicate role variant or actual run cannot inflate qualification",()=>{
  const a=makeInput();a.runs[1]=structuredClone(a.runs[0]);delete a.integrated;
  assert.equal(assessFrontierAdmission(a,verifier(a)).status,"blocked");
  const b=makeInput();b.runs[1].execution.runId=b.runs[0].execution.runId;rebind(b.runs[1]);delete b.integrated;
  assert.equal(assessFrontierAdmission(b,verifier(b)).status,"blocked");
});
test("same fixture or prompt reused across variants invalidates plan",()=>{
  for(const key of ["fixtureHash","promptHash"]){
    const x=makeInput();x.plan.payload.slots[1][key]=x.plan.payload.slots[0][key];
    assert.equal(assessFrontierAdmission(x,verifier(x)).status,"blocked");
  }
});
test("stale source, wrong fixture, prompt hash or evaluation bound to another run blocks",()=>{
  for(const key of ["sourceSha","fixtureHash","promptHash"]){
    const x=makeInput();x.runs[0].execution[key]=key==="sourceSha"?"b".repeat(40):H("wrong");rebind(x.runs[0]);
    assert.equal(assessFrontierAdmission(x,verifier(x)).status,"blocked");
  }
  const x=makeInput();x.runs[0].evaluation.executionHash=canonicalHash(x.runs[1].execution);
  assert.equal(assessFrontierAdmission(x,verifier(x)).status,"blocked");
});
test("self-review, duplicate independent evaluator run, mixed role run IDs block",()=>{
  for(const change of [
    x=>x.runs[0].evaluation.evaluatorId=x.runs[0].execution.agentInstance,
    x=>x.runs[1].evaluation.evaluatorRunId=x.runs[0].evaluation.evaluatorRunId,
    x=>x.runs[1].execution.runId=x.runs[0].evaluation.evaluatorRunId
  ]){
    const x=makeInput();change(x);rebind(x.runs[1]);assert.equal(assessFrontierAdmission(x,verifier(x)).status,"blocked");
  }
});
test("weighted minimum applies per repetition, no average hides failure",()=>{
  const x=makeInput();x.runs[0].evaluation.checks.c1=result("incorrect","fail");
  x.runs[0].evaluation.score=100;
  const a=assessFrontierAdmission(x,verifier(x));
  assert.equal(a.status,"blocked");assert.equal(a.rows.find(r=>r.runId==="run-0").score,78);
  const y=makeInput();y.runs[0].evaluation.checks.c4=result("edge","fail");
  const b=assessFrontierAdmission(y,verifier(y));
  assert.equal(b.status,"eligible-for-independent-review");
  assert.equal(b.rows.find(r=>r.runId==="run-0").score,90);
});
test("any hard gate fail, unknown or not-applicable blocks regardless of 100 score",()=>{
  for(const verdict of ["fail","unknown","not-applicable"]){
    const x=makeInput();x.runs[0].evaluation.hardGates.freeRouteVerified=result("billing",verdict);
    const a=assessFrontierAdmission(x,verifier(x));
    assert.equal(a.status,"blocked");assert.equal(a.rows.find(r=>r.runId==="run-0").score,100);
    assert.deepEqual(a.rows.find(r=>r.runId==="run-0").failedGates,["freeRouteVerified"]);
  }
});
test("missing criterion or hard gate, type-coerced verdict or missing evidence rejects schema",()=>{
  for(const change of [
    x=>delete x.runs[0].evaluation.checks.c1,
    x=>delete x.runs[0].evaluation.hardGates.noPaidFallback,
    x=>x.runs[0].evaluation.checks.c1.verdict=true,
    x=>x.runs[0].evaluation.checks.c1.evidenceHash=""
  ]){
    const x=makeInput();change(x);assert.equal(assessFrontierAdmission(x,verifier(x)).status,"blocked");
  }
});
test("missing, wrong or failed integration proof prevents admission",()=>{
  let x=makeInput();delete x.integrated;
  assert.equal(assessFrontierAdmission(x,verifier(x)).status,"incomplete");
  x=makeInput();x.integrated.payload.runIds[0]="wrong";
  assert.equal(assessFrontierAdmission(x,verifier(x)).status,"blocked");
  x=makeInput();x.integrated.payload.checks.failedSmokeRollbackVerified=result("rollback","fail");
  assert.equal(assessFrontierAdmission(x,verifier(x)).integrated.status,"failed");
});
test("pilot scope cannot be replaced with narrow read-only screening or real product",()=>{
  for(const scope of ["synthetic-readonly","parent-plus-course","production"]){
    const x=makeInput();x.runs[0].execution.scope=scope;rebind(x.runs[0]);
    assert.equal(assessFrontierAdmission(x,verifier(x)).status,"blocked");
  }
});
test("missing source SHA, oversized runs or wrong rubric cannot bypass",()=>{
  for(const change of [
    x=>x.plan.payload.sourceSha="tiny",
    x=>x.plan.payload.rubricHash=H("not-current"),
    x=>x.runs.push(x.runs[0])
  ]) {
    const x=makeInput();change(x);assert.equal(assessFrontierAdmission(x,verifier(x)).status,"blocked");
  }
});
