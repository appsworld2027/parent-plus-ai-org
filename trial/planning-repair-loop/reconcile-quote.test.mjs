import {test} from 'node:test';
import assert from 'node:assert/strict';
import {screenReconcileQuote} from './reconcile-quote.mjs';
const graph={reconcile:[{taskId:'api'},{taskId:'integration'}]};
const review=quote=>({evidence:[{criterion:'authority-reconciliation',source:'AUTHOR',status:'supported',quote}]});
test('actual Kiran under-evidence quote rejected',()=>assert.equal(screenReconcileQuote(graph,review('reconcile tasks lack completion evidence, old‑worker fencing required before any reassignment')).valid,false));
test('actual Leela fencing plus PR current-base requirement accepted',()=>assert.equal(screenReconcileQuote(graph,review('old‑worker fencing required — must verify PR outcomes against current base aaaa...')).valid,true));
test('current base required',()=>assert.equal(screenReconcileQuote(graph,review('fence old worker, inspect PR against prior base')).valid,false));
test('normal case with no reconciliation skipped',()=>assert.equal(screenReconcileQuote({reconcile:[]},review('No expired/reconcile/blocked tasks')).valid,true));
