import { test } from "node:test";
import assert from "node:assert/strict";
import { route, agentInfo, buildPrompt, pauseComment, PAUSE_MARKER, FREE_MODELS } from "../scripts/agent-router.mjs";

const both = { claude: true, codex: true, free: false }, none = { claude: false, codex: false, free: false };
const freeOnly = { claude: false, codex: false, free: true }, all = { claude: true, codex: true, free: true };

test("no stage label is skipped", () => assert.equal(route({ labels: ["bug"] }).action, "skip"));
test("founder and blocked stages never run an agent", () => {
  for (const s of ["ai:founder-decision", "ai:founder-test", "ai:blocked", "ai:release", "ai:delivery", "ai:contract"]) assert.equal(route({ labels: [s, "ai:build"], engines: all }).action, "skip");
});
test("stages map to the right agents", () => {
  const cases = { "ai:discovery": "maya-ai-pm", "ai:plan": "arjun-cpto", "ai:tests": "quinn-qa", "ai:build": "dev-coder", "ai:qa": "quinn-qa", "ai:review": "rex-reviewer", "ai:fix": "dev-coder" };
  for (const [s, role] of Object.entries(cases)) assert.equal(route({ labels: [s], engines: both }).role, role);
});
test("Owner line routes build work to Tara or Ravi", () => {
  assert.equal(route({ labels: ["ai:build"], body: "Owner: Tara", engines: both }).role, "tara-database");
  assert.equal(route({ labels: ["ai:build"], body: "x\nOwner: ravi\n", engines: both }).role, "ravi-integration");
});
test("without any engine the agent pauses", () => {
  const r = route({ labels: ["ai:build"], engines: none });
  assert.equal(r.action, "pause"); assert.equal(r.role, "dev-coder");
});
test("engine label is honoured, with fallback to another engine", () => {
  assert.equal(route({ labels: ["ai:build", "engine:codex"], engines: both }).engine, "codex");
  const r = route({ labels: ["ai:build", "engine:codex"], engines: { claude: true, codex: false, free: false } });
  assert.equal(r.engine, "claude"); assert.equal(r.fallback, true);
});
test("QA and review prefer an engine that did not author the PR", () => {
  assert.equal(route({ labels: ["ai:qa", "engine:claude"], isPR: true, engines: both }).engine, "codex");
  assert.equal(route({ labels: ["ai:review", "engine:codex"], isPR: true, engines: both }).engine, "claude");
});
test("paid engines are preferred over the free engine when no label is set", () => {
  assert.equal(route({ labels: ["ai:build"], engines: all }).engine, "claude");
});
test("free engine runs when it is the only engine, with builder and reviewer models", () => {
  const b = route({ labels: ["ai:fix"], engines: freeOnly });
  assert.equal(b.action, "run"); assert.equal(b.engine, "free"); assert.equal(b.free_model, FREE_MODELS.builder);
  const q = route({ labels: ["ai:review", "engine:free"], isPR: true, engines: freeOnly });
  assert.equal(q.engine, "free"); assert.equal(q.free_model, FREE_MODELS.reviewer);
  assert.notEqual(FREE_MODELS.builder, FREE_MODELS.reviewer);
});
test("every routed role has an agent file with a name", () => {
  for (const slug of ["maya-ai-pm", "arjun-cpto", "dev-coder", "tara-database", "ravi-integration", "quinn-qa", "rex-reviewer"]) {
    const a = agentInfo(slug); assert.ok(a.name && a.role, slug);
  }
});
test("prompt and pause comment carry the agent identity", () => {
  const agent = agentInfo("quinn-qa");
  const p = buildPrompt({ agent, number: 7, isPR: true, repo: "o/r" });
  assert.match(p, /You are Quinn/); assert.match(p, /gh pr view 7/); assert.match(p, /quinn-qa\.md/);
  assert.ok(pauseComment({ agent, stage: "ai:qa" }).startsWith(PAUSE_MARKER));
});

test("Quinn's prompt points to the QA charter and Maya's to the contract playbook", () => {
  assert.match(buildPrompt({ agent: agentInfo("quinn-qa"), number: 1, isPR: false, repo: "o/r" }), /qa-charter\.md/);
  assert.match(buildPrompt({ agent: agentInfo("maya-ai-pm"), number: 1, isPR: false, repo: "o/r" }), /feature-contract\.md/);
});
