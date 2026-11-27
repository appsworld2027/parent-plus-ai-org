// Controller-owned GitHub Actions receipt verification. Never load trust policy from a candidate.
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { canonicalHash } from "./frontier-admission.mjs";

const exec = promisify(execFile);
const KINDS = ["frozen-plan","agent-execution","independent-evaluation","integrated-evaluation"];
const REPOSITORY = "appsworld2027/parent-plus-ai-org";
const ZIP_MAX = 512 * 1024, JSON_MAX = 256 * 1024, MAX_RECEIPTS = 68;
const sha40 = x => typeof x === "string" && /^[a-f0-9]{40}$/.test(x);
const sha64 = x => typeof x === "string" && /^[a-f0-9]{64}$/.test(x);
const positive = x => Number.isSafeInteger(x) && x > 0;
const exactKeys = (x, keys) => x && typeof x === "object" && !Array.isArray(x) &&
  Object.keys(x).length === keys.length && keys.every(k => Object.hasOwn(x,k));
const assert = (ok, reason) => { if (!ok) throw Error(reason); };
function parseId(value) {
  const m = typeof value === "string" && /^gh:([1-9]\d{0,15}):([1-9]\d{0,5}):([1-9]\d{0,15})$/.exec(value);
  assert(m,"invalid-receipt-id");
  const [runId, attempt, artifactId] = m.slice(1).map(Number);
  assert([runId,attempt,artifactId].every(positive),"invalid-receipt-id");
  return {runId,attempt,artifactId};
}
function validatePolicy(policy) {
  assert(policy?.repository === REPOSITORY && positive(policy.repositoryId) &&
    positive(policy.actorId) && policy.actorLogin === "appsworld2027" &&
    exactKeys(policy.workflows,KINDS),"unconfigured-trust-policy");
  const workflows = Object.values(policy.workflows);
  for (const w of workflows) assert(positive(w?.workflowId) && sha40(w.workflowSha) &&
    typeof w.path === "string" && /^\.github\/workflows\/[a-zA-Z0-9_.-]+\.ya?ml$/.test(w.path),"invalid-workflow-pin");
  assert(new Set(workflows.map(w=>w.workflowId)).size===KINDS.length &&
    new Set(workflows.map(w=>w.path)).size===KINDS.length,"producer-evaluator-not-isolated");
  return structuredClone(policy);
}
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
async function extractReceipt(bytes) {
  const dir = await mkdtemp(join(tmpdir(),"frontier-receipt-"));
  const path = join(dir,"artifact.zip");
  try {
    await writeFile(path,bytes,{mode:0o600});
    const opts={timeout:5000,maxBuffer:JSON_MAX,encoding:"buffer"};
    const listing=await exec("unzip",["-Z1",path],opts);
    assert(listing.stdout.toString("utf8")==="receipt.json\n","archive-content-not-allowed");
    const contents=await exec("unzip",["-p",path,"receipt.json"],opts);
    assert(contents.stdout.length<=JSON_MAX,"receipt-too-large");
    return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(contents.stdout));
  } finally { await rm(dir,{recursive:true,force:true}); }
}
function trustedRun(run, ids, pin, policy) {
  assert(run?.id===ids.runId && run.run_attempt===ids.attempt &&
    run.status==="completed" && run.conclusion==="success" &&
    run.event==="workflow_dispatch" && run.workflow_id===pin.workflowId &&
    run.path===pin.path && run.head_sha===pin.workflowSha &&
    run.repository?.id===policy.repositoryId && run.repository?.full_name===policy.repository &&
    run.head_repository?.id===policy.repositoryId && run.head_repository?.full_name===policy.repository &&
    run.actor?.id===policy.actorId && run.actor?.login===policy.actorLogin &&
    run.triggering_actor?.id===policy.actorId && run.triggering_actor?.login===policy.actorLogin,
    "untrusted-run");
}
function trustedArtifact(a, ids, kind, pin, policy) {
  const prefix="frontier-"+kind+"-"+ids.attempt+"-";
  assert(a?.id===ids.artifactId && a.expired===false &&
    typeof a.name==="string" && a.name.startsWith(prefix) &&
    /^[a-zA-Z0-9_-]{1,60}$/.test(a.name.slice(prefix.length)) &&
    positive(a.size_in_bytes) && a.size_in_bytes<=ZIP_MAX &&
    typeof a.digest==="string" && /^sha256:[a-f0-9]{64}$/.test(a.digest) &&
    a.workflow_run?.id===ids.runId && a.workflow_run?.head_sha===pin.workflowSha &&
    a.workflow_run?.repository_id===policy.repositoryId &&
    a.workflow_run?.head_repository_id===policy.repositoryId,"untrusted-artifact");
}
/**
 * Transport is a controller capability, not an agent/candidate input. It returns
 * authoritative GitHub metadata and raw archive bytes. This module never trusts
 * a verdict, receipt ID, source field or digest supplied by the candidate alone.
 * Pin four distinct audited producer workflows before enabling live admission.
 */
