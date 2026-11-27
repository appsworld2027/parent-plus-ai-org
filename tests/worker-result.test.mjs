import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyWorkerResult } from "../scripts/classify-worker-result.mjs";
const result = (is_error, text, subtype="success") => JSON.stringify({type:"result",subtype,is_error,result:text});
test("actual structured Groq 413 is blocked even with process exit zero or subtype success", () => {
  const raw = result(true, "API Error: 400 Upstream provider GROQ returned HTTP 413.\nRequest too large for model on input tokens per minute (ITPM): Limit 7000, Requested 7038");
  for(const processCode of [0,1]) assert.deepEqual(classifyWorkerResult({processCode,jsonl:raw}), {exitCode:1,kind:"request-too-large"});
});
test("429 is distinguished from permanent oversize; report prose cannot fabricate error", () => {
  assert.equal(classifyWorkerResult({processCode:1,jsonl:result(true,"HTTP 429 rate_limit_exceeded")}).kind,"transient-quota");
  assert.equal(classifyWorkerResult({processCode:0,jsonl:result(false,"Consider handling HTTP 413 and rate limits.")}).kind,"completed");
  assert.equal(classifyWorkerResult({processCode:1,jsonl:result(false,"Consider handling HTTP 413.")}).kind,"failed");
});
test("missing or malformed final evidence is never successful", () => {
  for (const jsonl of ["", "bad json", result(true,"unknown error"),result(false,"not done","error")]) {
    assert.deepEqual(classifyWorkerResult({processCode:0,jsonl}), {exitCode:1,kind:"failed"});
  }
});
test("worker preserves process failure and hard-limit evidence, no replay after possible writes", () => {
  const worker=readFileSync(new URL("../.github/workflows/agent-worker.yml",import.meta.url),"utf8");
  for(const needle of ['|| rc=$?', 'classify-worker-result.mjs', 'request-too-large', 'execution-interrupted', 'TOOLS=""; ALLOWED_TOOLS=""','STATE="blocked"']) assert.ok(worker.includes(needle),needle);
});
