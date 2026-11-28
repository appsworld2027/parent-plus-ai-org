// Isolated, owner-dispatched baseline review. Never grants admission or product execution.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { prepareStageMethod } from "../../scripts/stage-method.mjs";
import { preparePlanningReview, validatePlanningReview, REVIEW_SCHEMA } from "../../scripts/planning-artifact-review.mjs";
const base = new URL("../evidence/course/roles-20261127/",import.meta.url);
const read = path => readFileSync(new URL(path,base),"utf8");
const sha=value=>createHash("sha256").update(value).digest("hex");
const gitBlob=bytes=>createHash("sha1").update(`blob ${Buffer.byteLength(bytes)}\0`).update(bytes).digest("hex");
const ANCHORS={
  "iris-design": {
    "hash": "71106e8f6f1128eb63518c90e2e65744c3e4e641a058ee6b759197d55e44f472",
    "model": "qwen/qwen3.8-27b",
    "run": 46041764862,
    "artifactId": 15220956377
  },
  "kiran-pjm-a": {
    "hash": "8e8ae5c6ae4b7ef4c2ca060a29d4d80bbc65e7cd966f3a5a3b27cbaea56664b4",
    "model": "qwen/qwen3.8-27b",
    "run": 46041764862,
    "artifactId": 15220956377
  },
  "leela-pjm-b": {
    "hash": "0610fabe19f1b8aecb7efa840b8b0b73313644527da10edefeb417ee96a08950",
    "model": "qwen/qwen3.8-27b",
    "run": 46041764862,
    "artifactId": 15220956377
  },
  "maya-ai-pm": {
    "hash": "d0abdb2fd60142cbe00a15b4f0c40885663a832b179c5a5edb7d99b62f1022a5",
    "model": "openai/gpt-oss-120b",
    "run": 46042584072,
    "artifactId": 15219914338
  },
  "arjun-cpto": {
    "hash": "41e2add7af3fadd8e1b1f5e1b3f24f27319540d8afa42cf7c4fb14de3d74fb93",
    "model": "openai/gpt-oss-120b",
    "run": 46042584072,
    "artifactId": 15219914338
  },
  "tara-database": {
    "hash": "e4b6981f61e13ba381ba307101860c10b34e578eae30f3fca5d1f1867bc4df8b",
    "model": "openai/gpt-oss-120b",
    "run": 46042584072,
    "artifactId": 15219914338
  },
  "ravi-integration": {
    "hash": "fcb1b2b987b25afe8d289489203473ff42fd637ee6b4b970747e1344a21586db",
    "model": "qwen/qwen3.8-27b",
    "run": 46042584072,
    "artifactId": 15219893866
  }
};
const REQUIRED_LINES={"iris-design":[98],"kiran-pjm-a":[51],"leela-pjm-b":[10,26],"maya-ai-pm":[15,25],"arjun-cpto":[2,12],"tara-database":[2,7,18],"ravi-integration":[15,38]};
const RECEIPT_BLOB="8a9f0a609e0a594764d52c8a2782dd813c377684";
const CONTRACT_SHA="6695ab62149003b833c1afa04a2f6e674db3494efe7048864357095de07176aa";
const source="710082b2d8cf3c1007086df31f87b34ae8e02573";
const role=process.env.REVIEW_CONFIRM?.replace(/^COURSE DOC REVIEW /,"");
const mode=process.argv[2];
if(!Object.hasOwn(ANCHORS,role)||process.env.REVIEW_CONFIRM!==`COURSE DOC REVIEW ${role}`)throw Error("Unrecognized owner review request");
const receiptText=read("receipts.json");
if(gitBlob(receiptText)!==RECEIPT_BLOB)throw Error("Original archived author receipts changed");
const authorReceipt=JSON.parse(receiptText)[role],anchor=ANCHORS[role],artifact=read(role+".md");
if(authorReceipt.source!==source||authorReceipt.artifactSha256!==anchor.hash||authorReceipt.model!==anchor.model||
   authorReceipt.run!==anchor.run||authorReceipt.artifactId!==anchor.artifactId||sha(artifact)!==anchor.hash)throw Error("Original author identity or bytes changed");
