import test from 'node:test';import assert from 'node:assert/strict';
import {EXECUTION_STRATEGIES,selectExecutionStrategy,validateExecutionStrategies} from './execution-strategy.mjs';
const model='groq/openai/gpt-oss-120b';
test('GPT review has a case-specific reasoning budget, author remains low',()=>{
 const r=selectExecutionStrategy({engine:'free',stage:'ai:tests-review',model});
 const a=selectExecutionStrategy({engine:'free',stage:'ai:tests',model});
 assert.equal(r.packet.reasoningEffort,'medium');assert.equal(r.packet.completionTokenLimit,1800);
 assert.equal(a.packet.reasoningEffort,'low');assert.equal(a.packet.completionTokenLimit,1400);
 assert.equal(r.contextMode,'fresh-per-packet');assert.equal(r.quality.independentReview,true);
});
test('Qwen and paid routing boundaries are unchanged',()=>{
 const q=selectExecutionStrategy({engine:'free',stage:'ai:tests-review',model:'groq/qwen/qwen3.8-27b'});
 assert.equal(q.packet.reasoningEffort,'provider-default');
 assert.throws(()=>selectExecutionStrategy({engine:'claude',stage:'ai:tests-review',model:'any'}));
});
test('Unknown task and over-budget effective model override fail closed',()=>{
 const bad=structuredClone(EXECUTION_STRATEGIES);
 bad.profiles['free-packeted'].taskModelAdjustments.unapproved={};
 assert.throws(()=>validateExecutionStrategies(bad));
 const tooMuch=structuredClone(EXECUTION_STRATEGIES);
 tooMuch.profiles['free-packeted'].taskModelAdjustments.review[model].completionTokenLimit=3001;
 assert.throws(()=>selectExecutionStrategy({engine:'free',stage:'ai:tests-review',model,config:tooMuch}));
});
