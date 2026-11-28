import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectReviewer,reviewerCandidates} from './select.mjs';
test('selects highest preferred distinct reviewer actually present in live catalog',()=>{
 assert.equal(selectReviewer(['nvidia/nemotron-3-ultra-550b-a55b','moonshotai/kimi-k3.1-pro','deepseek-ai/deepseek-v3.2']), 'deepseek-ai/deepseek-v3.2');
 assert.equal(selectReviewer(['z-ai/glm-5.3-flash','moonshotai/kimi-k3.1-pro']), 'moonshotai/kimi-k3.1-pro');
});
test('no author, previous held reviewer, unknown route or unrecognized catalog fallback',()=>{
 assert.equal(selectReviewer(['nvidia/nemotron-3-ultra-550b-a55b','minimaxai/minimax-m3.1-flash','mistralai/mistral-large-4-1t-a52b','unknown/model']),null);
 assert.equal(selectReviewer(null),null);
 assert.equal(new Set(reviewerCandidates).size,reviewerCandidates.length);
});
