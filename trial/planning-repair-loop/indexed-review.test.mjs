import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeSourceSpans,resolveSelectedSpans} from './indexed-review.mjs';
const a='Fence old workers and verify PR against current base. All four must complete before QA.',c='{"fixture":{},"dispatchTaskIds":["database"]}',spans=makeSourceSpans(a,c,['database']);
const review=(spanId,source='CONTROLLER')=>({verdict:'APPROVE',evidence:[{criterion:'controller-plan',source,status:'supported',spanId}],findings:[]});
test('selecting a real JSON property cannot invent braces',()=>assert.equal(resolveSelectedSpans(review('C0'),spans).evidence[0].quote,'"dispatchTaskIds":["database"]'));
test('unknown index is rejected',()=>assert.throws(()=>resolveSelectedSpans(review('C9'),spans)));
test('wrong source is rejected',()=>assert.throws(()=>resolveSelectedSpans(review('A0'),spans)));
test('exact author sentence remains unmodified',()=>assert.equal(resolveSelectedSpans(review('A0','AUTHOR'),spans).evidence[0].quote,'Fence old workers and verify PR against current base.'));
