import test from "node:test";
import assert from "node:assert/strict";
import { prepareFrontierCasebook } from "../scripts/frontier-casebook.mjs";
import { readFile } from "node:fs/promises";
import { evaluateBoardCode, evaluateQuinnTests } from "../scripts/frontier-board-evaluator.mjs";
const book=prepareFrontierCasebook({sourceSha:"a".repeat(40),seed:"sandbox-test-seed-20261127"});
const code=(role,variant)=>book.cases.find(c=>c.fixture.role===role&&c.fixture.variant===variant).fixture.starterFiles["board.mjs"];
const image=process.env.FRONTIER_TEST_NODE_IMAGE;
test("rejects unpinned image and oversized artifact before Docker",async()=>{
  await assert.rejects(evaluateBoardCode(code("rex-reviewer","normal"),{image:"node:22"}),/digest-pinned/);
  await assert.rejects(evaluateBoardCode("x".repeat(24001),{image:"node@sha256:"+"a".repeat(64)}),/invalid board artifact/);
});
test("isolated runner clean control passes 12 real locked tests",{skip:!image},async()=>{
  const r=await evaluateBoardCode(code("rex-reviewer","normal"),{image});
  assert.equal(r.status,"behavior-pass",JSON.stringify(r));assert.equal(r.counts.pass,12);assert.equal(r.qualified,false);
});
test("isolated runner detects real replay and tenant leakage defects",{skip:!image},async()=>{
  for(const variant of ["edge","adversarial"]){
    const r=await evaluateBoardCode(code("rex-reviewer",variant),{image});
    assert.equal(r.status,"behavior-fail",JSON.stringify(r));assert.ok(r.counts.fail>0);
  }
});
test("isolated runner rejects incomplete suite/process exit without claiming pass",{skip:!image},async()=>{
  const r=await evaluateBoardCode("process.exit(0); export function createBoard(){}",{image});
  assert.notEqual(r.status,"behavior-pass",JSON.stringify(r));
});

const controls=()=>({image,clean:code("rex-reviewer","normal"),mutants:[code("rex-reviewer","edge"),code("rex-reviewer","adversarial")]});
test("QA mutation screening accepts real locked suite on clean and detects both seeded defects",{skip:!image},async()=>{
  const suite=await readFile(new URL("../fixtures/frontier/locked-board.test.txt",import.meta.url),"utf8");
  const r=await evaluateQuinnTests(suite,controls());
  assert.equal(r.status,"mutation-screen-pass",JSON.stringify(r));assert.equal(r.clean.counts.pass,12);
  assert.equal(r.mutants.length,2);assert.ok(r.mutants.every(x=>x.counts.fail>0));assert.equal(r.qualified,false);
});
test("QA mutation screening rejects vacuous passing tests",{skip:!image},async()=>{
  const suite='import test from "node:test"; for(let i=0;i<5;i++)test("vacuous "+i,()=>{});';
  const r=await evaluateQuinnTests(suite,controls());assert.equal(r.clean.status,"behavior-pass");assert.equal(r.status,"mutation-screen-fail");
});
test("QA mutation screening rejects non-distinct controls before actual execution",async()=>{
  const c=controls();c.mutants[0]=c.clean;
  await assert.rejects(evaluateQuinnTests("test",c),/distinct trusted controls/);
});
