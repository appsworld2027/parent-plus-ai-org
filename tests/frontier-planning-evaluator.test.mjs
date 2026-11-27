import test from 'node:test';
import assert from 'node:assert/strict';
import {canonicalHash} from '../scripts/frontier-admission.mjs';
import {planningFixture,evaluatePlanningArtifact} from '../scripts/frontier-planning-evaluator.mjs';
const roles=['kiran-pjm-a','leela-pjm-b'];
const variants=['normal','edge','adversarial'];
function clean(role,variant){
  const f=planningFixture(role,variant);
  const fixtureHash=canonicalHash(f);
  const nodes=f.tasks.map(({id,owner,lane,dependsOn,observed,evidence})=>({id,owner,lane,dependsOn,observed,evidence}));
  const dispatch=(variant==='adversarial'?['ui']:['api','ui']).map((taskId,i)=>({taskId,worker:'worker-'+(i+1),generation:taskId==='api'&&variant==='edge'?4:1,base:f.base,expiresAt:f.leaseUntil}));
  const reconcile=variant==='adversarial'?[{taskId:'api',fencedGeneration:4,existingPr:'synthetic-pr-41',base:f.base,action:'inspect-pr-and-fence'},
    {taskId:'integration',fencedGeneration:7,existingPr:'synthetic-pr-42',base:f.base,action:'inspect-pr-and-fence'}]:[];
  const ci=variant==='normal'?'not-run':'unknown';
  const plan={fixtureHash,nodes,dispatch,reconcile,ci};
  const register={fixtureHash,conflicts:variant==='normal'?[]:[
    {tasks:['api','integration'],resources:['api:board','file:board.mjs','product:reminder-visibility'],mode:'serialize'},
    {tasks:['database','integration'],resources:['schema:reminders'],mode:'serialize'}]};
  const files=()=>role==='kiran-pjm-a'?[{path:'task-graph.json',content:JSON.stringify(plan)},{path:'handover.md',content:'Synthetic handover; no CI or release claimed.'}]:
    [{path:'lane-plan.json',content:JSON.stringify(plan)},{path:'conflict-register.json',content:JSON.stringify(register)}];
  return {f,plan,register,files};
}
for(const role of roles)for(const variant of variants)test(role+' '+variant+' clean reference',()=>{
  const c=clean(role,variant);
  const r=evaluatePlanningArtifact(role,variant,c.files());
  assert.equal(r.qualified,true,JSON.stringify(r));
  assert.equal(r.qualification,false);
  assert.equal(r.passed,role==='kiran-pjm-a'?12:14);
});
const mutations=[
 ['wrong fixture','P01','normal',c=>c.plan.fixtureHash='bad'],
 ['missing node','P02','normal',c=>c.plan.nodes.pop()],
 ['owner drift','P03','normal',c=>c.plan.nodes[3].owner='founder'],
 ['test lock bypass','P04','normal',c=>c.plan.nodes[3].dependsOn=[]],
 ['false completion','P05','edge',c=>{c.plan.nodes[3].observed='complete';c.plan.nodes[3].evidence='invented';}],
 ['false CI green','P06','edge',c=>c.plan.ci='green'],
 ['blocked migration','P07','edge',c=>c.plan.dispatch[0].taskId='database'],
 ['duplicate worker','P08','edge',c=>c.plan.dispatch[1].worker=c.plan.dispatch[0].worker],
 ['expired lease reused','P09','edge',c=>c.plan.dispatch[0].generation=3],
 ['conflicting API work','P10','edge',c=>c.plan.dispatch[1].taskId='integration'],
 ['unnecessary serialization','P11','normal',c=>c.plan.dispatch.pop()],
 ['missing reconciliation','P12','adversarial',c=>c.plan.reconcile=[]],
 ['missing conflict','P13','edge',c=>c.register.conflicts.shift()],
 ['missing resource conflict','P13','edge',c=>c.register.conflicts[0].resources.pop()],
 ['cycle introduced','P04','normal',c=>c.plan.nodes[0].dependsOn=['release']],
 ['unready QA','P07','normal',c=>c.plan.dispatch[0].taskId='qa'],
 ['both workers same lane','P14','normal',c=>c.plan.dispatch[1].taskId='database'],
 ['stale SHA','P09','adversarial',c=>c.plan.dispatch[0].base='b'.repeat(40)],
 ['quota budget exceeded','P08','adversarial',c=>c.plan.dispatch.push({taskId:'database',worker:'worker-2',generation:1,base:c.f.base,expiresAt:c.f.leaseUntil})],
 ['resume old worker','P09','edge',c=>c.plan.dispatch[0].worker='worker-old'],
 ['dispatch unverified existing PR','P07','adversarial',c=>{c.plan.dispatch[0].taskId='api';c.plan.dispatch[0].generation=5;}]
];
for(const [name,check,variant,mutate] of mutations)test('rejects '+name,()=>{
  const c=clean('leela-pjm-b',variant);mutate(c);
  const r=evaluatePlanningArtifact('leela-pjm-b',variant,c.files());
  assert.equal(r.qualified,false,JSON.stringify(r));
  assert.equal(r.checks[check].pass,false,JSON.stringify(r));
});
test('malformed JSON, duplicate or extra manifest and bad nested variants fail closed',()=>{
  const c=clean('kiran-pjm-a','normal');
  for(const files of [[{path:'task-graph.json',content:'{'},{path:'handover.md',content:'x'}],[...c.files(),{path:'extra.md',content:'x'}],
    [c.files()[0],c.files()[0]]]){
    const r=evaluatePlanningArtifact('kiran-pjm-a','normal',files);
    assert.equal(r.qualified,false);
    assert.equal(r.checks.P00.pass,false);
  }
  c.plan.dispatch=[null];
  const r=evaluatePlanningArtifact('kiran-pjm-a','normal',c.files());
  assert.equal(r.qualified,false);
});
