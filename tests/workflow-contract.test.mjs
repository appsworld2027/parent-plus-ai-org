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
    assert.doesNotMatch(workflow, /Check handbook access/);
    assert.doesNotMatch(workflow, /^\s+ssh-key:/m);
    assert.match(workflow, /repository: appsworld2027\/parent-plus-ai-org/);
  }
});

test("the canonical background worker accepts Groq and has no NVIDIA inference secret", () => {
  const worker = read("../.github/workflows/agent-worker.yml");
  assert.match(worker, /GROQ_API_KEY:\s*\n\s+required: false/);
  assert.doesNotMatch(worker, /NVIDIA_NIM_API_KEY/);
  assert.match(worker, /api\.groq\.com/);
});

test("the canonical organization workflow delegates only the free Groq engine", () => {
  const workflow = read("../.github/workflows/ai-agents.yml");
  assert.match(workflow, /GROQ_API_KEY:\s*\$\{\{ secrets\.GROQ_API_KEY \}\}/);
  assert.doesNotMatch(workflow, /NVIDIA_NIM_API_KEY|ANTHROPIC_API_KEY|OPENAI_API_KEY/);
});