const contract=readFileSync(new URL("coach-course-management.CONTRACT.md",import.meta.url),"utf8");
if(sha(contract)!==CONTRACT_SHA)throw Error("Locked contract changed");
const reviewerCard=readFileSync(new URL("../../org/agents/rex-reviewer.md",import.meta.url),"utf8");
const method=prepareStageMethod({stage:"ai:review",role:"rex-reviewer"});
const historicalFacts="Historical review context: at the time of these seven documents the prebuild acceptance lock was not approved. Existing five Coach tabs remain. The root App.tsx is the permitted navigation wiring file; Courses is a Today button. The pilot permits local in-memory only; no live/new SQL migration. The actual unit test runner is Vitest. Delivery plans must allow independently ready nonconflicting work in parallel. Never infer facts from source not supplied. This is historic artifact critique, not current lock sign-off.";
const packet=preparePlanningReview({artifact,author:role,authorReceipt,contract:contract+"\n\n"+historicalFacts,reviewerMethod:method.prompt,reviewerCard});
const {prompt,...safe}=packet;
const out=join(process.env.RUNNER_TEMP||"/tmp","course-planning-review");
mkdirSync(out,{recursive:true,mode:0o700});
const preflight={schema:"course-planning-review-preflight/v1",state:"prepared-no-inference",...safe,source,lockedContractSha256:CONTRACT_SHA,authorRun:anchor.run,authorArtifactId:anchor.artifactId,method:method.receipt,roleAdmission:false};
writeFileSync(join(out,"preflight.json"),JSON.stringify(preflight,null,2)+"\n",{mode:0o600});
if(mode==="preflight") {
  if(process.env.GROQ_API_KEY)throw Error("Preflight must not receive model key");
  console.log(JSON.stringify(preflight)); 
} else if(mode==="review") {
  if(!process.env.GROQ_API_KEY)throw Error("Approved free model key unavailable; no fallback");
  const gpt=packet.model==="openai/gpt-oss-120b";
  const body={model:packet.model,temperature:0,max_completion_tokens:2400,messages:[
    {role:"system",content:"Only the archived sanitized evaluation packet is supplied. No external tools or source access. Return JSON only. No claim of executed checks, no paid fallback."},
    {role:"user",content:prompt}],response_format:{type:"json_schema",json_schema:{name:"planning_artifact_review",strict:true,schema:REVIEW_SCHEMA}}};
  body.reasoning_effort="medium";
  if(!gpt)body.reasoning_format="hidden";
  const start=Date.now(),response=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{Authorization:"Bearer "+process.env.GROQ_API_KEY,"Content-Type":"application/json"},body:JSON.stringify(body),redirect:"error",signal:AbortSignal.timeout(110000)});
  const http={http:response.status,retryAfter:response.headers.get("retry-after"),requestedModel:packet.model,elapsedMs:Date.now()-start};
  writeFileSync(join(out,"transport.json"),JSON.stringify(http,null,2)+"\n");
  if(!response.ok){console.log(JSON.stringify(http));throw Error("Free provider request failed or quota paused; no retry/fallback");}
  const result=await response.json();
  const raw=result.choices?.[0]?.message?.content;
  const transport={...http,actualModel:result.model,finish:result.choices?.[0]?.finish_reason,usage:result.usage??null,rawHash:typeof raw==="string"?sha(raw):null};
  writeFileSync(join(out,"transport.json"),JSON.stringify(transport,null,2)+"\n");
  if(typeof raw==="string"&&Buffer.byteLength(raw)<20000)writeFileSync(join(out,"raw-review.json"),raw+"\n");
  if(result.model!==packet.model||transport.finish!=="stop"||typeof raw!=="string"||Buffer.byteLength(raw)>20000)throw Error("Incomplete or mismatched independent reviewer response");
  const verdict=JSON.parse(raw),validated=validatePlanningReview(packet,artifact,result.model,verdict);
  // A negative control must be rejected with substantive grounded evidence at a known defective line.
  // This is not semantic proof of every score or qualification; full human/independent calibration remains mandatory.
  const knownDefectDetected=verdict.verdict==="CHANGES"&&verdict.findings.some(f=>["critical","major"].includes(f.severity)&&REQUIRED_LINES[role].includes(f.line));
  const receipt={schema:"course-planning-review-result/v1",...validated,review:verdict,source,lockedContractSha256:CONTRACT_SHA,
      authorRun:anchor.run,authorArtifactId:anchor.artifactId,reviewerRun:process.env.GITHUB_RUN_ID,reviewerAttempt:process.env.GITHUB_RUN_ATTEMPT,transport,
      method:method.receipt,negativeControlDetected:knownDefectDetected,roleAdmission:false,independentReviewPassed:false,productWriteAuthorized:false};
  writeFileSync(join(out,"receipt.json"),JSON.stringify(receipt,null,2)+"\n");
  console.log(JSON.stringify({role,score:receipt.score,verdict:receipt.verdict,negativeControlDetected:knownDefectDetected,roleAdmission:false}));
  if(!knownDefectDetected)throw Error("Known defective artifact was not rejected with grounded critical evidence");
} else throw Error("Expected preflight or review");
