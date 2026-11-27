import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateIrisHtml,IRIS_CHECKS,validateIrisReceipt,deriveIrisSeccompProfile } from '../scripts/frontier-iris-evaluator.mjs';
const image=process.env.FRONTIER_IRIS_IMAGE;
const reference=readFileSync(new URL('../fixtures/frontier/iris-reference.html',import.meta.url),'utf8');
const valid=()=>({schema:1,checks:Object.fromEntries(IRIS_CHECKS.map(id=>[id,{pass:true}])),networkAttempts:0,browserSandbox:true});
test('sandbox profile preserves pinned upstream rules and adds only nested namespace chroot',()=>{
  const raw=readFileSync(new URL('../fixtures/frontier/iris-runner/seccomp_profile.json',import.meta.url));
  const upstream=JSON.parse(raw),derived=JSON.parse(deriveIrisSeccompProfile(raw));
  const added=derived.syscalls.pop();
  assert.deepEqual(added,{names:['chroot'],action:'SCMP_ACT_ALLOW',args:[]});
  assert.deepEqual(derived,upstream);
  assert.throws(()=>deriveIrisSeccompProfile(Buffer.concat([raw,Buffer.from(' ')])),/digest mismatch/);
});
test('strict receipt requires all ten locked checks, true sandbox and matching exit',()=>{
  assert.equal(validateIrisReceipt(JSON.stringify(valid()),0).status,'behavior-pass');
  assert.equal(validateIrisReceipt(JSON.stringify(valid()),1).status,'infrastructure-or-incomplete');
  const fail=valid();fail.checks[IRIS_CHECKS[0]]={pass:false,reason:'assertion failed'};
  assert.equal(validateIrisReceipt(JSON.stringify(fail),1).status,'behavior-fail');
  for(const mutate of [x=>delete x.checks[IRIS_CHECKS[0]],x=>x.browserSandbox=false,x=>x.checks.fake={pass:true},x=>x.networkAttempts=1,x=>x.checks[IRIS_CHECKS[0]].pass='true']){
    const r=valid();mutate(r);assert.equal(validateIrisReceipt(JSON.stringify(r),0).status,'infrastructure-or-incomplete');
  }
  assert.equal(validateIrisReceipt('fake\n'+JSON.stringify(valid()),0).status,'infrastructure-or-incomplete');
});
test('unsafe input or mutable image tag rejected',async()=>{
  await assert.rejects(evaluateIrisHtml('',{image:'sha256:'+'a'.repeat(64)}),/invalid HTML/);
  await assert.rejects(evaluateIrisHtml(reference,{image:'latest'}),/immutable local image/);
});
test('trusted reference passes all ten in isolated real Chromium',async()=>{
  assert.match(image??'',/^sha256:[a-f0-9]{64}$/,'CI must build and select immutable runner image');
  const r=await evaluateIrisHtml(reference,{image});
  assert.equal(r.status,'behavior-pass',JSON.stringify(r));assert.equal(r.passed,10);assert.equal(r.qualification,false);assert.equal(r.productionReady,false);
});
const mutants=[
 ['false confirmation before external save','I02-create-confirmation',h=>h.replace("status.textContent='Saving reminder'","status.textContent='Saved reminder'")],
 ['stale draft discarded','I05-stale-recovery',h=>h.replace("status.textContent='Not saved';error.textContent='This reminder changed elsewhere","input.value='';status.textContent='Not saved';error.textContent='This reminder changed elsewhere")],
 ['offline save enabled','I07-offline',h=>h.replace("ready=result.state==='ok';status.textContent=ready?'Ready':'Offline — cached reminders only'","ready=true;status.textContent=result.state==='ok'?'Ready':'Offline — cached reminders only'")],
 ['narrow viewport clipped','I09-narrow-keyboard',h=>h.replace('main{max-width:660px','main{min-width:500px;max-width:660px')],
 ['external request attempted','I10-no-external-request',h=>h.replace('load();\n</script>','fetch("https://example.invalid/synthetic").catch(()=>{});load();\n</script>')]
];
for(const [name,id,mutation] of mutants)test('reject '+name,async()=>{
  assert.match(image??'',/^sha256:[a-f0-9]{64}$/);
  const bad=mutation(reference);assert.notEqual(bad,reference);
  const r=await evaluateIrisHtml(bad,{image});
  assert.equal(r.status,'behavior-fail',JSON.stringify(r));assert.equal(r.checks[id]?.pass,false,JSON.stringify(r.checks));
});
