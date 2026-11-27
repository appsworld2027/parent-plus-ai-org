import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseDocument } from "yaml";
const workflow = parseDocument(readFileSync(new URL("../.github/workflows/agent-resume.yml",import.meta.url),"utf8")).toJS();
const script = workflow.jobs.resume.steps[0].run;
const policy = script.split("// BEGIN RECOVERY POLICY\n")[1].split("// END RECOVERY POLICY")[0];
const { planResume,parseReceipt,stageOf,STAGES } = await import("data:text/javascript;base64,"+Buffer.from(policy).toString("base64"));
const t = Date.parse("2026-11-27T00:00:00Z");
const issue = {number:1,state:"open",labels:[{name:"ai:build"}]};
const receipt = (state,id=1,options={}) => ({
  id, created_at:new Date(t+id*1000).toISOString(), user:{login:"github-actions[bot]",type:"Bot"},
  body:"<!-- ai-org:runtime:v1 state="+state+" stage="+(options.stage??"ai:build")+" run="+(options.run??"123")+" attempt="+(options.attempt??1)+" mode="+(options.mode??"standard")+(options.source?" source="+options.source:"")+" -->"
});
const run = (conclusion="failure",options={}) => ({id:123,run_attempt:1,status:"completed",conclusion,updated_at:new Date(t+10_000).toISOString(),...options});
const decide = (comments,r=run(),i=issue,now=t+3*3600_000) => planResume(i,comments,r,now);
test("transient provider failure is eligible after cooldown despite unrelated human comments",()=>{
  const comments=[receipt("started"),receipt("executing",2),receipt("paused",3),{id:4,created_at:new Date(t+4000).toISOString(),user:{login:"founder",type:"User"},body:"Please continue"}];
  assert.equal(decide(comments).action,"dispatch");
  assert.equal(decide(comments,run(),issue,t+60_000).reason,"recovery cooldown");
  assert.equal(decide(comments,run("failure",{status:"in_progress"})).action,"skip");
});
test("a cancelled attempt before model execution can resume; one with possible writes cannot",()=>{
  assert.equal(decide([receipt("started")],run("cancelled")).action,"dispatch");
  assert.equal(decide([receipt("started")],run("timed_out")).action,"dispatch");
  assert.equal(decide([receipt("started")],run("failure")).action,"hold");
  assert.equal(decide([receipt("started"),receipt("executing",2)],run("cancelled")).action,"hold");
});
test("claim, completion, normal failure, policy block and unknown legacy receipts never dispatch",()=>{
  for(const state of ["claimed","dispatch_failed","completed","failed","blocked"]){
    const options=["claimed","dispatch_failed"].includes(state)?{source:1}:{};
    assert.notEqual(decide([receipt("paused"),receipt(state,2,options)]).action,"dispatch");
  }
  assert.equal(decide([{...receipt("paused"),body:"<!-- ai-org:paused -->"}]).action,"skip");
});
test("rejects spoofed receipts, wrong stage and exact run/attempt mismatches",()=>{
  assert.equal(parseReceipt({...receipt("paused"),user:{login:"founder",type:"User"}}),null);
  assert.equal(parseReceipt({...receipt("paused"),body:"prose\n"+receipt("paused").body}),null);
  assert.equal(decide([receipt("paused",1,{stage:"ai:review"})]).action,"skip");
  assert.equal(decide([receipt("paused",1,{mode:"readonly"})]).action,"skip");
  assert.equal(decide([receipt("paused")],run("failure",{run_attempt:2})).action,"hold");
  assert.equal(decide([receipt("paused")],run("failure",{id:999})).action,"hold");
  assert.equal(decide([receipt("paused")],run("success")).action,"hold");
  assert.equal(decide([receipt("paused")],run(),{...issue,labels:[{name:"ai:build"},{name:"ai:blocked"}]}).action,"skip");
  assert.equal(stageOf({...issue,labels:["ai:build","ai:qa"]}),null);
});
test("recovery budget closed after three claims and reset after verified prior completion",()=>{
  const history=[receipt("paused",1),receipt("claimed",2,{source:1}),receipt("paused",3),receipt("claimed",4,{source:3}),receipt("paused",5),receipt("claimed",6,{source:5}),receipt("paused",7)];
  assert.equal(decide(history).reason,"bounded recovery budget exhausted");
  assert.equal(decide([...history,receipt("completed",8),receipt("paused",9)]).action,"dispatch");
  assert.equal(decide([receipt("paused"),receipt("claimed",2,{source:1}),receipt("paused",3)],run(),issue,t+20*60_000).reason,"recovery cooldown");
});
test("workflow serializes recovery and supports every routed stage",()=>{
  assert.equal(STAGES.size,15);
  assert.equal(workflow.jobs.resume.concurrency["cancel-in-progress"],false);
  assert.ok(workflow.jobs.resume.concurrency.group.includes("ai-resume-"));
  assert.ok(script.indexOf('receipt("claimed")') < script.indexOf('gh("workflow","run"'));
  assert.ok(script.includes("dispatched>=8"));
});

test("worker receipts bracket model execution and verification",()=>{
  const worker=parseDocument(readFileSync(new URL("../.github/workflows/agent-worker.yml",import.meta.url),"utf8")).toJS();
  const steps=worker.jobs.agent.steps;
  const names=steps.map(step=>step.name);
  const pos=name=>names.indexOf(name);
  assert.ok(pos("Record task attempt")>=0);
  assert.ok(pos("Record task attempt")<pos("Prepare the product workspace (dependencies + test browser)"));
  assert.ok(pos("Record model-execution boundary")<pos("Run agent with the selected free provider (FCC compatibility adapter)"));
  assert.ok(pos("Record completed attempt")>pos("Handover check"));
  assert.ok(steps[pos("Report a failed run")].run.includes("state=%s stage=%s run=%s attempt=%s mode=%s"));
  assert.ok(steps[pos("Pause (no engine connected)")].run.includes("state=blocked"));
});
