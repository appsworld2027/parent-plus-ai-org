import {test} from 'node:test';
import assert from 'node:assert/strict';
import {screenQaDependencyQuote} from './qa-quote.mjs';
const graph={nodes:[{id:'qa',dependsOn:['api','database','ui','integration']},...['api','database','ui','integration'].map(id=>({id,observed:'pending'}))]};
const review=quote=>({evidence:[{criterion:'dependency-completion',source:'AUTHOR',status:'supported',quote}]});
test('actual false-positive Qwen approval quote is rejected',()=>assert.equal(screenQaDependencyQuote(graph,review('Dependencies satisfied: tests complete')).valid,false));
test('all four incomplete QA predecessors explicitly named with completion requirement',()=>assert.equal(screenQaDependencyQuote(graph,review('API, database, UI and integration must all be complete before QA.')).valid,true));
test('unblocking is not completion',()=>assert.equal(screenQaDependencyQuote(graph,review('All of api, database, ui, integration must be unblocked before QA.')).valid,false));
test('omitted pending UI is rejected',()=>assert.deepEqual(screenQaDependencyQuote(graph,review('Before QA, api, database and integration must complete.')).missing,['ui']));
test('controller-only quotations cannot prove author judgment',()=>assert.equal(screenQaDependencyQuote(graph,{evidence:[{criterion:'dependency-completion',source:'CONTROLLER',status:'supported',quote:'api database ui integration complete before QA'}]}).valid,false));

test('actual correct Qwen evidence using completing is accepted',()=>assert.equal(screenQaDependencyQuote(graph,review('QA depends on api, database, ui, integration all completing, not merely unblocked')).valid,true));
