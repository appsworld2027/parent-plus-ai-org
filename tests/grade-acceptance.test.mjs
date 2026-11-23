import { test } from "node:test";
import assert from "node:assert/strict";
import { grade, parseHooks, contractIds, classify } from "../scripts/grade-acceptance.mjs";
const contract = "| ID | G |\n|---|---|\n| AC-01 | a |\n| AC-02 | b |\n| AC-03 | c |\n";
const rep = (rows) => ({ suites: [{ specs: rows.map(([title, status, message = ""]) => ({ title, tests: [{ results: [{ status, error: message ? { message } : undefined }] }] })) }] });
const spec = `// NEW-HOOKS: /^\\d+ fees? overdue/ | fees-overdue-row
test('AC-01 x', async () => {});
// GUARD: already works
test('AC-02 y', async () => {});
// RED-BECAUSE: waits for fees
test('AC-03 z', async () => {});`;
test("parses hooks and contract IDs", () => {
  assert.deepEqual(parseHooks(spec), ["/^\\d+ fees? overdue/", "fees-overdue-row"]);
  assert.deepEqual(contractIds(contract), ["AC-01", "AC-02", "AC-03"]);
});
test("passes: red on a new hook, declared guard, explained red", () => {
  const g = grade({ spec, contract, report: rep([
    ["AC-01 x", "failed", "Error: expect(locator).toHaveCount\nLocator: getByRole('button', { name: /^\\d+ fees? overdue/ })"],
    ["AC-02 y", "passed"],
    ["AC-03 z", "failed", "Locator: getByText('Checking…')"]]) });
  assert.equal(g.pass, true, JSON.stringify(g.rows));
});
test("fails: crash, setup mistake, vacuous pass, missing AC", () => {
  const s2 = "// NEW-HOOKS: fees-overdue-row\ntest('AC-01 a', async () => {});\ntest('AC-02 b', async () => {});";
  const g = grade({ spec: s2, contract, report: rep([
    ["AC-01 a", "failed", "Error: page.evaluate: ReferenceError: lastMonth is not defined"],
    ["AC-02 b", "passed"]]) });
  assert.equal(g.pass, false);
  assert.match(g.rows[0].why, /crashed/); assert.match(g.rows[1].why, /not a declared GUARD/);
  assert.ok(g.problems.some((p) => /AC-03/.test(p)));
});
test("fails on existing UI without explanation, and on a hook that already exists", () => {
  const s3 = "// NEW-HOOKS: All caught up | fees-overdue-row\ntest('AC-01 a', async () => {});\ntest('AC-02 b', async () => {});\ntest('AC-03 c', async () => {});";
  const g = grade({ spec: s3, contract, srcText: "<Text>All caught up</Text>", report: rep([
    ["AC-01 a", "failed", "Locator: getByText('All caught up', { exact: true })"],
    ["AC-02 b", "timedOut", "Test timeout of 20000ms exceeded."],
    ["AC-03 c", "failed", "Locator: getByTestId('fees-overdue-row')"]]) });
  assert.equal(g.pass, false);
  assert.match(g.rows[0].why, /existing UI/); assert.match(g.rows[1].why, /no locator reached/); assert.equal(g.rows[2].verdict, "OK");
  assert.ok(g.warnings.some((w) => /already exists/.test(w)));
});
test("skip/only and duplicate IDs are rejected", () => {
  const s4 = "// NEW-HOOKS: x\ntest.only('AC-01 a', async () => {});\ntest('AC-01 again', async () => {});\ntest('AC-02 b', async () => {});\ntest('AC-03 c', async () => {});";
  const g = grade({ spec: s4, contract, report: rep([]) });
  assert.ok(g.problems.some((p) => /Skipped or focused/.test(p))); assert.ok(g.problems.some((p) => /More than one test for AC-01/.test(p)));
});
