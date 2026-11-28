import {test} from 'node:test'; import assert from 'node:assert/strict';
import {isFree,selectReviewer} from './select.mjs';
const id='google/gemma-4-31b-it:free', row={id,pricing:{prompt:'0',completion:'0'},supported_parameters:['response_format']};
test('requires exact zero-price free route and response format support',()=>{
 assert.equal(selectReviewer([row],id),id);
 for(const bad of [{...row,pricing:{prompt:'0.001',completion:'0'}},{...row,pricing:{prompt:'0',completion:'0',request:'0.001'}},{...row,pricing:{prompt:'0'}},{...row,supported_parameters:[]},{...row,id:'google/gemma-4-31b-it'}]) assert.equal(isFree(bad),false);
 assert.equal(selectReviewer([row],'nvidia/nemotron-3-ultra-550b-a55b:free'),null);
 assert.equal(selectReviewer([row],'baidu/ernie-5.5-flash-preview:free'),null);
});
