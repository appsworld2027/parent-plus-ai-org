// Evaluate actual reviewer artifacts against separately executed truth, not
// by trusting model's claimed verdict, purported test runs or reviewer score.
import { canonicalHash } from "./frontier-admission.mjs";
import { intakeFrontierArtifact } from "./frontier-casebook.mjs";
import { evaluateBoardCode,evaluateReviewReproduction } from "./frontier-board-evaluator.mjs";
const object=x=>x!==null&&typeof x==="object"&&!Array.isArray(x);
const text=x=>typeof x==="string"&&x.trim().length>0&&x.length<=1500;
export function interpretRexReview(review,{candidateLineCount,referenceStatus,reproductionStatus}={}) {
  const expected=referenceStatus==="behavior-pass"?"APPROVE":referenceStatus==="behavior-fail"?"CHANGES":null;
  const base={schema:1,expectedVerdict:expected,qualified:false};
  if(!expected||!["behavior-pass","behavior-fail"].includes(reproductionStatus))return {...base,status:"incomplete",reason:"independent execution unavailable"};
  if(!object(review)||!["APPROVE","CHANGES"].includes(review.verdict)||!text(review.summary)||
    !Array.isArray(review.findings)||review.findings.length>8||
    !review.findings.every(f=>object(f)&&f.path==="board.mjs"&&Number.isSafeInteger(f.line)&&f.line>=0&&f.line<=candidateLineCount&&
      ["critical","high","medium","low"].includes(f.severity)&&text(f.problem)&&text(f.reproduction)))return {...base,status:"review-artifact-invalid"};
  const major=review.findings.filter(f=>["critical","high"].includes(f.severity));
  const correctVerdict=review.verdict===expected;
  const findingGate=expected==="APPROVE"?major.length===0:major.length>0;
  // Independent authored reproduction should pass clean and reveal the actual defect.
  const reproductionGate=reproductionStatus===referenceStatus;
  return {...base,status:correctVerdict&&findingGate&&reproductionGate?"review-screen-pass":"review-screen-fail",
    observedVerdict:review.verdict,correctVerdict,findingGate,reproductionGate,majorFindings:major.length};
}
export async function evaluateRexArtifact(fixture,candidate,{image}={}) {
  if(fixture?.role!=="rex-reviewer"||typeof fixture.starterFiles?.["board.mjs"]!=="string")throw Error("trusted Rex fixture required");
  const artifact=intakeFrontierArtifact(fixture,candidate);
  const code=fixture.starterFiles["board.mjs"];
  const reference=await evaluateBoardCode(code,{image});
  const reproduction=await evaluateReviewReproduction(code,artifact.files.find(f=>f.path==="reproduction.test.mjs").content,{image});
  let review=null;
  try{review=JSON.parse(artifact.files.find(f=>f.path==="review.json").content);}catch{}
  return {schema:1,kind:"synthetic-review-screen",fixtureHash:artifact.fixtureHash,artifactHash:artifact.artifactHash,
    candidateHash:canonicalHash(code),reference,reproduction,
    result:interpretRexReview(review,{candidateLineCount:code.split("\n").length,referenceStatus:reference.status,reproductionStatus:reproduction.status}),
    qualified:false};
}
