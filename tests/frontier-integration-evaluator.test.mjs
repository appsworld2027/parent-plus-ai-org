import test from "node:test";
import assert from "node:assert/strict";
import {prepareFrontierCasebook} from "../scripts/frontier-casebook.mjs";
import {evaluateRaviArtifact,raviContract} from "../scripts/frontier-integration-evaluator.mjs";
const book=prepareFrontierCasebook({sourceSha:"a".repeat(40),seed:"synthetic-ravi-proof-test"});
const fixture=variant=>book.cases.find(c=>c.fixture.role==="ravi-integration"&&c.fixture.variant===variant).fixture;
const ref=`export async function send(input,{transport,sleep}){
 const correlationId=input.idempotencyKey;let attempts=0;
 const result=state=>({state,correlationId,attempts});
 if(typeof correlationId!=="string"||!correlationId.trim())return result("failed");
 const call=async operation=>{attempts++;const ctl=new AbortController();let timer;try{
 return await Promise.race([transport({...input,operation},{signal:ctl.signal}),new Promise((_,reject)=>{timer=setTimeout(()=>{ctl.abort();reject(Error("timeout"));},1000)})]);
 }finally{clearTimeout(timer);}};
 const confirmed=x=>x&&typeof x.deliveryId==="string"&&x.deliveryId.trim()&&(x.status===200||(x.status===409&&x.duplicate===true));
 while(attempts<3){let x;try{x=await call("send");}catch(e){
   if(e?.code==="TIMEOUT_AFTER_EFFECT"&&attempts<3){try{return result(confirmed(await call("status"))?"delivered":"uncertain");}catch{return result("uncertain");}}
   return result("uncertain");
 }
 if(confirmed(x))return result("delivered");
 if(x?.status===401)return result("failed");
 if(x?.status===429||x?.status===503){
   if(attempts===3)return result("failed");
   const delay=x.status===429&&Number.isFinite(x.retryAfterMs)?Math.max(0,Math.min(2000,x.retryAfterMs)):100;
   await sleep(delay);continue;
 }
 return result("uncertain");
 }
 return result("failed");
}`;
const candidate=(code=ref)=>({files:[{path:"adapter.mjs",content:code},{path:"adapter.test.mjs",content:"Synthetic caller test fixture only"}]});
const image=process.env.FRONTIER_TEST_NODE_IMAGE;
test("mock integration contract explicitly has bounded attempts, status reconciliation and no provider",()=>{
 assert.match(raviContract.rules,/At most 3 total calls/);
 assert.match(raviContract.rules,/never resend blindly/);
 assert.match(raviContract.rules,/call live network/);
});
test("actual isolated Ravi reference handles every fault/control in all three cases",{skip:!image},async()=>{
 for(const variant of ["normal","edge","adversarial"]){
  const r=await evaluateRaviArtifact(fixture(variant),candidate(),{image});
  assert.equal(r.status,"integration-screen-pass",JSON.stringify(r));assert.equal(r.behavior.counts.pass,12);
  assert.equal(r.liveProviderCalled,false);assert.equal(r.qualified,false);
 }
});
test("integration gate rejects false success, duplicate resend and unbounded delay",{skip:!image},async()=>{
 for(const code of [
  ref.replace('return result("uncertain");\n }','return result("delivered");\n }'),
  ref.replace('await call("status")','await call("send")'),
  ref.replace('Math.max(0,Math.min(2000,x.retryAfterMs))','x.retryAfterMs')
 ]){
  const r=await evaluateRaviArtifact(fixture("edge"),candidate(code),{image});
  assert.equal(r.status,"integration-screen-fail",JSON.stringify(r));assert.ok(r.behavior.counts.fail>0);
 }
});
