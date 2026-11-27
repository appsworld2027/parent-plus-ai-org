// Verify exact observed native candidate + separate evaluator receipts before considering eligibility.
// Does not open the product gate; the owner billing/data receipt and pre-build lock remain mandatory.
import {createHash} from 'node:crypto';
import {DIRECT_MODELS} from './native-adapter.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const digest=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
export function verifyNativeQualification({candidateRaw,gradeRaw,model,adapterSha256,helperSha256}){
 if(!DIRECT_MODELS.includes(model)||!digest(adapterSha256)||!digest(helperSha256)||typeof candidateRaw!=='string'||typeof gradeRaw!=='string')throw Error('Missing exact qualification proof');
 const a=JSON.parse(candidateRaw),g=JSON.parse(gradeRaw);
 if(a.schema!=='course-native-adapter-qualification-candidate/v1'||g.schema!=='canonical-native-independent-grade/v1'||a.mode!=='actual'||g.mode!=='actual'||a.providerIdentityVerified!==true||g.actualProviderIdentity!==true)throw Error('Deterministic smoke cannot qualify actual provider');
 for(const x of [a,g]){
  if(x.model!==model||x.adapterSha256!==adapterSha256||x.helperSha256!==helperSha256||x.syntheticOnly!==true||x.roleAdmission!==false||x.adapterQualification!==false)throw Error('Exact runtime bytes or mode/provenance mismatch');
 }
 if(!digest(a.candidateSha256)||!digest(a.baselineSha256)||a.candidateSha256===a.baselineSha256||g.artifactSha256!==a.candidateSha256||g.passed!==true||g.casesPassed!==12||g.casesTotal!==12||g.negativeControlCount!==5||!Array.isArray(a.negativeControls)||new Set(a.negativeControls).size!==5)throw Error('Candidate or independent grade incomplete');
 const s=a.session;
 if(s?.schema!=='course-native-adapter-session/v1'||s.model!==model||s.readCount!==1||s.writeCount!==1||s.toolEvents?.length!==2||s.toolEvents[0]?.tool!=='Read'||s.toolEvents[0]?.ok!==true||s.toolEvents[0]?.artifactSha256!==a.baselineSha256||s.toolEvents[1]?.tool!=='Replace'||s.toolEvents[1]?.ok!==true||s.toolEvents[1]?.artifactSha256!==a.candidateSha256||s.events?.length<3||!Array.isArray(s.events)||s.events.some(e=>e.model!==model||!Number.isSafeInteger(e.usage?.total_tokens)||e.usage.total_tokens<1)||s.events.at(-1)?.finish!=='stop'||s.events.reduce((n,e)=>n+e.usage.total_tokens,0)!==s.totalTokens||s.totalTokens>16000)throw Error('Exact observed model/tool/token provenance incomplete');
 return {model,adapterSha256,helperSha256,candidateReceiptSha256:sha(candidateRaw),gradeReceiptSha256:sha(gradeRaw),artifactSha256:a.candidateSha256,independentGradePassed:true,actualProviderIdentity:true,totalTokens:s.totalTokens,productEligible:false,roleAdmission:false};
}
