import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const workflow = readFileSync(new URL("../.github/workflows/agent-worker.yml", import.meta.url), "utf8");
const pattern = verdict => {
  const line = workflow.split("\n").find(s => s.includes("grep -Eiq") && s.includes("Verdict:") && s.includes(verdict));
  assert.ok(line);
  return line.match(/grep -Eiq '([^']+)'/)[1];
};
const matches = (verdict, report) => spawnSync("grep", ["-Eiq", pattern(verdict)], {input:report, encoding:"utf8"}).status === 0;
const accepts = report => matches("REJECT", report) && !matches("APPROVE", report);
test("actual synthetic reviewer Markdown heading is a valid explicit rejection", () => {
  assert.equal(accepts("## Verdict: REJECT\nregistration email password duplicate"), true);
  assert.equal(accepts("**Verdict: REJECT**"), true);
  assert.equal(accepts("Verdict: REJECT"), true);
});
test("approval, conflicting verdicts and narrative mentions fail closed", () => {
  for (const report of ["## Verdict: APPROVE", "## Verdict: REJECT\n### Verdict: APPROVE", "Verdict: REJECTED", "I will state Verdict: REJECT", "No verdict provided"]) assert.equal(accepts(report), false, report);
});
