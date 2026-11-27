// Replay exact earlier Dev artifact; no new model calls and no rewritten original receipt.
import {AUTHOR,contractHash,testHash,head,requireHead,hash,read,save,validCandidate} from './shared.mjs';
import {verifyReplay} from './replay-plan.mjs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export const BUILD_ORIGIN=Object.freeze({runId:46062821591,artifactId:15228459557,
 sourceSha:'e9175dc016738047c49f20bdf325e74c095af9ea',candidateHash:'2ea1c899acbb18a2e714dc679342047157bfed8c159ce748a6fbdcadfeb4c3a2',
 callHash:'7792a485c22fedaf5d3937a336508cda1bb7bcf037f4259cfd987c29ad3585d6',
 rawHash:'29997e11c7746a10a724099143764a87cb9720fb62b70f134dfd9b60f735ac0c',
 responseHash:'de33b481173d2933a18c59ab3dc3738aea8a26dc93c6a1875d5a6aa21fd235d6',
 planHash:'9ed8088d9ebaedc59e08d6fc425f2ea67550b58fe306aa0b2523e58bde211f4d'});
function validateOrigin(call,code,raw){
 if(hash(call)!==BUILD_ORIGIN.callHash||hash(code)!==BUILD_ORIGIN.candidateHash||hash(raw)!==BUILD_ORIGIN.rawHash||!validCandidate(code))throw Error('earlier build bytes mismatch');
 const r=JSON.parse(call);
 if(r.phase!=='build'||r.model!==AUTHOR||r.reportedModel!==AUTHOR||r.sourceSha!==BUILD_ORIGIN.sourceSha||r.contractHash!==contractHash||r.testHash!==testHash||r.inputHash!==BUILD_ORIGIN.planHash||r.responseHash!==BUILD_ORIGIN.responseHash||r.resultHash!==BUILD_ORIGIN.candidateHash||r.httpStatus!==200||r.finishReason!=='stop'||r.status!=='accepted'||r.paidFallback!==false)throw Error('earlier actual build receipt mismatch');
 return r;
}
export async function verifyBuild(dir){
 requireHead();
 const call=await read(dir,'origin-call.json'),code=await read(dir,'board.mjs'),raw=await read(dir,'origin-raw.txt'),r=JSON.parse(await read(dir,'replay.json'));
 validateOrigin(call,code,raw);
 if(r.status!=='accepted-replay'||r.sourceSha!==head||r.contractHash!==contractHash||r.testHash!==testHash||r.originRunId!==BUILD_ORIGIN.runId||r.originArtifactId!==BUILD_ORIGIN.artifactId||r.originalSourceSha!==BUILD_ORIGIN.sourceSha||r.originalCallHash!==BUILD_ORIGIN.callHash||r.resultHash!==BUILD_ORIGIN.candidateHash||r.planHash!==BUILD_ORIGIN.planHash||r.newInferenceCalls!==0)throw Error('invalid build replay');
 return code;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [out,prior,plan]=process.argv.slice(2);requireHead();
 if(process.env.NVIDIA_NIM_API_KEY||process.env.GROQ_API_KEY)throw Error('replay must be key-free');
 if(hash(await verifyReplay(plan))!==BUILD_ORIGIN.planHash)throw Error('plan replay mismatch');
 const call=await read(prior,'call.json'),code=await read(prior,'board.mjs'),raw=await read(prior,'raw.txt');const r=validateOrigin(call,code,raw);
 const receipt={schema:1,status:'accepted-replay',sourceSha:head,contractHash,testHash,originRunId:BUILD_ORIGIN.runId,originArtifactId:BUILD_ORIGIN.artifactId,originalSourceSha:BUILD_ORIGIN.sourceSha,originalCallHash:BUILD_ORIGIN.callHash,originalRawHash:BUILD_ORIGIN.rawHash,reportedModel:AUTHOR,originalUsage:r.usage,resultHash:BUILD_ORIGIN.candidateHash,planHash:BUILD_ORIGIN.planHash,newInferenceCalls:0,qualification:false};
 await save(out,'origin-call.json',call);await save(out,'origin-raw.txt',raw);await save(out,'board.mjs',code);await save(out,'replay.json',receipt);await verifyBuild(out);console.log(JSON.stringify(receipt));
}