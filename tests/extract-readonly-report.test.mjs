import test from "node:test";
import assert from "node:assert/strict";
import { extractReadonlyReport } from "../scripts/extract-readonly-report.mjs";
const assistant = (text) => JSON.stringify({type:"assistant",message:{content:[{type:"text",text}]}});
test("report keeps an early verdict and complete later evidence beyond the old clipping boundary", () => {
  const verdict = "**Verdict: REJECT**";
  const details = "registration email password duplicate " + "x".repeat(7000);
  const jsonl = [assistant(verdict), JSON.stringify({type:"tool",text:"not assistant content"}), assistant(details)].join("\n");
  const report = extractReadonlyReport(jsonl);
  assert.ok(report.startsWith(verdict));
  assert.ok(report.endsWith(details));
  assert.ok(!report.includes("not assistant content"));
});
test("report fails closed on absent, malformed or excessive output", () => {
  assert.throws(() => extractReadonlyReport('{"type":"result"}'), /No final assistant report/);
  assert.throws(() => extractReadonlyReport("not JSON"));
  assert.throws(() => extractReadonlyReport(assistant("é".repeat(6001))), /exceeds bounded size/);
});
