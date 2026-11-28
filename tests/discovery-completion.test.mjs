import test from "node:test";
import assert from "node:assert/strict";
import { classifyWorkerResult } from "../scripts/classify-worker-result.mjs";
const success = JSON.stringify({type:"result",subtype:"success",is_error:false,result:"**Understanding:** I will deliver the contract.",num_turns:1});
const use = JSON.stringify({type:"assistant",message:{content:[{type:"tool_use",name:"Bash",input:{command:"gh issue view 170"}}]}});
test("standard acknowledgment without tools is incomplete, readonly reporting remains valid", () => {
  assert.deepEqual(classifyWorkerResult({processCode:0,jsonl:success,toolMode:"standard"}),{exitCode:1,kind:"incomplete"});
  assert.deepEqual(classifyWorkerResult({processCode:0,jsonl:success,toolMode:"readonly"}),{exitCode:0,kind:"completed"});
});
test("standard tool execution still requires stage verification outside the transport classifier", () => {
  assert.equal(classifyWorkerResult({processCode:0,jsonl:use+"\n"+success,toolMode:"standard"}).kind,"completed");
});
import { verifyDiscoveryOutput, renderVerifiedReport } from "../scripts/verify-discovery-output.mjs";
const bot = {login:"github-actions[bot]"};
const marker = "<!-- ai-org:contract-candidate f010-quality-drift -->";
const report = {id:12,user:bot,body:"Acceptance criteria and product decision summary.\n"+marker};
const head="a".repeat(40);
const files={"SUMMARY.md":"Summary","ACCEPTANCE.md":"Acceptance criteria","PRODUCT_THINKING.md":"Decision options"};
const resolveContract=()=>({head,files});
const check=(overrides={})=>verifyDiscoveryOutput({before:[],after:[report],expectedSlug:"f010-quality-drift",resolveContract,...overrides});
test("fresh authenticated report and exact remotely resolved contract files are required",()=>{
  assert.deepEqual(check(),{ok:true,slug:"f010-quality-drift",head,commentId:"12"});
  assert.equal(check({after:[]}).ok,false);
  assert.equal(check({before:[report]}).ok,false);
  assert.equal(check({after:[{...report,user:{login:"someone-else"}}]}).ok,false);
  assert.equal(check({after:[{...report,body:marker}]}).ok,false);
  assert.equal(check({after:[report,{...report,id:13}]}).ok,false);
  assert.equal(check({expectedSlug:"different-feature"}).ok,false);
  assert.equal(check({resolveContract:()=>{throw new Error("missing branch")}}).ok,false);
  assert.equal(check({resolveContract:()=>({head:"bad",files})}).ok,false);
});
test("each required artifact must exist and contain content",()=>{
  for (const doc of Object.keys(files)) {
    const copy={...files}; delete copy[doc];
    assert.equal(check({resolveContract:()=>({head,files:copy})}).ok,false,doc);
    assert.equal(check({resolveContract:()=>({head,files:{...files,[doc]:" \n "}})}).ok,false,doc);
  }
});
test("initial discovery may assign a slug but cannot use an unsafe ref",()=>{
  assert.equal(check({expectedSlug:""}).ok,true);
  assert.equal(check({after:[{...report,body:"summary\n<!-- ai-org:contract-candidate ../../main -->"}],expectedSlug:""}).ok,false);
});
test("only verified workflow output turns a candidate into a ready report",()=>{
  const result=check();
  assert.match(renderVerifiedReport(result,[report]),/<!-- ai-org:contract-ready f010-quality-drift -->/);
  assert.match(renderVerifiedReport(result,[report]),new RegExp(head));
  assert.throws(()=>renderVerifiedReport({ok:false},[report]));
  assert.equal(check({after:[report,{...report,id:13,body:"premature\n<!-- ai-org:contract-ready f010-quality-drift -->"}]}).ok,false);
});
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolveRemoteContract } from "../scripts/verify-discovery-output.mjs";
test("integration: checks the actual remote Git head and not the local working tree",()=>{
  const root=mkdtempSync(join(tmpdir(),"ai-org-discovery-proof-"));
  try {
    const remote=join(root,"remote.git"), work=join(root,"work");
    const git=(cwd,...args)=>execFileSync("git",args,{cwd,encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
    git(root,"init","--bare",remote); mkdirSync(work); git(work,"init","-b","main");
    git(work,"remote","add","origin",remote);
    const docDir=join(work,"docs/product/f010-quality-drift"); mkdirSync(docDir,{recursive:true});
    for (const [file,content] of Object.entries(files)) writeFileSync(join(docDir,file),content);
    git(work,"add","."); git(work,"-c","user.name=Fixture","-c","user.email=fixture@example.invalid","commit","-m","contract");
    const actualHead=git(work,"rev-parse","HEAD");
    git(work,"push","origin","HEAD:refs/heads/ai/contract-f010-quality-drift");
    writeFileSync(join(docDir,"ACCEPTANCE.md"),"local uncommitted change");
    const actual=resolveRemoteContract("f010-quality-drift",work);
    assert.deepEqual(actual,{head:actualHead,files});
    assert.throws(()=>resolveRemoteContract("missing-feature",work));
  } finally {rmSync(root,{recursive:true,force:true});}
});
test("worker verifies and publishes discovery output before recording completion",()=>{
  const worker=readFileSync(new URL("../.github/workflows/agent-worker.yml",import.meta.url),"utf8");
  const before=worker.indexOf("discovery-comments-before.json");
  const invoke=worker.indexOf("claude --bare -p");
  const verify=worker.indexOf("- name: Verify and publish discovery output");
  const complete=worker.indexOf("- name: Record completed attempt");
  assert.ok(before>0 && before<invoke && invoke<verify && verify<complete);
  assert.ok(worker.includes('agent.stderr "$TOOL_MODE")'));
  assert.ok(worker.includes('touch /tmp/agent-logs/incomplete'));
});
test("integrated workflow prepares the assigned branch locally and resumes an existing contract without remote writes",()=>{
  const root=mkdtempSync(join(tmpdir(),"ai-org-pilot-prep-"));
  try {
    const remote=join(root,"remote.git"), seed=join(root,"seed");
    const git=(cwd,...args)=>execFileSync("git",args,{cwd,encoding:"utf8",stdio:["ignore","pipe","pipe"]}).trim();
    git(root,"init","--bare",remote);mkdirSync(seed);git(seed,"init","-b","main");
    git(seed,"remote","add","origin",remote);writeFileSync(join(seed,"README.md"),"Fixture");
    git(seed,"add",".");git(seed,"-c","user.name=Fixture","-c","user.email=fixture@example.invalid","commit","-m","base");
    const base=git(seed,"rev-parse","HEAD");git(seed,"push","origin","HEAD:refs/heads/main");
    const source=readFileSync(new URL("../.github/workflows/agent-worker.yml",import.meta.url),"utf8");
    const begin=source.indexOf("# Deterministic workspace preparation");
    const end=source.indexOf('[ "$(wc -c < /tmp/body.md)"',begin);
    assert.ok(begin>=0&&end>begin);
    const prep=source.slice(begin,end);
    const run=(work)=>execFileSync("bash",["-c","set -euo pipefail\n"+prep],{cwd:work,env:{...process.env,FEATURE_SLUG:"f010-quality-drift",docs_folder:"docs/custom",PROMPT:"Test prompt"},encoding:"utf8",stdio:["ignore","pipe","pipe"]});
    const first=join(root,"first");git(root,"clone","-b","main",remote,first);run(first);
    assert.equal(git(first,"branch","--show-current"),"ai/contract-f010-quality-drift");
    assert.equal(git(first,"rev-parse","HEAD"),base);
    assert.equal(git(first,"ls-remote","--heads","origin","refs/heads/ai/contract-f010-quality-drift"),"");
    git(seed,"switch","-c","ai/contract-f010-quality-drift");
    const docDir=join(seed,"docs/custom/f010-quality-drift");mkdirSync(docDir,{recursive:true});
    for(const [file,content] of Object.entries(files))writeFileSync(join(docDir,file),content);
    git(seed,"add",".");git(seed,"-c","user.name=Fixture","-c","user.email=fixture@example.invalid","commit","-m","saved contract");
    const saved=git(seed,"rev-parse","HEAD");git(seed,"push","origin","HEAD:refs/heads/ai/contract-f010-quality-drift");
    const second=join(root,"second");git(root,"clone","-b","main",remote,second);run(second);
    assert.equal(git(second,"rev-parse","HEAD"),saved);
    assert.deepEqual(resolveRemoteContract("f010-quality-drift",second,"docs/custom"),{head:saved,files});
    assert.throws(()=>resolveRemoteContract("f010-quality-drift",second,"docs/product"));
    assert.equal(git(second,"ls-remote","--heads","origin","refs/heads/ai/contract-f010-quality-drift").split("\t")[0],saved);
  }finally{rmSync(root,{recursive:true,force:true});}
});

test("manual pilot chains only the exact candidate revision and never advances unrelated work",()=>{
 const source=readFileSync(new URL("../.github/workflows/agent-worker.yml",import.meta.url),"utf8");
 const script=source.split("- name: Chain to the next agent if the stage changed")[1].split("run: |")[1];
 const root=mkdtempSync(join(tmpdir(),"ai-org-pilot-chain-"));
 try {
   const log=join(root,"dispatch.log"),summary=join(root,"step.txt");
   const stub='gh() { if [ "$1" = api ]; then case "$2" in */issues/*) echo "$AFTER_FIXTURE";; */git/ref/heads/*) echo "$CURRENT_FIXTURE";; *) return 1;; esac; else printf "%s\\n" "$*" >> "$DISPATCH_LOG"; fi; }\n';
   const run=(handbook,current,after)=>{
     writeFileSync(log,"");
     const result=execFileSync("bash",["-c",stub+script],{env:{...process.env,GITHUB_REPOSITORY:"appsworld2027/parent-plus-ai-org",GITHUB_REF_NAME:"audit/pilot",GITHUB_STEP_SUMMARY:summary,NUMBER:"170",BEFORE:"ai:discovery",WORKFLOW:"ai-agents.yml",HANDBOOK_REF:handbook,CURRENT_FIXTURE:current,AFTER_FIXTURE:after,DISPATCH_LOG:log},stdio:["ignore","pipe","pipe"],encoding:"utf8"});
     return {result,dispatch:readFileSync(log,"utf8")};
   };
   assert.match(run("pinned","pinned","ai:founder-decision").dispatch,/--ref audit\/pilot -f number=170\n$/);
   assert.equal(run("pinned","pinned","ai:discovery").dispatch,"");
   assert.throws(()=>run("pinned","changed","ai:founder-decision"),/Command failed/);
   assert.equal(readFileSync(log,"utf8"),"");
   const main=run("main","ignored","ai:founder-decision").dispatch;
   assert.match(main,/-f number=170\n/);
   assert.match(main,/-f number=0 -f mode=advance\n/);
   assert.doesNotMatch(main,/--ref/);
 }finally{rmSync(root,{recursive:true,force:true});}
});

test("compact discovery packet retains authoritative task, pinned method, template, evidence and approval gates",async()=>{
  const {discoveryPacket}=await import("../scripts/discovery-packet.mjs");
  const skill=readFileSync(new URL("../.ai/skills/superpowers/brainstorming/SKILL.md",import.meta.url),"utf8");
  const template=readFileSync(new URL("../templates/PRODUCT_THINKING.md",import.meta.url),"utf8");
  const base={task:"Unique task text",onboarding:"Start by inspecting issue metadata and body: gh issue view 170 --json title,body,labels,assignees. Previous decision preserved.",skill,template,repo:"fixture/repo",issue:"170",slug:"f010-quality-drift",folder:"docs/product",branch:"ai/contract-f010-quality-drift",root:"/fixture/repo"};
  const p=discoveryPacket(base);
  assert.equal(p.split("Unique task text").length,2);
  assert.match(p,/Previous decision preserved/);
  assert.ok(p.includes(template));
  assert.doesNotMatch(p,/gh issue view 170/);
  assert.match(p,/No implementation or writing-plans until the written contract is approved/);
  assert.match(p,/direct Write tool is available/);
  assert.match(p,/worker—not you—verifies actual Write evidence/);
  assert.throws(()=>discoveryPacket({...base,skill:skill+"changed"}),/Pinned brainstorming source changed/);
  assert.throws(()=>discoveryPacket({...base,task:"x".repeat(12000)}),/exceeds 12000 bytes/);
  assert.throws(()=>discoveryPacket({...base,branch:"main"}),/Invalid discovery assignment/);
});

test("deterministic publisher accepts only successful actual Write receipts matching every file and a final agent report",async()=>{
 const {authoredDiscovery}=await import("../scripts/verify-discovery-authorship.mjs");
 const root=mkdtempSync(join(tmpdir(),"ai-org-authorship-"));
 try{
  const folder="docs/product",slug="f010-quality-drift",dir=join(root,folder,slug);mkdirSync(dir,{recursive:true});
  const rows=[];
  for(const [i,doc] of ["SUMMARY.md","ACCEPTANCE.md","PRODUCT_THINKING.md"].entries()){
    const path=join(dir,doc),content="# "+doc+"\nActual independent agent draft\n";
    writeFileSync(path,content);
    rows.push({type:"assistant",message:{content:[{type:"tool_use",name:"Write",id:"w"+i,input:{file_path:path,content}}]}});
    rows.push({type:"user",message:{content:[{type:"tool_result",tool_use_id:"w"+i,is_error:false,content:"wrote file"}]}});
  }
  rows.push({type:"result",is_error:false,result:"Substantive agent report and recommendation."});
  const base={rows,root,folder,slug};
  assert.match(authoredDiscovery(base),/ai-org:contract-candidate f010-quality-drift/);
  assert.throws(()=>authoredDiscovery({...base,rows:rows.filter((_,i)=>i!==1)}),/Missing or mismatched actual agent Write evidence/);
  const wrong=structuredClone(rows);wrong[0].message.content[0].input.file_path=join(root,"outside.md");
  assert.throws(()=>authoredDiscovery({...base,rows:wrong}),/outside assigned documents/);
  const bad=structuredClone(rows);bad.at(-1).result="<!-- ai-org:contract-ready fake -->";
  assert.throws(()=>authoredDiscovery({...base,rows:bad}),/forbidden marker/);
  writeFileSync(join(dir,"SUMMARY.md"),"changed by someone else");
  assert.throws(()=>authoredDiscovery(base),/Missing or mismatched actual agent Write evidence/);
 }finally{rmSync(root,{recursive:true,force:true});}
});
