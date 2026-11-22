// Tests for scripts/contract-lock.mjs (AGENTS.md §7A rule 4). Run: node --test tests/contract-lock.test.mjs
// Skip/focus samples are split with "+" so contract-lock never flags this file itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { checkContractLock, parseNameStatus, parseAddedLines, isContractCommit } from "../scripts/contract-lock.mjs";

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

// --- delivery PRs (label ai:delivery): contract + merged build, the final stacked PR ---
const L = ["e2e/acceptance/"];
const contractCommit = { sha: "c0ffee1", files: ["docs/product/x/ACCEPTANCE.md", "e2e/acceptance/x.spec.ts"] };
const buildCommit = { sha: "b1d0001", files: ["App.tsx", "src/x.ts"] };

test("delivery PR with contract commit + untouched tests + app code passes", () => {
  const r = checkContractLock({ labels: ["ai:delivery"], lockedPaths: L, changes: [M("App.tsx"), M("e2e/acceptance/x.spec.ts")], commits: [buildCommit, contractCommit] });
  assert.equal(r.ok, true);
  assert.equal(r.isDeliveryPR, true);
});

test("delivery PR fails if a build commit touched a locked test", () => {
  const r = checkContractLock({ labels: ["ai:delivery"], lockedPaths: L, changes: [], commits: [{ sha: "bad0001", files: ["src/x.ts", "e2e/acceptance/x.spec.ts"] }, contractCommit] });
  assert.equal(r.ok, false);
  assert.match(r.violations[0], /Build commit bad0001 changed locked test/);
});

test("delivery PR fails if locked tests differ from the contract commit (e.g. changed via a merge)", () => {
  const r = checkContractLock({ labels: ["ai:delivery"], lockedPaths: L, changes: [], commits: [buildCommit, contractCommit], lockedDrift: ["e2e/acceptance/x.spec.ts"] });
  assert.equal(r.ok, false);
  assert.match(r.violations[0], /differs from the approved contract commit/);
});

test("delivery PR without a contract commit fails", () => {
  const r = checkContractLock({ labels: ["ai:delivery"], lockedPaths: L, changes: [M("App.tsx")], commits: [buildCommit] });
  assert.equal(r.ok, false);
  assert.match(r.violations[0], /no contract commit/);
});

test("delivery PR still rejects skipped or focused tests", () => {
  const r = checkContractLock({ labels: ["ai:delivery"], lockedPaths: L, changes: [], commits: [contractCommit], addedLines: { "src/x.test.ts": ["it" + ".only('x', () => {})"] } });
  assert.equal(r.ok, false);
});

test("isContractCommit: only contract docs + locked tests, and at least one locked test", () => {
  assert.equal(isContractCommit(contractCommit.files, L), true);
  assert.equal(isContractCommit(["docs/product/x/ACCEPTANCE.md"], L), false);
  assert.equal(isContractCommit(["e2e/acceptance/x.spec.ts", "App.tsx"], L), false);
});
