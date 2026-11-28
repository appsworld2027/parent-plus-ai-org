import {test} from 'node:test';
import assert from 'node:assert/strict';
import {selectReviewer,reviewerCandidates} from './select.mjs';
test('uses GLM only after exact live catalog match',()=>{
 assert.deepEqual(reviewerCandidates,['z-ai/glm-5.3-flash']);
 assert.equal(selectReviewer(['moonshotai/kimi-k3.1-pro','z-ai/glm-5.3-flash']),'z-ai/glm-5.3-flash');
 assert.equal(selectReviewer(['moonshotai/kimi-k3.1-pro','nvidia/nemotron-3-ultra-550b-a55b']),null);
});
