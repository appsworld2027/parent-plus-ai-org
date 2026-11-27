// Deterministic artifact-admission precheck for #129. This is NOT a model runner,
// a receipt authenticator, a score generator, or a production release gate.
// Callers must independently verify the receipt's source + exact payload hash.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

function deepFreeze(value) {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}
export const rubric = deepFreeze(JSON.parse(readFileSync(new URL("../governance/FRONTIER_ARTIFACT_RUBRIC.json", import.meta.url), "utf8")));
const ROLES = ["maya-ai-pm","arjun-cpto","iris-design","kiran-pjm-a","leela-pjm-b","dev-coder","tara-database","ravi-integration","quinn-qa","rex-reviewer","sam-release"];
const VARIANTS = ["normal","edge","adversarial"];
const sha40 = x => typeof x === "string" && /^[a-f0-9]{40}$/.test(x);
const sha64 = x => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const id = x => typeof x === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,127}$/.test(x);
const object = x => !!x && typeof x === "object" && !Array.isArray(x);
const sameSet = (a,b) => a.length===b.length && new Set(a).size===a.length && a.every(x=>b.includes(x));
const slotKey = (role,variant) => role + "/" + variant;
function canonical(x) {
  if (x === null || typeof x === "boolean" || typeof x === "string") return JSON.stringify(x);
  if (typeof x === "number" && Number.isFinite(x)) return JSON.stringify(x);
  if (Array.isArray(x)) return "[" + x.map(canonical).join(",") + "]";
  if (object(x) && (Object.getPrototypeOf(x) === Object.prototype || Object.getPrototypeOf(x) === null))
    return "{" + Object.keys(x).sort().map(k=>JSON.stringify(k)+":"+canonical(x[k])).join(",") + "}";
  throw Error("Non-JSON value cannot be hashed");
}
export const canonicalHash = x => createHash("sha256").update(canonical(x)).digest("hex");
export const rubricHash = canonicalHash(rubric);
function assertRubric() {
  if (rubric.schema!==1 || rubric.scope!=="isolated-synthetic" || rubric.minScore!==90 ||
      !sameSet(rubric.variants,VARIANTS) || !sameSet(rubric.roles.map(r=>r.role),ROLES) ||
      rubric.hardGates.length!==10 || new Set(rubric.hardGates).size!==10 ||
      rubric.integratedGates.length!==15 || new Set(rubric.integratedGates).size!==15) throw Error("Invalid pinned rubric");
  const planPolicy=rubric.planRequirements;
  if(!planPolicy||planPolicy.roleVariantSlots!==33||planPolicy.distinctFixtureHashes!==33||planPolicy.distinctPromptHashes!==33||planPolicy.source!=="frozen-exact-commit"||typeof planPolicy.rationale!=="string"||!planPolicy.rationale.trim()) throw Error("Invalid frozen-plan requirements");
  const scoring=rubric.scoring;
  if (!scoring || scoring.maxScore!==100 || scoring.minimumScope!=="each-role-variant" ||
      scoring.aggregation!=="logical-and-of-all-33-slots-and-all-15-integrated-gates" || scoring.averagingAllowed!==false ||
      scoring.slotFormula!=="sum-fixed-points-for-pass-criteria-only" ||
      scoring.eligibility!=="each-slot-score-gte-90-out-of-100-and-all-10-hard-gates-pass" ||
      canonicalHash(rubric.receiptVerification)!==canonicalHash({scope:"isolated-synthetic",exactSource:"frozen-plan-sourceSha",binding:"trusted-verifier-kind-receiptId-canonical-payload-digest",productionReady:false}) ||
      !object(rubric.integratedGateOwners) ||
      !sameSet(Object.keys(rubric.integratedGateOwners),rubric.integratedGates) ||
      !Object.values(rubric.integratedGateOwners).every(owners=>Array.isArray(owners)&&owners.length>0&&
        new Set(owners).size===owners.length&&owners.every(role=>ROLES.includes(role)))) throw Error("Invalid scoring or integrated gate ownership");
  for (const r of rubric.roles) {
    const totals = {correctness:0,edge:0,evidence:0,efficiency:0};
    if (r.checks.length!==8 || new Set(r.checks.map(c=>c.id)).size!==8) throw Error("Invalid role rubric");
    for (const c of r.checks) {
      if (!Object.hasOwn(totals,c.dimension) || !Number.isSafeInteger(c.points) || c.points<=0 || !c.description) throw Error("Bad rubric criterion");
      totals[c.dimension]+=c.points;
    }
    if (JSON.stringify(totals)!==JSON.stringify({correctness:40,edge:25,evidence:20,efficiency:15})) throw Error("Invalid rubric weights");
  }
}
assertRubric();
const roleById = new Map(rubric.roles.map(r=>[r.role,r]));
const slots = ROLES.flatMap(role=>VARIANTS.map(variant=>slotKey(role,variant)));
const verdicts = ["pass","fail","unknown","not-applicable"];
// Per-criterion outcome must be accompanied by an independently sourced artifact digest.
// Unknown or not-applicable is never a pass; no automatic score renormalization.
function checkResults(results, keys) {
  if (!object(results) || !sameSet(Object.keys(results),keys)) return false;
  return keys.every(k => object(results[k]) && verdicts.includes(results[k].verdict) &&
    sha64(results[k].evidenceHash) && typeof results[k].reason === "string" &&
    results[k].reason.trim().length>0 && results[k].reason.length<=2000);
}
function resultRows() {
  return slots.map(key => ({slot:key,status:"missing",score:null}));
}
function outcome(status, rows, problems, integrated=null) {
  const counts = {eligible:0,failed:0,missing:0,unverified:0,invalid:0};
  for (const r of rows) counts[r.status] = (counts[r.status]||0)+1;
  return {schema:1,rubricId:rubric.id,rubricHash,status,rolesRequired:ROLES.length,runsRequired:slots.length,
    rows,counts,integrated,problems,productionReady:false,
    scope:"synthetic-artifact-qualification-only",qualityEquivalence:"not-established"};
}

