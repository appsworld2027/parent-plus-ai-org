import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalHash } from '../scripts/frontier-admission.mjs';
import { conceptFixture, expectedTrace, evaluateConceptArtifact } from '../scripts/frontier-concept-evaluator.mjs';
const roles=['maya-ai-pm','arjun-cpto'],variants=['normal','edge','adversarial'];
const reason='The smallest safe slice solves the approved problem without expanding trust boundaries.';
const opts=(ids,choice)=>ids.map(id=>({id,recommended:id===choice,reason}));
function control(role,variant){
  const f=conceptFixture(role,variant);
  const a={fixtureHash:canonicalHash(f),contractVersion:f.contractVersion,acceptance:f.traces.map(t=>({id:t.id,sourceIds:t.sourceIds,expected:expectedTrace(t)})),
    states:f.states,scope:f.approvedScope,observed:{tests:'not-run',independentReview:'pending',ci:'unknown'}};
  if(role==='maya-ai-pm')Object.assign(a,{
    problem:{statement:'The two synthetic households lose reminders in chat and confuse the latest version.',sourceIds:variant==='edge'?['S2','S3','S5']:['S2','S3']},
    assumptions:[{id:'A1',hypothesis:'A shared tenant board may reduce duplicate reminders.',validation:'Measure confirmed visible saves in a synthetic cohort.'}],
    options:opts(['shared-board','improve-chat','no-build'],'shared-board'),
    metric:{event:'reminder-saved-and-visible',baseline:null,targetPercent:90,windowDays:14,minimumSample:20,numerator:'confirmed-visible-saves',denominator:'eligible-save-attempts'},
    decision:{action:variant==='adversarial'?'escalate':'continue',conflictSource:variant==='adversarial'?'S5':null,recommended:'retain-tenant-isolation',safeWork:['tenant-view','tenant-save']},
    handoff:{owner:'arjun-cpto',review:'pending',feedback:variant==='adversarial'?'material-product-change':'routine-validation',nextAction:'Lock the versioned contract and request independent challenge before implementation.'}
  });else Object.assign(a,{
    options:opts(['existing-board','rewrite-service','no-build'],'existing-board'),
    api:{list:{args:['tenant'],result:'cloned-record-array',invalid:'throw-invalid'},save:{args:['tenant','id','title','expectedVersion','requestId'],success:'record-id-title-version',errors:['invalid','stale','conflict'],createVersion:0,titleBounds:[1,80],sync:true}},
    storage:{rowKey:['tenant','id'],requestKey:['tenant','requestId'],fingerprint:['id','trimmedTitle','expectedVersion'],version:'safe-integer-monotonic',read:'tenant-filter-sort-clone',write:'atomic-row-and-request'},
    graph:f.graph,
    migration:{existingVersion:1,steps:['add-compatible','backfill-validate','switch-readers','retain-old-field'],rollback:'revert-reader-preserve-writes',schemaOwner:'tara-database',apiOwner:'dev-coder',conflict:variant==='adversarial'?'serialize-schema-before-api':'none'},
    failurePolicy:{stale:'reject-refresh-keep-draft',duplicate:'return-original-without-write',conflict:'reject-without-write',denied:'reject-no-data',timeout:'unknown-reconcile-before-retry',retry:'bounded-no-duplicate-effect'},
    handoff:{owners:['kiran-pjm-a','leela-pjm-b'],review:'pending',signoff:'pending',nextAction:'Lock interfaces, assign lane ownership and ask independent reviewer to challenge migration and invariants.'}
  });
  return a;
}
const brief='The synthetic evidence suggests reminders disappear in group chat or become inconsistent. Retain tenant isolation, measure confirmed saves, and hand the locked contract to Arjun. No review or test has run.';
const adr='# Decision\nMaintain the existing board, tenant scope and exact save interface.\n## Alternatives\nA rewrite adds migration risk; a no-build path leaves the reported issue unresolved.\n## Risks\nStale writes and retries can lead to duplicate effects or lost data. Preserve the draft and reconcile idempotently.\n## Verification\nUse the contract-linked synthetic traces and locked tests. CI and the independent reviewer are pending.';
function files(role,a){
  return [{path:role==='maya-ai-pm'?'contract.json':'interfaces.json',content:JSON.stringify(a)},
    {path:role==='maya-ai-pm'?'founder-brief.md':'architecture.md',content:role==='maya-ai-pm'?brief:adr}];
}
const run=(r,v,a)=>evaluateConceptArtifact(r,v,files(r,a));
for(const role of roles)for(const variant of variants)test(role+' '+variant+' trusted control passes only provisional screen',()=>{
  const result=run(role,variant,control(role,variant));
  assert.equal(result.screenPassed,true,JSON.stringify(result.checks));
  assert.equal(result.passed,role==='maya-ai-pm'?12:13);
  assert.equal(result.qualification,false);assert.equal(result.productionReady,false);
  assert.match(result.artifactHash,/^[a-f0-9]{64}$/);
});
test('independent oracle has fixed known results, replay and conflict do not mutate',()=>{
  const f=conceptFixture('maya-ai-pm','normal');
  assert.deepEqual(expectedTrace(f.traces.find(t=>t.id==='AC-replay')),[
    {ok:true,record:{id:'r1',title:'First',version:1}},
    {ok:true,record:{id:'r1',title:'First',version:1}},
    {ok:false,code:'conflict'},[{id:'r1',title:'First',version:1}]
  ]);
  assert.deepEqual(expectedTrace(f.traces.find(t=>t.id==='AC-isolation')).slice(2),
    [[{id:'r1',title:'A private',version:1}],[{id:'r1',title:'B private',version:1}]]);
  assert.deepEqual(expectedTrace(f.traces.find(t=>t.id==='AC-invalid')),
    [{ok:false,code:'invalid'},{ok:false,code:'invalid'},{ok:false,code:'invalid'},{ok:false,code:'invalid'},{ok:false,code:'invalid'},{throws:'invalid'},[]]);
});
test('all six synthetic fixtures distinctly bound',()=>{
  assert.equal(new Set(roles.flatMap(r=>variants.map(v=>canonicalHash(conceptFixture(r,v))))).size,6);
});
const defects=[
 ['maya-ai-pm','normal','wrong-fixture','C01',a=>a.fixtureHash='0'.repeat(64)],
 ['maya-ai-pm','normal','fabricated trace source','C02',a=>a.acceptance[0].sourceIds=['FAKE']],
 ['maya-ai-pm','normal','wrong acceptance result','C02',a=>a.acceptance[1].expected[2]={ok:true}],
 ['maya-ai-pm','edge','missing acceptance case','C02',a=>a.acceptance.pop()],
 ['maya-ai-pm','edge','narrow status clipped','C03',a=>a.states.find(s=>s.id==='narrow-320').effect='hide-status'],
 ['maya-ai-pm','edge','missing mobile observation source','M01',a=>a.problem.sourceIds=['S2','S3']],
 ['maya-ai-pm','edge','offline falsely succeeds','C03',a=>a.states.find(s=>s.id==='offline').effect='show-confirmed-record'],
 ['maya-ai-pm','adversarial','scope expands cross tenant','C04',a=>a.scope.in.push('cross-tenant')],
 ['maya-ai-pm','normal','invented CI','C05',a=>a.observed.ci='green'],
 ['maya-ai-pm','normal','problem not evidence linked','M01',a=>a.problem.sourceIds=['S1']],
 ['maya-ai-pm','normal','no validation of assumption','M02',a=>a.assumptions[0].validation=''],
 ['maya-ai-pm','normal','no-build omitted','M03',a=>a.options.pop()],
 ['maya-ai-pm','normal','false measured baseline','M04',a=>a.metric.baseline=65],
 ['maya-ai-pm','adversarial','material conflict not escalated','M05',a=>a.decision.action='continue'],
 ['maya-ai-pm','normal','invented review endorsement','M06',a=>a.handoff.review='approved'],
 ['arjun-cpto','normal','rewrites unnecessarily','A01',a=>{a.options[0].recommended=false;a.options[1].recommended=true}],
 ['arjun-cpto','normal','changes create version','A02',a=>a.api.save.createVersion=1],
 ['arjun-cpto','adversarial','global idempotency key','A03',a=>a.storage.requestKey=['requestId']],
 ['arjun-cpto','edge','non-atomic save','A03',a=>a.storage.write='separate-row-and-request'],
 ['arjun-cpto','normal','cycle','A04',a=>a.graph.find(x=>x.id==='contract').dependsOn=['release']],
 ['arjun-cpto','normal','test challenge omitted','A04',a=>a.graph.find(x=>x.id==='test-signoff').dependsOn=['locked-tests']],
 ['arjun-cpto','normal','UI unnecessarily blocked','A04',a=>a.graph.find(x=>x.id==='ui').dependsOn.push('database')],
 ['arjun-cpto','adversarial','incompatible schema parallelized','A04',a=>a.graph.find(x=>x.id==='api').dependsOn=['test-signoff']],
 ['arjun-cpto','normal','wrong schema owner','A04',a=>a.graph.find(x=>x.id==='database').owner='dev-coder'],
 ['arjun-cpto','edge','destructive migration','A05',a=>a.migration.steps=['drop-field','backfill-validate','switch-readers','retain-old-field']],
 ['arjun-cpto','edge','rollback loses writes','A05',a=>a.migration.rollback='delete-new-rows'],
 ['arjun-cpto','adversarial','unreconciled timeout','A06',a=>a.failurePolicy.timeout='retry-immediately'],
 ['arjun-cpto','normal','fake signoff','A07',a=>a.handoff.signoff='approved']
];
for(const [role,variant,name,id,mutate] of defects)test('reject '+name,()=>{
  const a=control(role,variant);mutate(a);
  const r=run(role,variant,a);
  assert.equal(r.screenPassed,false);assert.equal(r.checks[id]?.pass,false,JSON.stringify(r.checks));
});
test('malformed manifest fails closed',()=>{
  const r=evaluateConceptArtifact('maya-ai-pm','normal',[{path:'contract.json',content:'{}'}]);
  assert.equal(r.checks.C00.pass,false);assert.equal(r.screenPassed,false);
});
test('invalid JSON fails closed',()=>{
  const f=files('arjun-cpto',control('arjun-cpto','normal'));f[0].content='{';
  assert.equal(evaluateConceptArtifact('arjun-cpto','normal',f).screenPassed,false);
});
test('founder brief cannot be empty or excessive',()=>{
  const f=files('maya-ai-pm',control('maya-ai-pm','normal'));f[1].content='x'.repeat(1700);
  assert.equal(evaluateConceptArtifact('maya-ai-pm','normal',f).checks.M07.pass,false);
});
test('ADR missing risks section fails',()=>{
  const f=files('arjun-cpto',control('arjun-cpto','normal'));f[1].content=f[1].content.replace('## Risks','## Notes');
  assert.equal(evaluateConceptArtifact('arjun-cpto','normal',f).checks.A08.pass,false);
});
