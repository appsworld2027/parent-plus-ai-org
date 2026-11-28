import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyRepairChain} from './verify.mjs';
const root=new URL('../evidence/',import.meta.url);
const read=p=>readFileSync(new URL(p,root),'utf8');
test('real preserved complete cycle has three changes, three repairs and one approval',()=>{
 const r=verifyRepairChain(read);assert.equal(r.valid,true);assert.equal(r.reviewCount,4);assert.equal(r.repairCount,3);assert.equal(r.finalVerdict,'APPROVE');assert.equal(r.finalArtifact,'6a62b995a588a5b17bfeb6f16d18250ab24253e2badc219ee1857dd948a02423');assert.equal(r.qualification,false);
});
test('rejects tampered source, review, repair or claimed approval',()=>{
 for(const target of ['source-ultra/author.raw.json','groq-qwen-provenance-20261128/review/01.raw.txt','nvidia-ultra-repair2-20261128/author/01.raw.txt','groq-qwen-repair3-review-20261128/review/01.raw.txt']){
  const changed=p=>p===target?read(p)+' ':read(p);
  assert.equal(verifyRepairChain(changed).valid,false);
 }
 const missing=p=>{if(p==='groq-qwen-repair3-review-20261128/report.json')throw Error('missing');return read(p);};
 assert.equal(verifyRepairChain(missing).valid,false);
});
