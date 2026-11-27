// Synthetic mock-only integration challenge. No live provider calls.
import {intakeFrontierArtifact} from "./frontier-casebook.mjs";
import {evaluateReviewReproduction} from "./frontier-board-evaluator.mjs";
export const raviContract=Object.freeze({
  api:"export async function send(input,{transport,sleep,clock})",
  input:"{tenant,notificationId,idempotencyKey,body}; nonempty idempotencyKey required",
  transport:"await transport({operation:'send'|'status',tenant,notificationId,idempotencyKey,body}, {signal})",
  outcome:"{state:'delivered'|'failed'|'uncertain',correlationId:input.idempotencyKey,attempts:total transport calls}",
  rules:"At most 3 total calls, each bounded within 1 second. 200 only confirmed with nonempty deliveryId; 409 additionally requires duplicate:true. 429 retryAfterMs clamped 0..2000; 503 bounded backoff. 401 terminal. Malformed response or ordinary timeout uncertain, no false success. TIMEOUT_AFTER_EFFECT must reconcile via status with same key, never resend blindly. Do not expose provider bodies/secrets, call live network, or wait after final attempt."
});
const LOCKED=`import test from "node:test";
import assert from "node:assert/strict";
import {send} from "./board.mjs";
const input={tenant:"t-test",notificationId:"note-77",idempotencyKey:"idem-77",body:"synthetic"};
function mock(sequence){const calls=[],waits=[];let index=0;return {calls,waits,ctx:{clock:()=>0,sleep:async n=>waits.push(n),transport:async req=>{calls.push(structuredClone(req));const result=sequence[index++];if(result instanceof Error)throw result;return result;}}};}
async function run(seq,expected,attempts){const m=mock(seq),r=await send(input,m.ctx);assert.equal(r.state,expected);assert.equal(r.correlationId,input.idempotencyKey);assert.equal(r.attempts,attempts);assert.equal(m.calls.length,attempts);assert.ok(m.calls.every(c=>c.idempotencyKey===input.idempotencyKey));return {r,...m};}
test("verified successful delivery",async()=>{await run([{status:200,deliveryId:"d1"}],"delivered",1);});
test("confirmed duplicate is idempotent success",async()=>{await run([{status:409,duplicate:true,deliveryId:"d1"}],"delivered",1);});
test("429 honors numeric Retry-After and same key",async()=>{const x=await run([{status:429,retryAfterMs:120},{status:200,deliveryId:"d"}],"delivered",2);assert.deepEqual(x.waits,[120]);assert.ok(x.calls.every(c=>c.operation==="send"));});
test("large Retry-After bounded",async()=>{const x=await run([{status:429,retryAfterMs:999999},{status:200,deliveryId:"d"}],"delivered",2);assert.deepEqual(x.waits,[2000]);});
test("transient failure bounded retry",async()=>{const x=await run([{status:503},{status:200,deliveryId:"d"}],"delivered",2);assert.equal(x.waits.length,1);assert.ok(x.waits[0]>=0&&x.waits[0]<=2000);});
test("auth failure terminal and no secret leak",async()=>{const x=await run([{status:401,error:"SYNTHETIC_SECRET_123"}],"failed",1);assert.equal(x.waits.length,0);assert.ok(!JSON.stringify(x.r).includes("SYNTHETIC_SECRET_123"));});
test("malformed success cannot be claimed",async()=>{await run([{status:200}],"uncertain",1);});
test("unconfirmed duplicate is not success",async()=>{await run([{status:409,deliveryId:"d"}],"uncertain",1);});
test("timeout after effect reconciles only via status",async()=>{const e=Object.assign(new Error("synthetic timeout"),{code:"TIMEOUT_AFTER_EFFECT"});const x=await run([e,{status:200,deliveryId:"d"}],"delivered",2);assert.deepEqual(x.calls.map(c=>c.operation),["send","status"]);});
test("unknown side effect never blindly resent",async()=>{const e=Object.assign(new Error("synthetic timeout"),{code:"TIMEOUT_AFTER_EFFECT"});const x=await run([e,{status:404}],"uncertain",2);assert.deepEqual(x.calls.map(c=>c.operation),["send","status"]);});
test("exhausted quota only 3 calls, no extra wait",async()=>{const x=await run(Array(3).fill({status:429,retryAfterMs:15}),"failed",3);assert.deepEqual(x.waits,[15,15]);});
test("hung transport bounded and uncertain",{timeout:2500},async()=>{let attempts=0;const r=await send(input,{clock:()=>0,sleep:async()=>{},transport:()=>{attempts++;return new Promise(()=>{});}});assert.equal(r.state,"uncertain");assert.equal(attempts,1);assert.equal(r.attempts,1);});
test("invalid key never calls transport",async()=>{const m=mock([]),r=await send({...input,idempotencyKey:""},m.ctx);assert.equal(r.state,"failed");assert.equal(r.attempts,0);assert.equal(m.calls.length,0);});
`;
export async function evaluateRaviArtifact(fixture,candidate,{image}={}) {
  if(fixture?.role!=="ravi-integration")throw Error("trusted Ravi fixture required");
  const artifact=intakeFrontierArtifact(fixture,candidate);
  const behavior=await evaluateReviewReproduction(artifact.files.find(f=>f.path==="adapter.mjs").content,LOCKED,{image});
  return {schema:1,kind:"synthetic-mock-integration-evaluation",fixtureHash:artifact.fixtureHash,artifactHash:artifact.artifactHash,
    status:behavior.status==="behavior-pass"&&behavior.counts.tests===13&&behavior.counts.pass===13?"integration-screen-pass":"integration-screen-fail",
    behavior,qualified:false,liveProviderCalled:false};
}
