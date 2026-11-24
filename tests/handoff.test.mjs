import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { validatePacket, template, SECTIONS } from "../scripts/handoff.mjs";
import { buildPack, raciText, raciFor } from "../scripts/onboarding-pack.mjs";

const good = `# Handover — ai:tests — quinn-qa
## Understanding
Goal: 18 locked tests for overdue fees
Constraints: change nothing outside e2e/acceptance/
Traps: fixture student needs feedback by default
Must not touch: app code
Proof: gate PASS on the head commit
## Done
Spec written, gate PASS on 1a2b3c4
## Decisions
Neutralised the default student with a recorded note
## Assumptions
- VERIFIED: fees fixture serves invoices (read feesBackend.ts)
## Traps
Client retries failed reads for ~7 s
## Next must
Challenger: check AC-09 totals
## Next must not
Do not edit the spec
## Open questions
none
## Memory proposals
none
`;
test("a complete packet validates", () => assert.equal(validatePacket(good).ok, true, validatePacket(good).problems.join("; ")));
test("missing, empty and evidence-free sections are rejected", () => {
  const r = validatePacket(good.replace(/## Traps\n.*\n/, "").replace("none\n## Memory", "TBD\n## Memory").replace("gate PASS on 1a2b3c4", "did the work"));
  assert.equal(r.ok, false);
  assert.ok(r.problems.some((p) => /missing section '## Traps'/.test(p)));
  assert.ok(r.problems.some((p) => /'## Open questions' is empty/.test(p)));
  assert.ok(r.problems.some((p) => /no evidence/.test(p)));
});
test("understanding must have 5 lines and assumptions must be marked", () => {
  const r = validatePacket(good.replace("Proof: gate PASS on the head commit\n", "").replace("- VERIFIED:", "-"));
  assert.ok(r.problems.some((p) => /needs 5 lines/.test(p))); assert.ok(r.problems.some((p) => /VERIFIED or UNVERIFIED/.test(p)));
});
test("template lists every section", () => { const t = template("ai:tests", "quinn-qa"); for (const [n] of SECTIONS) assert.match(t, new RegExp(`## ${n}`)); });
test("onboarding pack: role, RACI, lessons, memory, contract, handovers, attempt, task — in that order", () => {
  const d = mkdtempSync(join(tmpdir(), "pack-")), hb = join(d, "hb"), p = join(d, "p");
  mkdirSync(join(hb, "org/agents"), { recursive: true }); mkdirSync(join(hb, "org/lessons"), { recursive: true });
  mkdirSync(join(p, ".ai-org"), { recursive: true }); mkdirSync(join(p, "docs/ai-memory"), { recursive: true }); mkdirSync(join(p, "docs/product/fees/handoffs"), { recursive: true });
  writeFileSync(join(hb, "org/agents/quinn-qa.md"), "ROLE-CARD"); writeFileSync(join(hb, "org/lessons/quinn-qa.md"), "LESSON-ONE");
  writeFileSync(join(p, ".ai-org/manifest.json"), JSON.stringify({ raci: { "ai:tests": { responsible: "quinn-qa@author", reviewer: "quinn-qa@challenger", accountable: "arjun-cpto" } } }));
  writeFileSync(join(p, "docs/ai-memory/TEST_KNOWLEDGE.md"), "FIXTURE-TRAP"); writeFileSync(join(p, "docs/product/fees/ACCEPTANCE.md"), "CONTRACT-ACS");
  writeFileSync(join(p, "docs/product/fees/handoffs/01-ai-tests-quinn-qa-author.md"), "HANDOVER-ONE");
  writeFileSync(join(d, "attempt.md"), "LAST-RUN-TIMED-OUT"); writeFileSync(join(d, "task.md"), "DO-THE-REVIEW");
  const pack = buildPack({ role: "quinn-qa", stage: "ai:tests", slug: "fees", seat: "challenger", handbook: hb, product: p, attempt: join(d, "attempt.md"), task: join(d, "task.md") });
  const order = ["ROLE-CARD", "challenger", "quinn-qa@challenger", "LESSON-ONE", "FIXTURE-TRAP", "CONTRACT-ACS", "HANDOVER-ONE", "LAST-RUN-TIMED-OUT", "DO-THE-REVIEW"];
  let at = -1; for (const s of order) { const i = pack.indexOf(s); assert.ok(i > at, `${s} missing or out of order`); at = i; }
  assert.match(pack, /5-line Understanding/);
  assert.ok(buildPack({ role: "quinn-qa", stage: "ai:tests", slug: "fees", handbook: hb, product: p, max: 300 }).length < 420, "whole pack is capped");
});
test("RACI text without a row says single-agent", () => assert.match(raciText(null, "ai:build"), /single-agent/));
test("review and sign-off seats find the ai:tests RACI row", () => {
  const m = { raci: { "ai:tests": { reviewer: "quinn-qa@challenger" } } };
  assert.equal(raciFor(m, "ai:tests-review").reviewer, "quinn-qa@challenger");
  assert.equal(raciFor(m, "ai:tests-signoff").reviewer, "quinn-qa@challenger");
  assert.equal(raciFor(m, "ai:build"), null);
});
