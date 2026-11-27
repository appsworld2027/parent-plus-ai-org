import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync,writeFileSync,readFileSync,rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildVerifiedReceiptIndex } from "../scripts/frontier-receipts.mjs";
import { canonicalHash } from "../scripts/frontier-admission.mjs";

const kinds=["frozen-plan","agent-execution","independent-evaluation","integrated-evaluation"];
const id="gh:123:1:456";
function pack(record, extra=false, raw=null) {
  const dir=mkdtempSync(join(tmpdir(),"receipt-fixture-"));
  try {
    writeFileSync(join(dir,"receipt.json"),raw??JSON.stringify(record));
    const files=["receipt.json"];
    if(extra){writeFileSync(join(dir,"extra.txt"),"unexpected");files.push("extra.txt");}
    execFileSync("zip",["-q","artifact.zip",...files],{cwd:dir});
    return readFileSync(join(dir,"artifact.zip"));
  } finally {rmSync(dir,{force:true,recursive:true});}
}
function fixture(kind="agent-execution") {
  const repo={id:7,full_name:"appsworld2027/parent-plus-ai-org"};
  const actor={id:8,login:"appsworld2027"};
  const policy={repository:repo.full_name,repositoryId:7,actorId:8,actorLogin:actor.login,
    workflows:Object.fromEntries(kinds.map((k,i)=>[k,{workflowId:11+i,path:".github/workflows/"+k+".yml",workflowSha:String(i+1).repeat(40)}]))};
  const pin=policy.workflows[kind];
  const payload={message:"artifact",role:"dev-coder"};
  const req={kind,receiptId:id,subjectHash:canonicalHash(payload)};
  const rec={schema:1,kind,subjectHash:req.subjectHash,payload,
    source:{repository:repo.full_name,runId:123,attempt:1,workflowSha:pin.workflowSha}};
  const run={id:123,run_attempt:1,status:"completed",conclusion:"success",event:"workflow_dispatch",
    workflow_id:pin.workflowId,path:pin.path,head_sha:pin.workflowSha,repository:{...repo},head_repository:{...repo},
    actor:{...actor},triggering_actor:{...actor}};
  const art={id:456,expired:false,name:"frontier-"+kind+"-1-role",workflow_run:{id:123,head_sha:pin.workflowSha,repository_id:7,head_repository_id:7}};
  let bytes;
  const f={policy,req,rec,run,art,pack(extra=false,raw=null){
    bytes=pack(rec,extra,raw);
    art.size_in_bytes=bytes.length;art.digest="sha256:"+createHash("sha256").update(bytes).digest("hex");
  },corrupt(){bytes[0]^=1;}, calls:0,
  transport:{getRun:async()=>{f.calls++;return run;},getArtifact:async()=>art,getArtifactBytes:async()=>bytes}};
  f.pack();return f;
}
async function index(f,requests=[f.req]) {
  return buildVerifiedReceiptIndex(requests,{policy:f.policy,transport:f.transport});
}
test("all four kinds require exact verified receipt identity and hash",async()=>{
  for(const kind of kinds){
    const f=fixture(kind), result=await index(f);
    assert.equal(result.verifiedCount,1);assert.equal(result.rejected.length,0);
    assert.equal(result.verifyReceipt(f.req),true);
    assert.equal(result.verifyReceipt({...f.req,subjectHash:"a".repeat(64)}),false);
    assert.equal(result.verifyReceipt({...f.req,kind:kinds.find(k=>k!==kind)}),false);
    assert.equal(result.verifyReceipt({...f.req,receiptId:"gh:123:1:999"}),false);
  }
});
const cases=[
  ["uncompleted run",f=>f.run.status="in_progress"],
  ["failed run",f=>f.run.conclusion="failure"],
  ["rerun attempt mismatch",f=>f.run.run_attempt=2],
  ["unapproved event",f=>f.run.event="pull_request"],
  ["workflow id mismatch",f=>f.run.workflow_id=999],
  ["workflow path mismatch",f=>f.run.path=".github/workflows/evil.yml"],
  ["workflow SHA mismatch",f=>f.run.head_sha="f".repeat(40)],
  ["forked head repo",f=>f.run.head_repository.id=900],
  ["wrong actor",f=>f.run.actor.id=900],
  ["wrong trigger actor",f=>f.run.triggering_actor.login="other"],
  ["expired artifact",f=>f.art.expired=true],
  ["artifact from another run",f=>f.art.workflow_run.id=999],
  ["artifact from another repository",f=>f.art.workflow_run.head_repository_id=999],
  ["wrong artifact kind",f=>f.art.name="frontier-independent-evaluation-1-role"],
  ["artifact attempt mismatch",f=>f.art.name="frontier-agent-execution-2-role"],
  ["missing digest",f=>delete f.art.digest],
  ["wrong byte length",f=>f.art.size_in_bytes++],
  ["corrupt bytes",f=>f.corrupt()],
  ["payload substitution",f=>{f.rec.payload.role="sam-release";f.pack();}],
  ["source mismatch",f=>{f.rec.source.runId=999;f.pack();}],
  ["extra archive file",f=>f.pack(true)],
  ["invalid JSON",f=>f.pack(false,"{invalid")],
  ["expanded archive exceeds limit",f=>f.pack(false,JSON.stringify({...f.rec,payload:"x".repeat(300000)}))],
  ["transport failure",f=>f.transport.getArtifact=async()=>{throw Error("do not leak");}],
  ["invalid receipt ID",f=>f.req.receiptId="https://other.invalid"],
  ["unknown kind",f=>f.req.kind="candidate-self-report"],
];
for(const [name,mutate] of cases) test("rejects "+name,async()=>{
  const f=fixture();mutate(f);
  const result=await index(f);
  assert.equal(result.verifiedCount,0);assert.equal(result.rejected.length,1);
  assert.equal(result.verifyReceipt(f.req),false);
});
test("repeated receipt ID revokes acceptance and run API is cached",async()=>{
  const f=fixture(), result=await index(f,[f.req,f.req]);
  assert.equal(result.verifiedCount,0);assert.equal(result.rejected.length,1);
  assert.equal(f.calls,1);
});
test("unconfigured policy fails before any transport calls",async()=>{
  const f=fixture();
  await assert.rejects(buildVerifiedReceiptIndex([f.req],{transport:f.transport}),/unconfigured-trust-policy/);
  assert.equal(f.calls,0);
});
test("producer and evaluator cannot share workflow identity",async()=>{
  const f=fixture();
  f.policy.workflows["independent-evaluation"]=f.policy.workflows["agent-execution"];
  await assert.rejects(index(f),/not-isolated/);
});
test("bounded 68 receipt capacity rejects over-limit input",async()=>{
  const f=fixture();
  await assert.rejects(index(f,Array(69).fill(f.req)),/receipt-count-exceeded/);
  assert.equal(f.calls,0);
});
