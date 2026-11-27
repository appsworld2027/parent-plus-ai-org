import {test} from 'node:test';
import assert from 'node:assert/strict';
import {EXECUTION_STRATEGIES,validateExecutionStrategies,selectExecutionStrategy,strategyPrompt,resolveFeatureLoop} from '../scripts/execution-strategy.mjs';
import {route} from '../scripts/agent-router.mjs';
const clone=x=>structuredClone(x);
test('free profile selects stage and exact model-specific budget without authorizing routes',()=>{
 const s=selectExecutionStrategy({engine:'free',stage:'ai:tests-review',model:'groq/qwen/qwen3.8-27b'});
 assert.equal(s.id,'free-packeted');assert.equal(s.contextMode,'fresh-per-packet');assert.equal(s.taskClass,'review');assert.equal(s.packet.completionTokenLimit,1800);assert.equal(s.packet.inputTokenTarget,2000);assert.equal(s.quota.maxTransientRetries,1);assert.equal(s.worker.outputTokenCap,512);assert.equal(s.quality.independentReview,true);assert.match(strategyPrompt(s),/fresh context/);
 const original=route({labels:['ai:build'],engines:{free:true},freeModel:'opencode/deepseek-v4.1-flash-free'});
 assert.equal(original.free_model_override_rejected,true);assert.equal(original.execution_strategy,'free-packeted');
});
test('paid strategy configuration is present but cannot enable paid inference or fallback',()=>{
 const c=clone(EXECUTION_STRATEGIES);assert.equal(c.profiles['frontier-loop'].enabled,false);
 c.profiles['frontier-loop'].enabled=true;
 assert.throws(()=>selectExecutionStrategy({engine:'claude',stage:'ai:build',config:c,spendAuthorization:{founderApproved:true,trustedRuntimeQualified:true,budgetUsd:10,approvalRef:'https://github.com/appsworld2027/x'}}),/canonical policy/);
 const r=route({labels:['ai:build','engine:codex'],engines:{free:true,codex:true}});assert.equal(r.engine,'free');assert.equal(r.execution_strategy,'free-packeted');assert.equal(r.fallback,false);
});
test('quality gates and effective free budgets fail closed',()=>{
 for(const k of Object.keys(EXECUTION_STRATEGIES.sharedQuality)){const c=clone(EXECUTION_STRATEGIES);c.sharedQuality[k]=false;assert.throws(()=>validateExecutionStrategies(c),/quality gate/)}
 const c=clone(EXECUTION_STRATEGIES);c.profiles['free-packeted'].worker.outputTokenCap=1000;assert.throws(()=>validateExecutionStrategies(c),/Free limits/);
 const d=clone(EXECUTION_STRATEGIES);d.profiles['free-packeted'].taskOverrides.review.inputTokenTarget=9000;assert.throws(()=>selectExecutionStrategy({engine:'free',stage:'ai:review',config:d}),/effective packet/);
 assert.throws(()=>selectExecutionStrategy({engine:'free',stage:'ai:release'}),/Unknown working stage/);
});
test('route emits machine-enforced worker ceilings and selects independent reviewer',()=>{
 const r=route({labels:['ai:review'],engines:{free:true}});assert.equal(r.free_model,'groq/qwen/qwen3.8-27b');assert.equal(r.execution_strategy,'free-packeted');assert.equal(r.strategy_worker_max_turns,60);assert.equal(r.strategy_worker_wall_seconds,3600);assert.equal(r.strategy_worker_output_cap,512);assert.equal(r.strategy_worker_review_output_cap,768);
});
test('future frontier design can be inspected but never selected under current policy',()=>{
 const p=EXECUTION_STRATEGIES.profiles['frontier-loop'];assert.equal(p.mode,'iterative-product-loop');assert.equal(p.contextMode,'persistent-with-compaction');assert.equal(p.requiresExplicitSpendApproval,true);assert.ok(p.packet.inputTokenTarget>EXECUTION_STRATEGIES.profiles['free-packeted'].packet.inputTokenTarget);assert.equal(p.enabled,false);
});

test('outer controller uses strategy fix-round ceilings; products cannot widen them',()=>{
 const free=selectExecutionStrategy({engine:'free',stage:'ai:build'});assert.deepEqual(resolveFeatureLoop(free),{maxFixRounds:5,maxAcceptanceGateRetries:2,checkpointMode:'packet',compaction:'fresh-context'});assert.equal(resolveFeatureLoop(free,{maxFixRounds:9,maxAcceptanceGateRetries:4}).maxFixRounds,5);assert.equal(resolveFeatureLoop(free,{maxFixRounds:3,maxAcceptanceGateRetries:1}).maxAcceptanceGateRetries,1);assert.throws(()=>resolveFeatureLoop(free,{maxFixRounds:'5'}),/Invalid product/);
 assert.equal(EXECUTION_STRATEGIES.profiles['frontier-loop'].featureLoop.checkpointMode,'feature-diff');
});
