import test from 'node:test';
import assert from 'node:assert/strict';
import {compilePlanningDelta} from './compile.mjs';
import {planningFixture} from '../../scripts/frontier-planning-evaluator.mjs';
const handover='Synthetic example: retain observed evidence, keep CI unknown until run, fence stale workers, and inspect observed PRs before dispatch. Respect migration lock, quota and exclusive resources.';
const raw=(dispatchTaskIds,other={})=>JSON.stringify({dispatchTaskIds,handover,...other});
const cases=[
 ['kiran-pjm-a','normal',['api','ui']],['kiran-pjm-a','edge',['api','ui']],['kiran-pjm-a','adversarial',['ui']],
 ['leela-pjm-b','normal',['api','ui']],['leela-pjm-b','edge',['api','ui']],['leela-pjm-b','adversarial',['ui']]
];
for(const [role,variant,ids] of cases)test(role+' '+variant+' exact unchanged gate',()=>{
 const out=compilePlanningDelta(role,variant,raw(ids));
 assert.equal(out.grade.qualified,true,JSON.stringify(out.grade.checks));
 assert.equal(out.grade.expected,role==='kiran-pjm-a'?12:14);
 assert.equal(out.qualification,false);assert.equal(out.authorship,'hybrid-controller-facts-model-decisions');
 const graph=JSON.parse(out.files[0].content),fixture=planningFixture(role,variant);
 assert.equal(graph.ci,fixture.ci);assert.equal(graph.nodes.length,fixture.tasks.length);
 assert.deepEqual(graph.dispatch.map(d=>d.taskId),ids);
 assert.equal(graph.reconcile.length,fixture.tasks.filter(t=>t.observed==='reconcile').length);
 if(role==='kiran-pjm-a')assert.equal(out.files[1].content,handover);
});
for(const [name,variant,ids,check] of [
 ['blocked migration','edge',['api','database'],'P07'],
 ['dependency bypass','edge',['qa','ui'],'P07'],
 ['idle capacity','edge',['ui'],'P11'],
 ['expired existing PR','adversarial',['api'],'P07'],
 ['quota overrun','adversarial',['ui','database'],'P08'],
 ['exclusive resource','edge',['api','integration'],'P10'],
 ['same-lane when cross-lane possible','normal',['api','database'],'P14']
])test(name+' fails unchanged gate',()=>{
 const out=compilePlanningDelta('leela-pjm-b',variant,raw(ids));
 assert.equal(out.grade.qualified,false);assert.equal(out.grade.checks[check].pass,false);
});
for(const [name,value] of [
 ['extra facts',raw(['api','ui'],{ci:'green'})],['duplicate dispatch',raw(['api','api'])],
 ['unknown task',raw(['unseen'])],['empty handover',JSON.stringify({dispatchTaskIds:['api','ui'],handover:''})],
 ['wrapper',JSON.stringify({files:[]})],['invalid', 'not JSON']
])test(name+' rejected without projection',()=>assert.throws(()=>compilePlanningDelta('kiran-pjm-a','edge',value),/delta-/));
test('expired lease uses controller generation and synthetic identity',()=>{
 const graph=JSON.parse(compilePlanningDelta('kiran-pjm-a','edge',raw(['api','ui'])).files[0].content);
 const api=graph.dispatch.find(d=>d.taskId==='api');assert.equal(api.generation,4);assert.notEqual(api.worker,'worker-old');
 assert.equal(graph.reconcile.length,0);assert.equal(graph.ci,'unknown');
});
