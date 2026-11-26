import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { agentInfo, buildPrompt } from "../scripts/agent-router.mjs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const charter = read("FOUNDER_OPERATING_CHARTER.md");
const standard = read("governance/PERSONAL_OPERATING_STANDARD.md");
const agents = read("AGENTS.md");
const claude = read("CLAUDE.md");
const worker = read(".github/workflows/agent-worker.yml");

test("repository sources declare the governance and operating-standard precedence", () => {
  assert.match(charter, /authoritative governance source/);
  assert.match(charter, /higher-priority platform instructions/i);
  assert.match(charter, /explicit founder decisions/);
  assert.match(agents, /Founder Operating Charter is the canonical AI Org governance policy/);
  assert.match(agents, /PERSONAL_OPERATING_STANDARD\.md/);
  assert.match(claude, /@AGENTS\.md/);
});

test("the concise standard covers lifecycle, evidence, portable handover, direct dashboard and runtime limits", () => {
  for (const action of ["CONTINUE", "COMPACT", "SWITCH", "ESCALATE"]) assert.ok(standard.includes(action));
  assert.match(standard, /Verify persistence at its durable source/);
  assert.match(standard, /portable handover/);
  assert.match(standard, /directly in the conversation/);
  assert.match(standard, /rich conversational presentation only when the surface actually supports it/);
  assert.match(standard, /do not implicitly propagate/);
  assert.match(standard, /defaults that input to `main`/);
});

test("the scheduled GitHub path checks out a selectable handbook and assembles both canonical policies before role work", () => {
  assert.match(worker, /description: Branch\/tag of the AI Org handbook to use/);
  assert.match(worker, /default: main/);
  assert.match(worker, /path: \.ai-org-handbook/);
  const prompt = buildPrompt({ agent: agentInfo("dev-coder"), number: 1, isPR: false, repo: "o/r", stage: "ai:build" });
  const charterAt = prompt.indexOf(".ai-org-handbook/FOUNDER_OPERATING_CHARTER.md");
  const standardAt = prompt.indexOf(".ai-org-handbook/governance/PERSONAL_OPERATING_STANDARD.md");
  const handbookAt = prompt.indexOf(".ai-org-handbook/AGENTS.md");
  const roleAt = prompt.indexOf(".ai-org-handbook/org/agents/dev-coder.md");
  assert.ok(charterAt >= 0 && standardAt > charterAt && handbookAt > standardAt && roleAt > handbookAt);
  for (const action of ["CONTINUE", "COMPACT", "SWITCH", "ESCALATE"]) assert.ok(prompt.includes(action));
  assert.match(prompt, /If either canonical policy is absent/);
});

test("scheduled work does not claim an interactive founder report was delivered", () => {
  assert.match(standard, /Scheduled workers cannot assume access to the founder conversation/);
  assert.match(standard, /do not claim a conversational report was delivered/);
});