/**
 * Input:
 * {plan:{payload:{schema,scope,rubricHash,sourceSha,slots:[{role,variant,fixtureHash,promptHash}]},receiptId},
 *  runs:[{execution:{schema,scope,planHash,sourceSha,role,variant,fixtureHash,promptHash,
 *     runId,agentInstance,kind,provider,model,routeReceiptHash,toolReceiptHash,artifactHash,attemptHistoryHash},
 *     executionReceiptId, evaluation:{schema,executionHash,evaluatorId,evaluatorRunId,mode,
 *     checks:{cN:{verdict,reason,evidenceHash}},hardGates:{gate:{...}}},
 *     evaluationReceiptId}],
 *  integrated:{payload:{schema,scope,planHash,sourceSha,artifactHash,runIds:[...],checks:{gate:{...}}},
 *     receiptId}}
 * Trusted verification callback: ({kind,receiptId,subjectHash}) => true only for a
 * verified canonical workflow / independent evaluator receipt BOUND to this payload.
 * A bool in candidate JSON is ignored. Do not use a verifier backed by self-attestation.
 * No verifier => no eligible row, even if all candidate JSON fields claim pass.
 */
export function assessFrontierAdmission(input, {verifyReceipt}={}) {
  const rows = resultRows(), problems=[], usedReceipts=new Set(), usedRuns=new Set(), usedAssessments=new Set();
  let blocked=false, incomplete=false;
  const problem = (msg,invalid=true) => {problems.push(msg); if(invalid) blocked=true; else incomplete=true;};
  function receipt(kind, receiptId, payload) {
    if(!id(receiptId)||usedReceipts.has(receiptId)) return false;
    usedReceipts.add(receiptId);
    if(typeof verifyReceipt!=="function") return false;
    try { return verifyReceipt({kind,receiptId,subjectHash:canonicalHash(payload)})===true; } catch { return false; }
  }
  const plan=input?.plan?.payload;
  if (!object(plan) || plan.schema!==1 || plan.scope!==rubric.scope || plan.rubricHash!==rubricHash ||
      !sha40(plan.sourceSha) || !Array.isArray(plan.slots) || plan.slots.length!==slots.length ||
      !plan.slots.every(s=>object(s)&&ROLES.includes(s.role)&&VARIANTS.includes(s.variant)&&sha64(s.fixtureHash)&&sha64(s.promptHash)) ||
      !sameSet(plan.slots.map(s=>slotKey(s.role,s.variant)),slots) ||
      new Set(plan.slots.map(s=>s.fixtureHash)).size!==slots.length ||
      new Set(plan.slots.map(s=>s.promptHash)).size!==slots.length) {
    problem("Missing or invalid frozen 33-slot plan");
    return outcome("blocked",rows,problems);
  }
  if(!receipt("frozen-plan",input.plan.receiptId,plan)) {
    problem("Frozen plan is not independently verified",false);
    return outcome("incomplete",rows,problems);
  }
  const planHash=canonicalHash(plan);
  const expected = new Map(plan.slots.map(s=>[slotKey(s.role,s.variant),s]));
  const runs=input?.runs;
  if(!Array.isArray(runs)||runs.length>slots.length) {
    problem("Runs must be a bounded array with no more than 33 selected attempts");
    return outcome("blocked",rows,problems);
  }
  const bySlot=new Map();
  for(const bundle of runs) {
    const x=bundle?.execution;
    const key=slotKey(x?.role,x?.variant);
    if(!expected.has(key)||bySlot.has(key)) {problem("Unexpected or duplicate role/variant: "+key);continue;}
    bySlot.set(key,bundle);
  }
  for(const row of rows) {
    const bundle=bySlot.get(row.slot);
    if(!bundle) { incomplete=true; continue; }
    const x=bundle.execution, e=bundle.evaluation, spec=expected.get(row.slot), role=roleById.get(spec.role);
    const invalid = message => {row.status="invalid";problem(row.slot+": "+message);};
    if(x.schema!==1||x.kind!=="actual-model-artifact"||x.scope!==rubric.scope||x.planHash!==planHash||x.sourceSha!==plan.sourceSha||
        x.fixtureHash!==spec.fixtureHash||x.promptHash!==spec.promptHash||!id(x.runId)||!id(x.agentInstance)||
        !id(x.provider)||!id(x.model)||!sha64(x.routeReceiptHash)||!sha64(x.toolReceiptHash)||!sha64(x.artifactHash)||!sha64(x.attemptHistoryHash)||
        usedRuns.has(x.runId)||usedAssessments.has(x.runId)) {invalid("execution identity/version/receipt mismatch");continue;}
    usedRuns.add(x.runId);
    if(!object(e)||e.schema!==1||e.executionHash!==canonicalHash(x)||!id(e.evaluatorId)||e.evaluatorId===x.agentInstance||
        !id(e.evaluatorRunId)||usedRuns.has(e.evaluatorRunId)||usedAssessments.has(e.evaluatorRunId)||
        !["independent-human","independent-free-model"].includes(e.mode)||
        !checkResults(e.checks,role.checks.map(c=>c.id))||!checkResults(e.hardGates,rubric.hardGates)) {
      invalid("independence, exact execution binding or evaluation coverage invalid");continue;
    }
    usedAssessments.add(e.evaluatorRunId);
    if(!receipt("agent-execution",bundle.executionReceiptId,x)||
        !receipt("independent-evaluation",bundle.evaluationReceiptId,e)) {
      row.status="unverified";problem(row.slot+": actual execution or evaluation receipt not verified",false);continue;
    }
    row.score=role.checks.reduce((sum,c)=>sum+(e.checks[c.id].verdict==="pass"?c.points:0),0);
    row.failedGates=rubric.hardGates.filter(g=>e.hardGates[g].verdict!=="pass");
    row.runId=x.runId;row.provider=x.provider;row.model=x.model;
    if(row.score<rubric.minScore||row.failedGates.length) {row.status="failed";problem(row.slot+": score or mandatory gate failed");}
    else row.status="eligible";
  }
  let integration={status:"missing"};
  const p=input?.integrated?.payload;
  if(!p) incomplete=true;
  else if(!object(p)||p.schema!==1||p.scope!==rubric.scope||p.planHash!==planHash||p.sourceSha!==plan.sourceSha||
      !sha64(p.artifactHash)||!Array.isArray(p.runIds)||!sameSet(p.runIds,[...usedRuns])||
      p.runIds.length!==slots.length||!checkResults(p.checks,rubric.integratedGates)) {
    integration={status:"invalid"};problem("Integrated evidence is not bound to all 33 selected role runs");
  } else if(!receipt("integrated-evaluation",input.integrated.receiptId,p)) {
    integration={status:"unverified"};problem("Integrated evidence not independently verified",false);
  } else {
    const failed=rubric.integratedGates.filter(g=>p.checks[g].verdict!=="pass");
    integration={status:failed.length?"failed":"eligible",failedGates:failed};
    if(failed.length) problem("Integrated mandatory gates failed");
  }
  const status=blocked?"blocked":incomplete?"incomplete":"eligible-for-independent-review";
  return outcome(status,rows,problems,integration);
}
