import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("cross-repository handbook consumers do not require a deploy key", () => {
  for (const path of [
    "../.github/workflows/agent-worker.yml",
    "../.github/workflows/ai-loop.yml",
    "../.github/workflows/contract-lock.yml",
    "../.github/workflows/handbook-connectivity.yml"
  ]) {
    const workflow = read(path);
    assert.ok(!workflow.includes("Check handbook access"));
    assert.ok(!workflow.includes("ssh-key:"));
    assert.ok(workflow.includes("repository: appsworld2027/parent-plus-ai-org"));
  }
});

test("the canonical background worker accepts Groq and has no NVIDIA inference secret", () => {
  const worker = read("../.github/workflows/agent-worker.yml");
  assert.ok(worker.includes("GROQ_API_KEY:\n        required: false"));
  assert.ok(!worker.includes("NVIDIA_NIM_API_KEY"));
  assert.ok(worker.includes("api.groq.com"));
  assert.ok(worker.includes("claude --bare -p"));
  assert.ok(worker.includes("--system-prompt-file .ai-org-handbook/governance/FREE_AGENT_SYSTEM_PROMPT.md"));
  assert.ok(worker.includes('--tools "Bash,Read,Edit,Write,Glob,Grep,WebSearch,WebFetch"'));
  assert.ok(worker.includes("CLAUDE_CODE_MAX_OUTPUT_TOKENS=2048"));
  const systemPrompt = read("../governance/FREE_AGENT_SYSTEM_PROMPT.md");
  assert.ok(systemPrompt.includes("Groq free-tier"));
  assert.ok(systemPrompt.includes("Never call another provider"));
});

test("the canonical organization workflow delegates only the free Groq engine", () => {
  const workflow = read("../.github/workflows/ai-agents.yml");
  assert.ok(workflow.includes("GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}"));
  assert.ok(!workflow.includes("NVIDIA_NIM_API_KEY"));
  assert.ok(!workflow.includes("ANTHROPIC_API_KEY"));
  assert.ok(!workflow.includes("OPENAI_API_KEY"));
});
