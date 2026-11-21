// Tests for scripts/contract-lock.mjs (AGENTS.md §7A rule 4). Run: node --test tests/contract-lock.test.mjs
// Skip/focus samples are split with "+" so contract-lock never flags this file itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkContractLock, parseNameStatus, parseAddedLines } from "../scripts/contract-lock.mjs";

const M = (path) => ({ status: "M", path });

test("build PR that does not touch locked tests passes", () => {
  const r = checkContractLock({ changes: [M("src/app.ts"), M("README.md")] });
  assert.equal(r.ok, true);
  assert.equal(r.isContractPR, false);
});

test("build PR that edits a locked test fails", () => {
  const r = checkContractLock({ changes: [M("src/app.ts"), M("tests/acceptance/list.spec.ts")] });
  assert.equal(r.ok, false);
  assert.match(r.violations[0], /changed in a non-contract PR: tests\/acceptance\/list\.spec\.ts/);
});

test("build PR that deletes a locked test fails and says deleted", () => {
  const r = checkContractLock({ changes: [{ status: "D", path: "tests/acceptance/list.spec.ts" }] });
  assert.equal(r.ok, false);
  assert.match(r.violations[0], /deleted/);
});

test("contract PR may change the contract and its tests", () => {
  const r = checkContractLock({
    labels: ["ai:contract"],
    changes: [M("docs/product/delete-item/ACCEPTANCE.md"), M("tests/acceptance/delete-item.spec.ts")],
  });
  assert.equal(r.ok, true);
  assert.equal(r.isContractPR, true);
});

test("contract PR that also changes app code fails", () => {
  const r = checkContractLock({ labels: ["ai:contract"], changes: [M("tests/acceptance/a.spec.ts"), M("src/app.ts")] });
  assert.equal(r.ok, false);
  assert.match(r.violations[0], /may only contain the contract/);
});

test("adding .only or .skip to any test file fails, in any PR type", () => {
  for (const labels of [[], ["ai:contract"]]) {
    const r = checkContractLock({
      labels,
      changes: [M("src/list.test.ts")],
      addedLines: { "src/list.test.ts": ["  it" + ".only('works', () => {})"], "e2e/x.ts": ["test.describe" + ".skip('x', () => {})"] },
    });
    assert.equal(r.ok, false);
    assert.equal(r.violations.filter((v) => v.startsWith("Test skipped or focused")).length, 2);
  }
});

test("xit / xdescribe are caught", () => {
  const r = checkContractLock({ changes: [], addedLines: { "src/a.spec.js": ["x" + "it('later', () => {})"] } });
  assert.equal(r.ok, false);
});

test("skip-like text in a non-test file is ignored", () => {
  const r = checkContractLock({ changes: [M("README.md")], addedLines: { "README.md": ["never use test" + ".skip( in PRs"] } });
  assert.equal(r.ok, true);
});

test("custom locked path from the product manifest is enforced", () => {
  const r = checkContractLock({ changes: [M("e2e/acceptance/a.spec.ts")], lockedPaths: ["e2e/acceptance/"] });
  assert.equal(r.ok, false);
});

test("rename out of the locked folder is caught (both old and new paths checked)", () => {
  const changes = parseNameStatus("R100\ttests/acceptance/a.spec.ts\tsrc/old/a.spec.ts\nM\tsrc/app.ts\n");
  assert.deepEqual(changes.map((c) => c.path), ["tests/acceptance/a.spec.ts", "src/old/a.spec.ts", "src/app.ts"]);
  assert.equal(checkContractLock({ changes }).ok, false);
});

test("parseAddedLines reads added lines per file and ignores deleted files", () => {
  const diff = [
    "diff --git a/src/a.test.ts b/src/a.test.ts",
    "--- a/src/a.test.ts",
    "+++ b/src/a.test.ts",
    "@@ -1,0 +2 @@",
    "+it" + ".only('x', () => {})",
    "diff --git a/gone.ts b/gone.ts",
    "--- a/gone.ts",
    "+++ /dev/null",
    "@@ -1 +0,0 @@",
    "-old",
  ].join("\n");
  assert.deepEqual(parseAddedLines(diff), { "src/a.test.ts": ["it" + ".only('x', () => {})"] });
});
