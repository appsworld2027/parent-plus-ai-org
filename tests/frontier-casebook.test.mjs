import test from "node:test";
import assert from "node:assert/strict";
import { canonicalHash, rubric, rubricHash, assessFrontierAdmission } from "../scripts/frontier-admission.mjs";
import { prepareFrontierCasebook, intakeFrontierArtifact } from "../scripts/frontier-casebook.mjs";

const options={sourceSha:"a".repeat(40),seed:"synthetic-evaluation-20261127"};
const book=prepareFrontierCasebook(options);
const find=(role,variant="normal")=>book.cases.find(c=>c.fixture.role===role&&c.fixture.variant===variant);
test("frozen plan covers exact rubric roles and all 33 distinct fixture/prompt hashes",()=>{
  assert.equal(book.cases.length,33);
  assert.equal(book.payload.rubricHash,rubricHash);
  assert.equal(book.payload.sourceSha,options.sourceSha);
  assert.deepEqual(new Set(book.cases.map(c=>c.fixture.role)),new Set(rubric.roles.map(r=>r.role)));
  assert.equal(new Set(book.payload.slots.map(s=>s.fixtureHash)).size,33);
  assert.equal(new Set(book.payload.slots.map(s=>s.promptHash)).size,33);
  for(const c of book.cases){
    assert.equal(canonicalHash(c.fixture),c.fixtureHash);
    assert.equal(canonicalHash(c.prompt),c.promptHash);
    assert.ok(c.prompt.includes(JSON.stringify(c.fixture)));
    assert.ok(c.fixture.requiredFiles.length>=1);
    assert.equal(c.fixture.criteria.length,8);
  }
});
test("same inputs deterministically reproduce plan, changed seed/SHA invalidates it",()=>{
  assert.deepEqual(book,prepareFrontierCasebook(options));
  assert.notEqual(book.planHash,prepareFrontierCasebook({...options,seed:"alternate-synthetic-seed"}).planHash);
  assert.notEqual(book.planHash,prepareFrontierCasebook({...options,sourceSha:"b".repeat(40)}).planHash);
  assert.throws(()=>prepareFrontierCasebook({...options,seed:"short"}));
  assert.throws(()=>prepareFrontierCasebook({...options,sourceSha:"main"}));
});
test("real frozen-plan shape accepted structurally but no receipts means zero qualified",()=>{
  const result=assessFrontierAdmission({plan:{receiptId:"gh:1:1:1",payload:book.payload},runs:[]});
  assert.equal(result.status,"incomplete");
  assert.equal(result.counts.eligible,0);
  assert.equal(result.productionReady,false);
});
test("role artifact intake requires exact paths; artifact hash is order-invariant",()=>{
  for(const c of book.cases){
    // Test doubles solely establish shape, not substantive correctness.
    const files=c.fixture.requiredFiles.map(path=>({path,content:"synthetic test double, not deliverable"}));
    const x=intakeFrontierArtifact(c.fixture,{files});
    const y=intakeFrontierArtifact(c.fixture,{files:[...files].reverse()});
    assert.equal(x.artifactHash,y.artifactHash);
    assert.equal(x.fixtureHash,c.fixtureHash);
    assert.equal(x.status,"intake-only");assert.equal(x.qualified,false);
    assert.notEqual(intakeFrontierArtifact(c.fixture,{files:files.map(f=>({...f,content:f.content+" changed"}))}).artifactHash,x.artifactHash);
  }
});
test("intake rejects missing, additional, duplicate, traversal, empty and oversized files",()=>{
  const {fixture}=find("dev-coder");
  const files=fixture.requiredFiles.map(path=>({path,content:"test only"}));
  for(const candidate of [
    {files:[]},{files:[...files,{path:"secret.txt",content:"x"}]},
    {files:[files[0],files[0]]},{files:[{path:"../board.mjs",content:"x"},files[1]]},
    {files:[{...files[0],content:" "},files[1]]},{files:[{...files[0],content:"x".repeat(24001)},files[1]]},
    {files:[{...files[0],content:"a\u0000b"},files[1]]},{files,qualified:true}
  ])assert.throws(()=>intakeFrontierArtifact(fixture,candidate));
});
async function modelBoard(role,variant){
  // Only static controller-owned synthetic source is loaded here, never agent output.
  const code=find(role,variant).fixture.starterFiles["board.mjs"];
  return (await import("data:text/javascript;base64,"+Buffer.from(code).toString("base64"))).createBoard();
}
const input={tenant:"t1",id:"r1",title:"  Pack sports kit  ",expectedVersion:0,requestId:"q1"};
test("starter is genuinely RED for actual board behavior",async()=>{
  const board=await modelBoard("dev-coder","normal");
  assert.throws(()=>board.list("t1"),/TODO/);assert.equal(board.save(input).ok,false);
});
function cleanChecks(board){
  const saved=board.save(input);
  assert.deepEqual(saved,{ok:true,record:{id:"r1",title:"Pack sports kit",version:1}});
  saved.record.title="mutated";
  assert.equal(board.list("t1")[0].title,"Pack sports kit");
  assert.deepEqual(board.list("t2"),[]);
  assert.deepEqual(board.save(input),{ok:true,record:{id:"r1",title:"Pack sports kit",version:1}});
  assert.deepEqual(board.save({...input,title:"changed"}),{ok:false,code:"conflict"});
  assert.deepEqual(board.save({...input,requestId:"q2"}),{ok:false,code:"stale"});
  assert.equal(board.save({...input,requestId:"q2",expectedVersion:1,title:"Update"}).record.version,2);
  assert.equal(board.save({...input,tenant:"t2"}).ok,true);
  assert.deepEqual(board.list("t1"),[{id:"r1",title:"Update",version:2}]);
  assert.deepEqual(board.list("t2"),[{id:"r1",title:"Pack sports kit",version:1}]);
  const rows=board.list("t1");rows[0].title="changed";assert.equal(board.list("t1")[0].title,"Update");
  assert.throws(()=>board.list(" "));assert.equal(board.save({...input,tenant:""}).code,"invalid");
  assert.equal(board.save({...input,title:"x".repeat(81)}).code,"invalid");
  assert.equal(board.save({...input,title:"x".repeat(80),id:"r2",requestId:"q3"}).ok,true);
  assert.equal(board.save({...input,expectedVersion:-1}).code,"invalid");
}
test("review control passes concrete board contract checks",async()=>cleanChecks(await modelBoard("rex-reviewer","normal")));
test("edge review fixture contains executable conflicting replay defect",async()=>{
  const board=await modelBoard("rex-reviewer","edge");
  assert.equal(board.save(input).ok,true);
  assert.equal(board.save({...input,title:"different"}).ok,true);
  assert.throws(()=>assert.deepEqual(board.save({...input,title:"different"}),{ok:false,code:"conflict"}));
});
test("adversarial review fixture contains executable cross-tenant leak",async()=>{
  const board=await modelBoard("rex-reviewer","adversarial");
  board.save(input);assert.equal(board.list("t2").length,1);
  assert.throws(()=>assert.deepEqual(board.list("t2"),[]));
});
test("release fixtures exercise clean, stale and failed smoke states without external effects",()=>{
  const normal=find("sam-release").fixture.inputs,edge=find("sam-release","edge").fixture.inputs,bad=find("sam-release","adversarial").fixture.inputs;
  assert.equal(normal.releaseSha,normal.ciSha);assert.equal(normal.smoke,"pass");assert.equal(normal.publicFlag,false);
  assert.notEqual(edge.releaseSha,edge.ciSha);assert.equal(edge.founderOnly,false);assert.equal(edge.smoke,"unknown");
  assert.equal(bad.smoke,"fail");assert.equal(bad.publicFlag,false);assert.equal(bad.rollbackRehearsed,false);
});
