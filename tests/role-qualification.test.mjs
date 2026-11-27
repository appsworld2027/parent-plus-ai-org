import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fixtures, fixtureFor, prepareFixture, scoreFixture } from "../scripts/role-qualification.mjs";
import { STAGE_ROLE, route, FREE_MODELS } from "../scripts/agent-router.mjs";
const goodRoute=f=>({action:"run",engine:"free",role:f.role,stage:f.stage,free_model:"groq/test",free_provider:"groq"});
const result=f=>"QUALIFICATION_JSON: "+JSON.stringify(f.expected);
test("all eleven canonical roles have unique versioned fixtures and stable hashes without answer leakage",()=>{
  const roles=readdirSync(new URL("../org/agents/",import.meta.url)).filter(p=>p.endsWith(".md")).map(p=>p.slice(0,-3)).sort();
  assert.deepEqual(fixtures.map(f=>f.role).sort(),roles);
  assert.equal(new Set(fixtures.map(f=>f.id)).size,11);
  for(const f of fixtures){
    assert.equal(STAGE_ROLE[f.stage],f.role);
    const p=prepareFixture(f.id);
    assert.match(p.fixtureHash,/^[a-f0-9]{64}$/);
    assert.equal(p.fixtureHash,prepareFixture(f.id).fixtureHash);
    assert.equal(p.expected,undefined);
    assert.ok(!p.prompt.includes(JSON.stringify(f.expected)));
    const score=scoreFixture(f.id,result(f),goodRoute(f));
    assert.equal(score.passed,true);
    assert.equal(score.independentQualityAssessment,"not-assessed");
  }
  assert.throws(()=>fixtureFor("unknown"));
});
test("qualification prompts declare exact JSON types and retain a prompt hash",()=>{
  for(const f of fixtures){
    const p=prepareFixture(f.id);
    for(const [key,value] of Object.entries(f.expected)) assert.ok(p.prompt.includes(`${key}:${typeof value}`),`${f.id} declares ${key}:${typeof value}`);
    assert.match(p.promptHash,/^[a-f0-9]{64}$/);
    assert.equal(scoreFixture(f.id,result(f),goodRoute(f)).promptHash,p.promptHash);
  }
  const sam=fixtureFor("sam-v2");
  assert.equal(sam.version,2);
  assert.equal(sam.expected.publicFlag,false);
  assert.match(sam.task,/false means OFF, true means ON/);
  assert.equal(scoreFixture(sam.id,result(sam),goodRoute(sam)).passed,true);
  assert.equal(scoreFixture(sam.id,"QUALIFICATION_JSON: "+JSON.stringify({...sam.expected,publicFlag:"off"}),goodRoute(sam)).passed,false);
});

test("missing, malformed, contradictory markers, extra keys, wrong decisions and unavailable routes fail closed",()=>{
  const f=fixtureFor("dev-v1"), route=goodRoute(f);
  for(const r of ["", "QUALIFICATION_JSON: broken", result(f)+"\n"+result(f), "QUALIFICATION_JSON: "+JSON.stringify({...f.expected,extra:true}), "QUALIFICATION_JSON: "+JSON.stringify({...f.expected,A:false})]) assert.equal(scoreFixture(f.id,r,route).passed,false);
  for(const r of [{...route,engine:"paid"},{...route,role:"rex-reviewer"},{...route,stage:"ai:review"},{...route,free_model:"paid/example"}]) assert.equal(scoreFixture(f.id,result(f),r).passed,false);
});
test("qualification worker is restricted to pinned synthetic issue, read-only, no tools, and scores actual report",()=>{
  const worker=readFileSync(new URL("../.github/workflows/agent-worker.yml",import.meta.url),"utf8");
  const wrapper=readFileSync(new URL("../.github/workflows/role-qualification.yml",import.meta.url),"utf8");
  for(const s of ["[ROLE QUALIFICATION] Canonical synthetic benchmark","qualification_fixture","role-qualification.mjs prepare","role-qualification.mjs score",'TOOLS=""; ALLOWED_TOOLS=""',"ai-org-qualification-"]) assert.ok(worker.includes(s),s);
  assert.ok(wrapper.includes("tool_mode: readonly"));
  assert.ok(wrapper.includes("appsworld2027/parent-plus-ai-org"));
});

test("only explicit synthetic qualification can evaluate author seats on NVIDIA; review remains independent",()=>{
  const base={engines:{free:true},freeProviders:{groq:true,nvidia:true},labels:["ai:build"]};
  assert.equal(route(base).free_model,FREE_MODELS.builder);
  assert.equal(route({...base,syntheticQualification:true}).free_model,FREE_MODELS.nvidiaBuilder);
  assert.equal(route({...base,labels:["ai:review"],syntheticQualification:true}).free_model,FREE_MODELS.reviewer);
});
