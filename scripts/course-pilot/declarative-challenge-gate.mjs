// Independent challenge receipt gate. Evidence indices are validated against actual operations;
// neither this parser nor coverage criteria may substitute for independent model reasoning.
import {createHash} from 'node:crypto';
import {COURSE_IDS,coverageIssues} from './declarative-coverage.mjs';
const hash=a=>createHash('sha256').update(JSON.stringify(a)).digest('hex');
const allowed=['APPROVE','CHANGES'];
const keys=(v,k)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).sort().join()===k;
export function checkCourseChallenge(artifact,author,challenger,{calibration=false}={}){
 if(!artifact?.cases||!author||!challenger||!keys(challenger,'artifactSha256,contextSha256,model,receiptSha256,reviews,role,schema,seat,verdict'))throw Error('Missing exact independent challenge receipt');
 if(challenger.schema!=='course-challenge/v2'||challenger.role!=='quinn-qa'||challenger.seat!=='challenger'||!['qwen/qwen3.8-27b','openai/gpt-oss-120b'].includes(challenger.model)||challenger.model===author.model||challenger.contextSha256===author.contextSha256||challenger.receiptSha256===author.receiptSha256)throw Error('Independent distinct model/context/receipt required');
 const sha=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
 if(![challenger.contextSha256,challenger.receiptSha256,author.contextSha256,author.receiptSha256].every(sha)||challenger.artifactSha256!==hash(artifact)||author.artifactSha256!==challenger.artifactSha256)throw Error('Artifact or provenance mismatch');
 if(!allowed.includes(challenger.verdict)||!Array.isArray(challenger.reviews)||challenger.reviews.length!==COURSE_IDS.length||new Set(challenger.reviews.map(r=>r.id)).size!==COURSE_IDS.length)throw Error('Review every exact case');
 for(const r of challenger.reviews){
  if(!keys(r,'defects,evidence,id,verdict')||!COURSE_IDS.includes(r.id)||!allowed.includes(r.verdict)||!Array.isArray(r.evidence)||!Array.isArray(r.defects))throw Error('Invalid case review');
  const ops=artifact.cases[r.id];
  if(!Array.isArray(ops)||r.evidence.length<2||new Set(r.evidence.map(x=>x.index)).size!==r.evidence.length)throw Error('Each case needs two distinct grounded evidence operations');
  for(const e of r.evidence)if(!keys(e,'index,operation,rationale')||!Number.isInteger(e.index)||e.index<0||e.index>=ops.length||JSON.stringify(e.operation)!==JSON.stringify(ops[e.index])||typeof e.rationale!=='string'||e.rationale.trim().length<12||e.rationale.length>500)throw Error('Fabricated or malformed case evidence');
  if(r.defects.some(d=>typeof d!=='string'||d.trim().length<15||d.length>500)||r.defects.length>8||(r.verdict==='CHANGES')!==!!r.defects.length)throw Error('Verdict must agree with substantive case defects');
 }
 const changes=challenger.reviews.filter(x=>x.verdict==='CHANGES').map(x=>x.id);
 if((challenger.verdict==='CHANGES')!==!!changes.length)throw Error('Aggregate verdict contradicts case reviews');
 const staticIssues=coverageIssues(artifact);
 const missed=[...new Set(staticIssues.map(x=>x.id))].filter(id=>!changes.includes(id));
 if(missed.length)throw Error('False approval or missed known critical contract defects: '+missed.join(','));
 if(calibration&&!staticIssues.length)throw Error('Calibration requires a genuinely deficient artifact');
 return {artifactSha256:challenger.artifactSha256,verdict:challenger.verdict,calibration,knownIssues:staticIssues.length,changedCases:changes,eligibleForIndependentExecutableGrade:!calibration&&challenger.verdict==='APPROVE'&&staticIssues.length===0,lockApproved:false,roleAdmission:false};
}
