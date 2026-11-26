import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { agentInfo, buildPrompt } from "../scripts/agent-router.mjs";

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const charter = read("FOUNDER_OPERATING_CHARTER.md");
const standard = read("governance/PERSONAL_OPERATING_STANDARD.md");
const dashboard = read("governance/FOUNDER_DASHBOARD.md");
const recovery = read("governance/SESSION_RECOVERY.md");
const scheduledReport = read(".ai/cezar/workflows/daily-founder-report.yaml");
const agents = read("AGENTS.md");
const claude = read("CLAUDE.md");
const worker = read(".github/workflows/agent-worker.yml");

test("repository sources declare the governance and operating-standard precedence", () => {
  assert.match(charter, /authoritative governance source/);
  assert.match(charter, /higher-priority platform instructions/i);
  assert.match(charter, /explicit founder decisions/);
  assert.match(charter, /Human approval is required only at protected merge, release/);
  assert.match(agents, /merge only when required protected-branch checks and human approvals are satisfied/);
  assert.match(agents, /production deployment requires the applicable authorized release approval/);
  assert.match(agents, /Founder Operating Charter is the canonical AI Org governance policy/);
  assert.match(agents, /PERSONAL_OPERATING_STANDARD\.md/);
  assert.match(claude, /@AGENTS\.md/);
});

test("the concise standard covers lifecycle, evidence, portable handover, direct dashboard and runtime limits", () => {
  for (const action of ["CONTINUE", "COMPACT", "SWITCH", "ESCALATE"]) assert.ok(standard.includes(action));
  assert.match(standard, /Verify persistence at its durable source/);
  assert.match(standard, /portable handover/);
  assert.match(standard, /directly in the conversation/);
  assert.match(dashboard, /When rich delivery is unsupported or unconfirmed, emit the complete Markdown template/);
  assert.match(standard, /do not implicitly propagate/);
  assert.match(standard, /defaults that input to `main`/);
});

test("the scheduled GitHub path checks out a selectable handbook and assembles canonical policies and reporting standard before role work", () => {
  assert.match(worker, /description: Branch\/tag of the AI Org handbook to use/);
  assert.match(worker, /default: main/);
  assert.match(worker, /path: \.ai-org-handbook/);
  const prompt = buildPrompt({ agent: agentInfo("dev-coder"), number: 1, isPR: false, repo: "o/r", stage: "ai:build" });
  const charterAt = prompt.indexOf(".ai-org-handbook/FOUNDER_OPERATING_CHARTER.md");
  const standardAt = prompt.indexOf(".ai-org-handbook/governance/PERSONAL_OPERATING_STANDARD.md");
  const dashboardAt = prompt.indexOf(".ai-org-handbook/governance/FOUNDER_DASHBOARD.md");
  const handbookAt = prompt.indexOf(".ai-org-handbook/AGENTS.md");
  const roleAt = prompt.indexOf(".ai-org-handbook/org/agents/dev-coder.md");
  assert.ok(charterAt >= 0 && standardAt > charterAt && dashboardAt > standardAt && handbookAt > dashboardAt && roleAt > handbookAt);
  for (const action of ["CONTINUE", "COMPACT", "SWITCH", "ESCALATE"]) assert.ok(prompt.includes(action));
  assert.match(prompt, /If any required source is absent/);
  assert.match(prompt, /Apply the Founder Dashboard standard to substantial batch reports and persist them in the authorized project record/);
  assert.match(prompt, /Do not claim delivery to a founder conversation/);
});

test("scheduled work does not claim an interactive founder report was delivered", () => {
  assert.match(standard, /Scheduled workers cannot assume access to the founder conversation/);
  assert.match(standard, /do not claim a conversational report was delivered/);
});

test("interactive recovery and scheduled reports resolve the same canonical template", () => {
  for (const source of [agents, charter, standard, recovery, scheduledReport]) {
    assert.match(source, /FOUNDER_DASHBOARD\.md/);
  }
  assert.match(scheduledReport, /apply the canonical template/);
  assert.match(scheduledReport, /If the template is missing, report the missing source/);
  assert.deepEqual(
    [...dashboard.matchAll(/^### (.+)$/gm)].map(([, heading]) => heading),
    [
      "Founder attention required", "Executive KPIs", "✓ Completed outcomes",
      "▶ Currently executing", "◷ Remaining work and blockers", "◈ Quality and security",
      "Resource intelligence", "Session health", "Execution schedule",
      "Ready for founder testing", "Next action", "Supporting evidence",
    ],
  );
});
