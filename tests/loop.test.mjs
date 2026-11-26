// Tests for scripts/loop.mjs pure logic (AI Org outer loop). Run: node --test tests/loop.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCommand, isFounder, latestVerdict, verdictEvidence, hasIndependentApproval, failRounds, checksState, latestRequiredWorkflow, parseAcceptance, nextBacklogItem, slugOfBranch, demoPack, contractState, gateDecision, qaChainStep, gateStatusSince, buildIssueBody, fixIssueBody, discoveryIssueBody, MARK } from "../scripts/loop.mjs";

test("parseCommand reads the first non-empty line only", () => {
  assert.deepEqual(parseCommand("/approve"), { cmd: "approve", text: "" });
  assert.deepEqual(parseCommand("\n  /Changes: make the button bigger\nand blue"), { cmd: "changes", text: "make the button bigger\nand blue" });
  assert.equal(parseCommand("looks good /approve"), null);
  assert.equal(parseCommand("/approved"), null);
  assert.equal(parseCommand("/next").cmd, "next");
});
test("parseCommand drops quoted email replies", () => {
  assert.equal(parseCommand("/changes bigger text\n\nOn Mon, Ankit wrote:\n> old").text, "bigger text");
});
test("isFounder needs the founder list AND repo association", () => {
  assert.equal(isFounder("appsworld2027", "OWNER", ["appsworld2027"]), true);
  assert.equal(isFounder("AppsWorld2027", "OWNER", ["appsworld2027"]), true);
  assert.equal(isFounder("stranger", "NONE", ["appsworld2027"]), false);
  assert.equal(isFounder("appsworld2027", "NONE", ["appsworld2027"]), false);
  assert.equal(isFounder("github-actions[bot]", "NONE", ["appsworld2027"]), false);
});
const c = (at, body) => ({ created_at: at, body });
test("latestVerdict uses Rex's newest verdict after the head commit", () => {
  const cs = [c("2026-01-01T10:00Z", "[Rex — Code Reviewer] **Verdict: APPROVE**"), c("2026-01-02T10:00Z", "[Rex — Code Reviewer]\n\n**Verdict: CHANGES REQUESTED**"),
    c("2026-01-03T10:00Z", "[Quinn — QA] Verdict: PASS")];
  assert.equal(latestVerdict(cs, "Rex", "2026-01-01T00:00Z"), "changes");
  assert.equal(latestVerdict(cs, "Rex", "2026-01-02T12:00Z"), null);
  assert.equal(latestVerdict([...cs, c("2026-01-04T10:00Z", "[Rex — Code Reviewer] **Verdict: APPROVE — ready**")], "Rex", "2026-01-02T12:00Z"), "approve");
});
test("failRounds counts Quinn/Rex failures only", () => {
  assert.equal(failRounds([c("a", "[Quinn — QA] **Verdict: FAIL → ai:fix**"), c("b", "[Rex — R] Verdict: CHANGES NEEDED"), c("c", "[Dev] Verdict: FAIL"), c("d", "[Rex] Verdict: APPROVE")]), 2);
});
test("checksState: pending, fail, missing required, success", () => {
  const ok = { status: "completed", conclusion: "success" };
  assert.equal(checksState([{ name: "foundation", status: "in_progress" }]), "pending");
  assert.equal(checksState([{ name: "foundation", ...ok }, { name: "lab", status: "completed", conclusion: "failure" }]), "fail");
  assert.equal(checksState([{ name: "foundation", status: "completed", conclusion: "action_required" }]), "fail");
  assert.equal(checksState([{ name: "validate", ...ok }]), "missing");
  assert.equal(checksState([{ name: "foundation", ...ok }, { name: "x", status: "completed", conclusion: "skipped" }]), "success");
});
const ACC = `# Feature Contract: Coach "Needs you" list\n\n## Why this feature\nCoaches see who needs feedback.\nSecond line.\n\n## Acceptance criteria\n| ID | Given | When | Then | Proto |\n|---|---|---|---|---|\n| AC-01 | a coach | opens Today | a heading "Needs you" | x |\n| AC-02 | 1 child | opens Today | "1 child needs feedback" | y |\n`;
test("parseAcceptance extracts title, why and ACs", () => {
  const a = parseAcceptance(ACC);
  assert.equal(a.title, 'Coach "Needs you" list');
  assert.equal(a.why, "Coaches see who needs feedback. Second line.");
  assert.deepEqual(a.acs.map((x) => x.id), ["AC-01", "AC-02"]);
  assert.equal(a.acs[1].then, '"1 child needs feedback"');
});
test("nextBacklogItem takes the first unchecked, unused item", () => {
  const md = "# Backlog\n- [x] coach-needs-you — Needs you\n- [ ] fees-overdue — Fees overdue in Needs you — M2-41\n- [ ] parent-signals — Parent quick signals — M2-06\n";
  assert.deepEqual(nextBacklogItem(md), { slug: "fees-overdue", title: "Fees overdue in Needs you", ref: "M2-41" });
  assert.equal(nextBacklogItem(md, ["fees-overdue"]).slug, "parent-signals");
  assert.equal(nextBacklogItem(md, ["fees-overdue", "parent-signals"]), null);
});
test("slugOfBranch only accepts contract branches", () => {
  assert.equal(slugOfBranch("ai/contract-fees-overdue"), "fees-overdue");
  assert.equal(slugOfBranch("ai/build-x"), null);
});
test("demoPack is founder-readable and carries the marker, commands and AC table", () => {
  const d = demoPack({ pr: 36, ...parseAcceptance(ACC), preview: "https://p.vercel.app", founders: ["appsworld2027"] });
  assert.ok(d.startsWith(`<!-- ${MARK.demo} -->`));
  assert.match(d, /@appsworld2027/); assert.match(d, /https:\/\/p\.vercel\.app/);
  assert.match(d, /`\/approve`/); assert.match(d, /`\/changes/); assert.match(d, /\| AC-02 \|/);
  assert.match(d, /tell your AI assistant/); assert.doesNotMatch(d, /reply on this PR|notification email/);
  assert.ok(d.indexOf("https://p.vercel.app") < d.indexOf("| AC |"), "the Vercel link comes first");
});
test("contractState: ready only when Maya's marker is newer than the founder's last /changes", () => {
  const F = ["appsworld2027"], who = { login: "appsworld2027" };
  const ready = (at) => ({ created_at: at, body: `x\n<!-- ${MARK.contractReady} fees -->`, user: { login: "github-actions[bot]" }, author_association: "NONE" });
  const changes = (at, u = who, a = "OWNER") => ({ created_at: at, body: "/changes fix it", user: u, author_association: a });
  assert.deepEqual(contractState([], F), { slug: null, ready: false });
  assert.deepEqual(contractState([ready("2026-11-22T19:00:00Z")], F), { slug: "fees", ready: true });
  assert.equal(contractState([ready("2026-11-22T19:00:00Z"), changes("2026-11-23T03:47:00Z")], F).ready, false);
  assert.equal(contractState([ready("2026-11-22T19:00:00Z"), changes("2026-11-23T03:47:00Z"), ready("2026-11-23T03:49:00Z")], F).ready, true);
  assert.equal(contractState([ready("2026-11-22T19:00:00Z"), changes("2026-11-23T03:47:00Z", { login: "stranger" }, "NONE")], F).ready, true, "non-founders cannot reopen a contract");
});
test("issue bodies route to the right agent and keep the hard rules", () => {
  const b = buildIssueBody({ pr: 41, branch: "ai/contract-x", slug: "x" });
  assert.match(b, /^<!-- ai-org:build-for 41 -->\nOwner: Dev/); assert.match(b, /NEVER add, edit, delete/); assert.match(b, /base `ai\/contract-x`/);
  const f = fixIssueBody({ pr: 41, branch: "ai/contract-x", slug: "x", text: "bigger", author: "appsworld2027", n: 1 });
  assert.match(f, /Owner: Dev/); assert.match(f, /bigger/); assert.match(f, /NEVER touch `e2e\/acceptance\/`/);
  const d = discoveryIssueBody({ slug: "x", title: "Thing", ref: "M2-1" });
  assert.match(d, /^Owner: Maya/); assert.match(d, /ai-org:contract-ready x/); assert.match(d, /ai:founder-decision/);
  assert.match(d, /NEVER commit to `main`/);
});
test("gateDecision: build only on a green acceptance gate; retry twice, then block", () => {
  assert.equal(gateDecision([]), "wait");
  assert.equal(gateDecision([{ context: "acceptance-gate", state: "pending" }]), "wait");
  assert.equal(gateDecision([{ context: "ci", state: "failure" }, { context: "acceptance-gate", state: "success" }]), "build");
  assert.equal(gateDecision([{ context: "acceptance-gate", state: "failure" }], 0), "retry");
  assert.equal(gateDecision([{ context: "acceptance-gate", state: "failure" }], 2), "block");
});
test("v3 QA chain: challenger, one fix round, CPTO sign-off, then build", () => {
  const raci = { responsible: "quinn-qa@author", reviewer: "quinn-qa@challenger", accountable: "arjun-cpto" };
  assert.equal(qaChainStep({ raci: null }), "build");
  assert.equal(qaChainStep({ raci }), "challenge");
  assert.equal(qaChainStep({ raci, verdicts: { challenger: "changes" } }), "fix");
  assert.equal(qaChainStep({ raci, verdicts: { challenger: "changes" }, fixRounds: 1 }), "signoff");
  assert.equal(qaChainStep({ raci, verdicts: { challenger: "approve" } }), "signoff");
  assert.equal(qaChainStep({ raci, verdicts: { challenger: "approve", signoff: "approve" } }), "build");
  assert.equal(qaChainStep({ raci, verdicts: { challenger: "approve", signoff: "changes" }, fixRounds: 0 }), "fix");
  assert.equal(qaChainStep({ raci, verdicts: { challenger: "changes", signoff: "changes" }, fixRounds: 1 }), "fix");
  assert.equal(qaChainStep({ raci, verdicts: { challenger: "approve", signoff: "changes" }, fixRounds: 2 }), "block");
  const st = { b: [{ context: "acceptance-gate", state: "success" }] };
  assert.deepEqual(gateStatusSince(["a", "b", "c"], (s) => st[s] || []), st.b, "handover commits after the gate do not hide its status");
});
test("latestVerdict tells the challenger apart from the author", () => {
  const cs = [{ created_at: "2026-11-25T01:00:00Z", body: "[Quinn — QA Specialist, challenger]\nVerdict: CHANGES" },
    { created_at: "2026-11-25T02:00:00Z", body: "[Quinn — QA Specialist]\nVerdict: PASS" }];
  assert.equal(latestVerdict(cs, "Quinn — QA Specialist, challenger", ""), "changes");
});

test("protected release review requires an authorized independent GitHub review of the current head", () => {
  const options = { head: "current", authorLogin: "Builder", reviewerIds: [12, 14] };
  const approval = { id: 1, user: { id: 12, login: "Reviewer", type: "User" }, state: "APPROVED", commit_id: "current" };
  assert.equal(hasIndependentApproval([approval], options), true);
  assert.equal(hasIndependentApproval([{ ...approval, commit_id: "old" }], options), false);
  assert.equal(hasIndependentApproval([{ ...approval, user: { ...approval.user, login: "builder" } }], options), false);
  assert.equal(hasIndependentApproval([{ ...approval, user: { ...approval.user, type: "Bot" } }], options), false);
  assert.equal(hasIndependentApproval([approval], { ...options, reviewerIds: [] }), false);
  assert.equal(hasIndependentApproval([approval, { ...approval, id: 2, state: "DISMISSED" }], options), false);
  assert.equal(hasIndependentApproval([approval, { ...approval, id: 2, user: { id: 14, login: "Other", type: "User" }, state: "CHANGES_REQUESTED" }], options), false);
});

test("an unrelated GitHub App cannot supply a required Actions result", () => {
  const run = { name: "foundation", status: "completed", conclusion: "success" };
  assert.equal(checksState([{ ...run, app: "external-app" }], ["foundation"], "github-actions"), "missing");
  assert.equal(checksState([{ ...run, app: "github-actions" }], ["foundation"], "github-actions"), "success");
});

test("required CI selects only the latest run of the configured workflow for the exact branch and commit", () => {
  const expected = { id: 10, head_sha: "head", head_branch: "feature", path: ".github/workflows/checks.yml" };
  const latest = { ...expected, id: 11, status: "in_progress" };
  const otherRuns = [
    { ...expected, id: 20, path: ".github/workflows/unrelated.yml" },
    { ...expected, id: 21, head_sha: "previous" },
    { ...expected, id: 22, head_branch: "another-feature" },
    { ...expected, id: 23, path: ".github/workflows/other/checks.yml" },
  ];
  assert.equal(latestRequiredWorkflow(otherRuns, "checks.yml", "feature", "head"), undefined);
  assert.equal(latestRequiredWorkflow([latest, ...otherRuns, expected], "checks.yml", "feature", "head"), latest);
});

test("configured AI verdict evidence requires the assigned account and reviewed commit", () => {
  const sha = "a".repeat(40);
  const policy = { rex: 12, challenger: 13, signoff: 14 };
  const review = { user: { id: 12, login: "authorized-reviewer", type: "User" }, body: `[Rex] Verdict: APPROVE\n<!-- ai-org:reviewed-commit ${sha} -->` };
  assert.deepEqual(verdictEvidence([review], policy, "rex", sha), [review]);
  assert.deepEqual(verdictEvidence([{ ...review, user: { id: 13, login: "unassigned-user", type: "User" } }], policy, "rex", sha), [], "a comment claiming to be Rex cannot impersonate the assigned account");
  assert.deepEqual(verdictEvidence([{ ...review, user: { id: 12, login: "authorized-reviewer[bot]", type: "Bot" } }], policy, "rex", sha), [], "a GitHub App bot cannot impersonate an assigned human account");
  assert.deepEqual(verdictEvidence([review], policy, "rex", "b".repeat(40)), []);
  assert.deepEqual(verdictEvidence([{ ...review, body: `[Rex] Verdict: APPROVE\n<!-- ai-org:reviewed-commit ${"b".repeat(40)} -->` }], policy, "rex", sha), [], "stale evidence for another commit cannot pass");
  assert.deepEqual(verdictEvidence([review], { ...policy, challenger: 12 }, "rex", sha), []);
  assert.deepEqual(verdictEvidence([review], policy, "rex", sha, [12]), []);
  assert.deepEqual(verdictEvidence([review], {}, "rex", sha), []);
});

test("unauthorized human account cannot satisfy the independent PR approval allowlist", () => {
  const options = { head: "current", authorLogin: "Builder", reviewerIds: [12, 14] };
  const unauthorized = { id: 1, user: { id: 99, login: "unlisted-reviewer", type: "User" }, state: "APPROVED", commit_id: "current" };
  assert.equal(hasIndependentApproval([unauthorized], options), false);
});
