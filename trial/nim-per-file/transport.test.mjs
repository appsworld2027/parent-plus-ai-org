import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {materializeFiles} from './transport.mjs';
const setup=t=>{const root=mkdtempSync(join(tmpdir(),'per-file-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return root};
const steps=[{path:'graph.json',format:'json_object',maxTokens:1000},{path:'handover.md',format:'text',maxTokens:300}];
function opts(root,invoke){return {root,requiredPaths:steps.map(s=>s.path),steps,model:'fixture/model',outputBudget:1300,scope:'synthetic',buildPrompt:(s,prior)=>JSON.stringify([s.path,prior]),invoke}}
const response=(content,over={})=>({httpStatus:200,reportedModel:'fixture/model',finishReason:'stop',content,usage:{total_tokens:10},...over});
test('per-file transport preserves raw bytes, binds prior file and resumes without inference',async t=>{
 const root=setup(t),calls=[],out=await materializeFiles(opts(root,async a=>{calls.push(a);return response(a.format==='json_object'?'  {"x": 1}\n':'# Handover\n')}));
 assert.equal(out.files[0].content,'  {"x": 1}\n');assert.equal(calls.length,2);assert.match(calls[1].prompt,/\\n/);
 const recovered=await materializeFiles(opts(root,()=>{throw Error('must not call')}));
 assert.deepEqual(recovered,out);
});
for(const [name,res] of [['malformed JSON',response('reasoning {"x":1}')],['truncated',response('{"x":1}',{finishReason:'length'})],['wrong model',response('{"x":1}',{reportedModel:'other'})],['quota', {httpStatus:429,failure:'http-429'}]])test(name+' stops and remains held without second request',async t=>{
 const root=setup(t);let calls=0;const o=opts(root,async()=>{calls++;return res});
 await assert.rejects(materializeFiles(o),/blocked/);await assert.rejects(materializeFiles(o),/held/);assert.equal(calls,1);
});
test('incomplete durable attempt blocks restart',async t=>{
 const root=setup(t);writeFileSync(join(root,'01.attempt.json'),'{}');await assert.rejects(materializeFiles(opts(root,()=>{throw Error('must not call')})),/incomplete-attempt-held/);
});
test('tampered checkpoint is rejected',async t=>{
 const root=setup(t);const o=opts(root,async a=>response(a.format==='json_object'?'{"x":1}':'handover'));await materializeFiles(o);
 writeFileSync(join(root,'01.raw.txt'),'{"x":2}');await assert.rejects(materializeFiles(o),/checkpoint-integrity/);
});
test('invalid paths/order/budget dispatch nothing',async t=>{
 const o=opts(setup(t),()=>{throw Error('must not call')});await assert.rejects(materializeFiles({...o,outputBudget:1299}),/invalid per-file/);
 await assert.rejects(materializeFiles({...o,requiredPaths:['../x.json','handover.md']}),/invalid per-file/);
});
