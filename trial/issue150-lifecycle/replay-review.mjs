// Restore exact independent APPROVE, retaining original actual receipt and raw bytes.
import {REVIEWER,contractHash,testHash,head,requireHead,hash,read,save,validReview,validGrade} from './shared.mjs';
import {verifyBuild} from './replay-build.mjs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export const REVIEW_ORIGIN=Object.freeze({runId:46063343920,artifactId:15230395380,sourceSha:'ec228fedc66e3a46e80821701b4c8603da081f4b',
 reviewHash:'aa2fc1dd562d1fd8375c311ef8b4916b1778ce1b48c9275cbf32f94375969030',callHash:'508f8b089db4f3ba3a060c9c7493f507d1096069ecf87708f5c4789b128c5aa7',
 rawHash:'0726c488e0e0f8411b3446f095c55ada0994fad6e29e24b4b14a7b96fbe785e9',responseHash:'3f5e65a9e7c6adfa52fca05aca8b02a0a37eadd8c2cc9466c8895cc5569dc5ab'});
function validateOrigin(call,review,raw,code){
 if(hash(call)!==REVIEW_ORIGIN.callHash||hash(review)!==REVIEW_ORIGIN.reviewHash||hash(raw)!==REVIEW_ORIGIN.rawHash||!validReview(JSON.parse(review),code)||JSON.parse(review).verdict!=='APPROVE')throw Error('earlier review bytes or verdict mismatch');
 const r=JSON.parse(call);
 if(r.phase!=='review'||r.model!==REVIEWER||r.reportedModel!==REVIEWER||r.sourceSha!==REVIEW_ORIGIN.sourceSha||r.contractHash!==contractHash||r.testHash!==testHash||r.inputHash!==hash(code)||r.responseHash!==REVIEW_ORIGIN.responseHash||r.resultHash!==REVIEW_ORIGIN.reviewHash||r.httpStatus!==200||r.finishReason!=='stop'||r.status!=='accepted'||r.verdict!=='APPROVE'||r.paidFallback!==false)throw Error('earlier actual review receipt mismatch');
 return r;
}
export async function verifyReview(dir,code){
 requireHead();const call=await read(dir,'origin-call.json'),review=await read(dir,'review.json'),raw=await read(dir,'origin-raw.txt'),r=JSON.parse(await read(dir,'replay.json'));
 validateOrigin(call,review,raw,code);
 if(r.status!=='accepted-replay'||r.verdict!=='APPROVE'||r.sourceSha!==head||r.contractHash!==contractHash||r.testHash!==testHash||r.originRunId!==REVIEW_ORIGIN.runId||r.originArtifactId!==REVIEW_ORIGIN.artifactId||r.originalSourceSha!==REVIEW_ORIGIN.sourceSha||r.originalCallHash!==REVIEW_ORIGIN.callHash||r.resultHash!==REVIEW_ORIGIN.reviewHash||r.candidateHash!==hash(code)||r.newInferenceCalls!==0)throw Error('invalid review replay');
 return review;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [out,prior,build,grade]=process.argv.slice(2);requireHead();
 if(process.env.NVIDIA_NIM_API_KEY||process.env.GROQ_API_KEY)throw Error('key-free replay required');
 const code=await verifyBuild(build),g=JSON.parse(await read(grade,'grade.json'));if(!validGrade(g,code))throw Error('invalid current exact grade');
 const call=await read(prior,'call.json'),review=await read(prior,'review.json'),raw=await read(prior,'raw.txt'),r=validateOrigin(call,review,raw,code);
 const receipt={schema:1,status:'accepted-replay',sourceSha:head,contractHash,testHash,originRunId:REVIEW_ORIGIN.runId,originArtifactId:REVIEW_ORIGIN.artifactId,originalSourceSha:REVIEW_ORIGIN.sourceSha,originalCallHash:REVIEW_ORIGIN.callHash,originalRawHash:REVIEW_ORIGIN.rawHash,reportedModel:REVIEWER,originalUsage:r.usage,resultHash:REVIEW_ORIGIN.reviewHash,candidateHash:hash(code),newInferenceCalls:0,verdict:'APPROVE',qualification:false};
 await save(out,'origin-call.json',call);await save(out,'origin-raw.txt',raw);await save(out,'review.json',review);await save(out,'replay.json',receipt);
 await verifyReview(out,code);console.log(JSON.stringify(receipt));
}