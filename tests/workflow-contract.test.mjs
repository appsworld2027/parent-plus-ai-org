import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("cross-repository private handbook consumers require the read-only deploy key", () => {
  for (const path of ["../.github/workflows/agent-worker.yml","../.github/workflows/ai-loop.yml","../.github/workflows/contract-lock.yml","../.github/workflows/handbook-connectivity.yml"]) {
    const workflow = read(path);
    assert.ok(workflow.includes("AI_ORG_HANDBOOK_SSH_KEY:") && workflow.includes("required: false"));
    assert.ok(workflow.includes("HANDBOOK_ACCESS: ${{ secrets.AI_ORG_HANDBOOK_SSH_KEY != '' }}"));
    assert.ok(workflow.includes("ssh-key: ${{ github.repository == 'appsworld2027/parent-plus-ai-org' && '' || secrets.AI_ORG_HANDBOOK_SSH_KEY }}"));
    assert.ok(workflow.includes("persist-credentials: false"));
    assert.ok(!workflow.includes("AI_ORG_HANDBOOK_TOKEN"));
  }
});

test("background agent execution fails closed unless explicitly enabled on a private caller repository", () => {
  const worker = read("../.github/workflows/agent-worker.yml");
  assert.ok(worker.includes("vars.UNATTENDED_AGENTS == 'on'"));
  assert.ok(worker.includes("github.event.repository.private == true"));
});

test("the canonical background worker is Groq free-tier only with bounded output and stage-aware tools", () => {
  const worker = read("../.github/workflows/agent-worker.yml");
  assert.ok(worker.includes("GROQ_API_KEY:") && worker.includes("required: false"));
  assert.ok(!worker.includes("NVIDIA_NIM_API_KEY"));
  assert.ok(!worker.includes("ANTHROPIC_API_KEY"));
  assert.ok(!worker.includes("OPENAI_API_KEY"));
  assert.ok(!worker.includes("CODEX_AUTH_JSON"));
  assert.ok(!worker.includes("CLAUDE_CODE_OAUTH_TOKEN"));
  assert.ok(worker.includes("api.groq.com"));
  assert.ok(worker.includes("claude --bare -p"));
  assert.ok(worker.includes("--system-prompt-file .ai-org-handbook/governance/FREE_AGENT_SYSTEM_PROMPT.md"));
  assert.ok(worker.includes("TOOL_MODE: ${{ inputs.tool_mode }}"));
  assert.ok(worker.includes("STAGE_OVERRIDE: ${{ inputs.stage_override }}"));
  assert.ok(worker.includes("--tool-mode \"$TOOL_MODE\""));
  assert.ok(worker.includes("Synthetic stage override is restricted to read-only AI Org smoke-test issues."));
  assert.ok(worker.includes('case "$TOOL_MODE" in'));
  assert.ok(worker.includes("readonly)"));
  assert.ok(worker.includes('TOOLS="Bash,Read"'));
  assert.ok(worker.includes('--tools "$TOOLS"'));
  assert.ok(worker.includes('--allowedTools "$ALLOWED_TOOLS"'));
  assert.ok(worker.includes('ALLOWED_TOOLS="Read,Bash(grep:*),Bash(sed:*),Bash(gh issue view:*),Bash(gh issue comment:*),Bash(git status:*),Bash(pwd:*),Bash(head:*),Bash(tail:*),Bash(wc:*)'));
  assert.ok(!worker.includes('--allowedTools "$TOOLS"'), "read-only mode must not pre-authorize unrestricted Bash");
  assert.equal((worker.match(/- name: Run agent with the free Groq model/g) || []).length, 1, "one workflow run starts one model worker");
  const outputCap = Number(worker.match(/CLAUDE_CODE_MAX_OUTPUT_TOKENS=(\d+)/)?.[1] || 0);
  assert.equal(outputCap, 512, "free-tier output must leave headroom below the observed 1,000 output TPM limit");
  assert.ok(worker.includes("--max-turns 60"));
  assert.ok(worker.includes("tokens per minute"));
  assert.ok(worker.includes("rate_limit_exceeded"));
  assert.ok(worker.includes("groq-probe-retryable"));
  const packMax = Number(worker.match(/--max (\d+)/)?.[1] || 0);
  assert.ok(packMax >= 1000 && packMax <= 10000, "onboarding pack must have a finite explicit size cap");
  const systemPrompt = read("../governance/FREE_AGENT_SYSTEM_PROMPT.md");
  assert.ok(systemPrompt.includes("Groq free-tier"));
  assert.ok(systemPrompt.includes("Never call another provider"));
});

test("the synthetic free-model smoke test is manual, private-only and read-only", () => {
  const smoke = read("../.github/workflows/free-agent-smoke.yml");
  assert.ok(!smoke.includes("pull_request:"));
  assert.ok(smoke.includes("workflow_dispatch:"));
  assert.ok(smoke.includes("github.event.repository.private == true"));
  assert.ok(smoke.includes("tool_mode: readonly"));
  assert.ok(smoke.includes("stage_override: ai:discovery"));
});

test("resume covers every routed role and autonomous paths fail closed on public repositories", () => {
  const resume = read("../.github/workflows/agent-resume.yml");
  assert.ok(resume.includes("github.event.repository.private == true"));
  assert.ok(resume.includes("vars.UNATTENDED_AGENTS == 'on'"));
  for (const label of ["ai:discovery", "ai:plan", "ai:lane-a", "ai:lane-b", "ai:design", "ai:tests", "ai:tests-review", "ai:tests-signoff", "ai:build", "ai:database", "ai:integration", "ai:qa", "ai:review", "ai:release-ops", "ai:fix"]) {
    assert.ok(resume.includes('. == "' + label + '"'), "resume includes " + label);
  }
  const caller = read("../.github/workflows/ai-agents.yml");
  assert.ok(caller.includes("vars.UNATTENDED_AGENTS == 'on'"));
  assert.ok(caller.includes("github.event.repository.private == true"));
  const loop = read("../.github/workflows/ai-loop.yml");
  assert.ok(loop.includes("if: github.event.repository.private == true"));
});

test("the canonical organization workflow delegates only the free Groq engine", () => {
  const workflow = read("../.github/workflows/ai-agents.yml");
  assert.ok(workflow.includes("GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}"));
  assert.ok(!workflow.includes("NVIDIA_NIM_API_KEY"));
  assert.ok(!workflow.includes("ANTHROPIC_API_KEY"));
  assert.ok(!workflow.includes("OPENAI_API_KEY"));
});
