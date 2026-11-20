import { test } from "node:test";
import assert from "node:assert/strict";
import { route, agentInfo, buildPrompt, pauseComment, PAUSE_MARKER } from "../scripts/agent-router.mjs";

const both = { claude: true, codex: true }, none = { claude: false, codex: false };

test("no stage label is skipped", () => assert.equal(route({ labels: ["bug"] }).action, "skip"));
test("founder and blocked stages never run an agent", () => {
  for (const s of ["ai:founder-decision", "ai:founder-test", "ai:blocked"]) assert.equal(route({ labels: [s, "ai:build"], engines: both }).action, "skip");
});
test("stages map to the right agents", () => {
  const cases = { "ai:discovery": "maya-ai-pm", "ai:plan": "arjun-cpto", "ai:build": "dev-coder", "ai:qa": "quinn-qa", "ai:review": "rex-reviewer", "ai:fix": "dev-coder" };
  for (const [s, role] of Object.entries(cases)) assert.equal(route({ labels: [s], engines: both }).role, role);
});
test("Owner line routes build work to Tara or Ravi", () => {
  assert.equal(route({ labels: ["ai:build"], body: "Owner: Tara", engines: both }).role, "tara-database");
  assert.equal(route({ labels: ["ai:build"], body: "x\nOwner: ravi\n", engines: both }).role, "ravi-integration");
});
test("without any subscription the agent pauses", () => {
  const r = route({ labels: ["ai:build"], engines: none });
  assert.equal(r.action, "pause"); assert.equal(r.role, "dev-coder");
});
test("engine label is honoured, with fallback to the other engine", () => {
  assert.equal(route({ labels: ["ai:build", "engine:codex"], engines: both }).engine, "codex");
  const r = route({ labels: ["ai:build", "engine:codex"], engines: { claude: true, codex: false } });
  assert.equal(r.engine, "claude"); assert.equal(r.fallback, true);
});
test("QA and review prefer the engine that did not author the PR", () => {
  assert.equal(route({ labels: ["ai:qa", "engine:claude"], isPR: true, engines: both }).engine, "codex");
  assert.equal(route({ labels: ["ai:review", "engine:codex"], isPR: true, engines: both }).engine, "claude");
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
