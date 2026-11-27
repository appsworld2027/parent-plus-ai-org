// Replay only the exact prior actual provider response; no new inference and no forged model receipt.
import {AUTHOR,contractHash,testHash,head,requireHead,hash,read,save,validPlan} from './shared.mjs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export const PLAN_ORIGIN=Object.freeze({runId:46062252932,artifactId:15228523702,
 sourceSha:'30bbe64527d01ac5af27e46d6f371a34f2275188',rawHash:'b281c45e68d4a5a245b91397691ee813840eb29560723fe41680bbe28a22e6de',
 callHash:'a1cc20d08f8c77d5c46a2d76ba6509c7ecb7784277b2ee1abc30cbf2f795a06e',
 responseHash:'9afdbadfa398b342add49ff56f9bf5c4ca1a9130537ec23ef016d324e67c35b2'});
export function decodeOrigin(callRaw,raw){
 if(hash(callRaw)!==PLAN_ORIGIN.callHash||hash(raw)!==PLAN_ORIGIN.rawHash)throw Error('prior artifact bytes changed');
 const r=JSON.parse(callRaw);
 if(r.phase!=='plan'||r.model!==AUTHOR||r.reportedModel!==AUTHOR||r.sourceSha!==PLAN_ORIGIN.sourceSha||r.contractHash!==contractHash||r.testHash!==testHash||r.responseHash!==PLAN_ORIGIN.responseHash||r.httpStatus!==200||r.finishReason!=='stop'||r.status!=='blocked'||r.failure!=='invalid-plan-schema'||r.paidFallback!==false)throw Error('prior actual model receipt mismatch');
 const t=raw.trim(),m=t.match(/^\x60\x60\x60(?:json)?\s*\n([\s\S]*?)\n\x60\x60\x60$/);
 const v=JSON.parse(m?m[1]:t);
 if(!validPlan(v))throw Error('prior plan schema invalid under corrected bounded intake');
 return {value:JSON.stringify(v,null,2)+'\n',originalUsage:r.usage};
}
export async function verifyReplay(dir){
 requireHead();
 const callRaw=await read(dir,'origin-call.json'),raw=await read(dir,'origin-raw.txt'),p=await read(dir,'plan.json'),r=JSON.parse(await read(dir,'replay.json'));
 const origin=decodeOrigin(callRaw,raw);
 if(p!==origin.value||r.status!=='accepted-replay'||r.sourceSha!==head||r.contractHash!==contractHash||r.testHash!==testHash||r.originRunId!==PLAN_ORIGIN.runId||r.originArtifactId!==PLAN_ORIGIN.artifactId||r.originalSourceSha!==PLAN_ORIGIN.sourceSha||r.originalCallHash!==PLAN_ORIGIN.callHash||r.originalRawHash!==PLAN_ORIGIN.rawHash||r.resultHash!==hash(p)||r.newInferenceCalls!==0)throw Error('invalid replay handoff');
 return p;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [out,prior]=process.argv.slice(2);requireHead();
 if(process.env.NVIDIA_NIM_API_KEY||process.env.GROQ_API_KEY)throw Error('replay must be key-free');
 const callRaw=await read(prior,'call.json'),raw=await read(prior,'raw.txt');
 const {value,originalUsage}=decodeOrigin(callRaw,raw);
 const receipt={schema:1,status:'accepted-replay',sourceSha:head,contractHash,testHash,originRunId:PLAN_ORIGIN.runId,originArtifactId:PLAN_ORIGIN.artifactId,originalSourceSha:PLAN_ORIGIN.sourceSha,originalCallHash:PLAN_ORIGIN.callHash,originalRawHash:PLAN_ORIGIN.rawHash,reportedModel:AUTHOR,originalUsage,resultHash:hash(value),newInferenceCalls:0,qualification:false};
 await save(out,'origin-call.json',callRaw);await save(out,'origin-raw.txt',raw);await save(out,'plan.json',value);await save(out,'replay.json',receipt);
 await verifyReplay(out);console.log(JSON.stringify(receipt));
}