export async function buildVerifiedReceiptIndex(requests,{policy,transport}={}) {
  const pins=validatePolicy(policy);
  assert(Array.isArray(requests)&&requests.length<=MAX_RECEIPTS,"receipt-count-exceeded");
  assert(["getRun","getArtifact","getArtifactBytes"].every(k=>typeof transport?.[k]==="function"),"missing-trusted-transport");
  const verified=new Map(), rejected=[], seen=new Set(), runCache=new Map();
  for (const request of requests) {
    let label="invalid";
    try {
      assert(exactKeys(request,["kind","receiptId","subjectHash"])&&KINDS.includes(request.kind)&&sha64(request.subjectHash),"invalid-request");
      const ids=parseId(request.receiptId), pin=pins.workflows[request.kind];
      label=request.receiptId;
      assert(!seen.has(label),"duplicate-receipt-id");
      seen.add(label);
      let run=runCache.get(ids.runId);
      if(!run) {run=await transport.getRun(ids.runId);runCache.set(ids.runId,run);}
      trustedRun(run,ids,pin,pins);
      const a=await transport.getArtifact(ids.artifactId);
      trustedArtifact(a,ids,request.kind,pin,pins);
      const bytes=await transport.getArtifactBytes(ids.artifactId);
      assert(Buffer.isBuffer(bytes)&&bytes.length===a.size_in_bytes&&bytes.length<=ZIP_MAX&&
        "sha256:"+hash(bytes)===a.digest,"archive-digest-mismatch");
      const record=await extractReceipt(bytes);
      assert(exactKeys(record,["schema","kind","source","subjectHash","payload"])&&
        record.schema===1&&record.kind===request.kind&&record.subjectHash===request.subjectHash&&
        canonicalHash(record.payload)===record.subjectHash,"receipt-payload-mismatch");
      const source={repository:pins.repository,runId:ids.runId,attempt:ids.attempt,workflowSha:pin.workflowSha};
      assert(canonicalHash(record.source)===canonicalHash(source),"receipt-source-mismatch");
      verified.set(label,{kind:request.kind,subjectHash:request.subjectHash});
    } catch {
      // No remote response bodies or credentials in reports. An invalid duplicate
      // removes any prior acceptance of that identity.
      verified.delete(label);
      rejected.push({receiptId:label,reason:"unverified-receipt"});
    }
  }
  return Object.freeze({
    verifiedCount:verified.size,
    rejected:Object.freeze(rejected.map(Object.freeze)),
    verifyReceipt:({kind,receiptId,subjectHash}={})=>{
      const found=verified.get(receiptId);
      return !!found&&found.kind===kind&&found.subjectHash===subjectHash;
    }
  });
}
// Explicit read-only GitHub CLI transport; use only in the trusted controller.
// No arbitrary URL, shell, candidate credentials, retries or provider calls.
export function createGitHubReceiptTransport() {
  const get=async (endpoint,maxBuffer,encoding)=>{
    const {stdout}=await exec("gh",["api","--hostname","github.com","--method","GET",
      "repos/"+REPOSITORY+"/actions/"+endpoint],{timeout:20000,maxBuffer,encoding});
    return stdout;
  };
  const meta=async (endpoint,id)=> {
    assert(positive(id),"invalid-github-id");
    return JSON.parse(await get(endpoint+"/"+id,JSON_MAX,"utf8"));
  };
  return Object.freeze({
    getRun:id=>meta("runs",id),
    getArtifact:id=>meta("artifacts",id),
    getArtifactBytes:async id=>{
      assert(positive(id),"invalid-github-id");
      return get("artifacts/"+id+"/zip",ZIP_MAX,"buffer");
    }
  });
}
