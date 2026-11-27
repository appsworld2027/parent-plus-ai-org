import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { parseDocument } from "yaml";
const read = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("cross-repository private handbook consumers require the read-only deploy key", () => {
  for (const path of ["../.github/workflows/agent-worker.yml","../.github/workflows/ai-loop.yml","../.github/workflows/contract-lock.yml","../.github/workflows/handbook-connectivity.yml"]) {
    const workflow = read(path);
    assert.ok(workflow.includes("AI_ORG_HANDBOOK_SSH_KEY:") && workflow.includes("required: false"));
    assert.ok(workflow.includes("Detect AI Org handbook visibility"));
    assert.ok(workflow.includes("GITHUB_TOKEN: ${{ github.token }}"));
    assert.ok(workflow.includes("Authorization: Bearer $GITHUB_TOKEN"));
    assert.ok(workflow.includes("steps.handbook_visibility.outputs.private == 'true'"));
    assert.ok(workflow.includes("HANDBOOK_ACCESS: ${{ secrets.AI_ORG_HANDBOOK_SSH_KEY != '' }}"));
    assert.ok(workflow.includes("ssh-key: ${{ github.repository != 'appsworld2027/parent-plus-ai-org' && steps.handbook_visibility.outputs.private == 'true' && secrets.AI_ORG_HANDBOOK_SSH_KEY || '' }}"));
    assert.ok(workflow.includes("persist-credentials: false"));
    assert.ok(!workflow.includes("AI_ORG_HANDBOOK_TOKEN"));
  }
});

test("AI Org may run in its own public repo; external callers require private repos and explicit enablement", () => {
  const worker = read("../.github/workflows/agent-worker.yml");
  assert.ok(worker.includes("vars.UNATTENDED_AGENTS == 'on'"));
  assert.ok(worker.includes("github.repository == 'appsworld2027/parent-plus-ai-org'"));
  assert.ok(worker.includes("github.event.repository.private == true"));
});

test("agent onboarding pack stays inside the workspace and is ignored by Git", () => {
  const worker = read("../.github/workflows/agent-worker.yml");
  assert.ok(worker.includes('ONBOARDING_DIR="$GITHUB_WORKSPACE/.ai-org-runtime"'));
  assert.ok(worker.includes('ONBOARDING_FILE="$ONBOARDING_DIR/onboarding.md"'));
  assert.ok(worker.includes("git rev-parse --git-path info/exclude"));
  assert.ok(worker.includes("grep -qxF '.ai-org-runtime/'"));
  assert.ok(worker.includes('cd "$GITHUB_WORKSPACE"'));
  assert.ok(worker.includes("test -s .ai-org-runtime/onboarding.md"));
  assert.ok(worker.includes('--out "$ONBOARDING_FILE"'));
  assert.ok(!worker.includes("--out /tmp/onboarding.md"));
  const router = read("../scripts/agent-router.mjs");
  assert.ok(router.includes("compact onboarding pack is embedded below in this initial prompt"));
  assert.ok(router.includes("Do not attempt to access `/tmp/onboarding.md`"));
  assert.ok(!router.includes("FIRST read `/tmp/onboarding.md`"));
});

test("the canonical background worker uses approved free providers with bounded output and stage-aware tools", () => {
  const worker = read("../.github/workflows/agent-worker.yml");
  assert.ok(worker.includes("GROQ_API_KEY:") && worker.includes("required: false"));
  assert.ok(worker.includes("NVIDIA_NIM_API_KEY:") && worker.includes("required: false"));
  assert.ok(worker.includes("ENGINE_GROQ:") && worker.includes("ENGINE_NVIDIA:"));
  assert.ok(!worker.includes("ANTHROPIC_API_KEY"));
  assert.ok(!worker.includes("OPENAI_API_KEY"));
  assert.ok(!worker.includes("CODEX_AUTH_JSON"));
  assert.ok(!worker.includes("CLAUDE_CODE_OAUTH_TOKEN"));
  assert.ok(worker.includes("api.groq.com"));
  assert.ok(worker.includes("integrate.api.nvidia.com"));
  assert.ok(worker.includes("nvidia_nim/"));
  assert.ok(worker.includes("retrying once on the approved Groq free builder"));
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
  assert.ok(worker.includes('ALLOWED_TOOLS="Read,Bash(grep:*),Bash(sed:*),Bash(gh issue view:*),Bash(git status:*),Bash(pwd:*),Bash(head:*),Bash(tail:*),Bash(wc:*)'));
  assert.ok(!worker.includes('--allowedTools "$TOOLS"'), "read-only mode must not pre-authorize unrestricted Bash");
  assert.equal((worker.match(/- name: Run agent with the selected free provider/g) || []).length, 1, "one workflow run starts one model worker");
  const strategy = JSON.parse(read("../governance/EXECUTION_STRATEGIES.json")).profiles["free-packeted"];
  const caps = [strategy.worker.outputTokenCap, strategy.worker.embeddedReviewOutputTokenCap];
  assert.deepEqual(caps, [512, 768]);
  assert.ok(worker.includes('OUTPUT_TOKEN_CAP="$STRATEGY_OUTPUT_CAP"'));
  assert.ok(worker.includes('OUTPUT_TOKEN_CAP="$STRATEGY_REVIEW_OUTPUT_CAP"'));
  assert.ok(caps.every(n=>n < 1000), "free-tier output must leave measured allowance headroom");
  assert.ok(worker.includes('CLAUDE_CODE_MAX_OUTPUT_TOKENS="$OUTPUT_TOKEN_CAP"'));
  assert.ok(worker.includes("At most 120 words"));
  assert.ok(worker.includes('--max-turns "$STRATEGY_MAX_TURNS"'));
  assert.ok(worker.includes('timeout "$STRATEGY_WALL_SECONDS" claude'));
  assert.ok(worker.includes("Missing or invalid trusted strategy ceilings"));
  const classifier = read("../scripts/classify-worker-result.mjs");
  assert.ok(classifier.includes("tokens per minute"));
  assert.ok(classifier.includes("rate_limit_exceeded"));
  assert.ok(worker.includes("groq-probe-retryable"));
  assert.ok(worker.includes("nvidia-probe-retryable"));
  assert.ok(worker.includes("unset GROQ_API_KEY NVIDIA_NIM_API_KEY"));
  const packMax = Number(worker.match(/--max (\d+)/)?.[1] || 0);
  assert.ok(packMax >= 1000 && packMax <= 10000, "onboarding pack must have a finite explicit size cap");
  const systemPrompt = read("../governance/FREE_AGENT_SYSTEM_PROMPT.md");
  assert.ok(systemPrompt.includes("approved free-only provider set"));
  assert.ok(systemPrompt.includes("Never call an unapproved provider"));
  assert.ok(systemPrompt.includes("The workflow owns publication"));
  assert.ok(systemPrompt.includes("do not invoke a write tool"));
  assert.ok(worker.includes("Publish and verify read-only completion report"));
  assert.ok(worker.includes("The workflow publishes it as the issue comment"));
  assert.ok(worker.includes("## Compact onboarding pack"));
  assert.ok(worker.includes("cat .ai-org-runtime/onboarding.md"));
  assert.ok(worker.includes("started-at"));
  assert.ok(worker.includes("github-actions[bot]"));
  assert.ok(worker.includes("Publish and verify read-only completion report"));
  assert.ok(worker.includes("Workflow could not verify its read-only report comment."));
});

test("the synthetic free-model smoke is manual and read-only; public access is limited to AI Org itself", () => {
  const smoke = read("../.github/workflows/free-agent-smoke.yml");
  assert.ok(!smoke.includes("pull_request:"));
  assert.ok(smoke.includes("workflow_dispatch:"));
  assert.ok(smoke.includes("vars.UNATTENDED_AGENTS == 'on'"));
  assert.ok(smoke.includes("github.repository == 'appsworld2027/parent-plus-ai-org'"));
  assert.ok(smoke.includes("github.event.repository.private == true"));
  assert.ok(smoke.includes("tool_mode: readonly"));
  assert.equal(parseDocument(smoke).toJS().on.workflow_dispatch.inputs.stage.default, "ai:discovery");
});

test("resume covers every routed role; only AI Org self-work may run in a public repository", () => {
  const resume = read("../.github/workflows/agent-resume.yml");
  assert.ok(resume.includes("github.repository == 'appsworld2027/parent-plus-ai-org'"));
  assert.ok(resume.includes("github.event.repository.private == true"));
  assert.ok(resume.includes("vars.UNATTENDED_AGENTS == 'on'"));
  for (const label of ["ai:discovery", "ai:plan", "ai:lane-a", "ai:lane-b", "ai:design", "ai:tests", "ai:tests-review", "ai:tests-signoff", "ai:build", "ai:database", "ai:integration", "ai:qa", "ai:review", "ai:release-ops", "ai:fix"]) {
    assert.ok(resume.includes(JSON.stringify(label)), "resume includes " + label);
  }
  const caller = read("../.github/workflows/ai-agents.yml");
  assert.ok(caller.includes("vars.UNATTENDED_AGENTS == 'on'"));
  assert.ok(caller.includes("github.repository == 'appsworld2027/parent-plus-ai-org'"));
  assert.ok(caller.includes("github.event.repository.private == true"));
  assert.ok(caller.includes("tool_mode: ${{ github.event_name == 'issues' && startsWith(github.event.issue.title || '', '[SMOKE TEST]') && 'readonly' || 'standard' }}"));
  assert.ok(caller.includes("stage_override: ${{ github.event_name == 'issues' && startsWith(github.event.issue.title || '', '[SMOKE TEST]') && 'ai:discovery' || '' }}"));
  const loop = read("../.github/workflows/ai-loop.yml");
  assert.ok(loop.includes("github.repository == 'appsworld2027/parent-plus-ai-org'"));
  assert.ok(loop.includes("github.event.repository.private == true"));
});

test("read-only completion verification compares parsed timestamps, not ISO strings", () => {
  const worker = read("../.github/workflows/agent-worker.yml");
  assert.ok(worker.includes('STARTED_EPOCH=$(date -d "$STARTED_AT" +%s)'));
  assert.ok(worker.includes("fromdateiso8601"));
  assert.ok(worker.includes("(.created_at | epoch) >= $started"));
  assert.ok(!worker.includes("(.created_at >= $started)"));
});

test("the canonical organization workflow delegates only approved free providers", () => {
  const workflow = read("../.github/workflows/ai-agents.yml");
  assert.ok(workflow.includes("GROQ_API_KEY: ${{ secrets.GROQ_API_KEY }}"));
  assert.ok(workflow.includes("NVIDIA_NIM_API_KEY: ${{ secrets.NVIDIA_NIM_API_KEY }}"));
  assert.ok(!workflow.includes("ANTHROPIC_API_KEY"));
  assert.ok(!workflow.includes("OPENAI_API_KEY"));
});

test("all GitHub workflow YAML parses without errors", () => {
  const dir = new URL("../.github/workflows/", import.meta.url);
  for (const file of readdirSync(dir).filter(f => /[.]ya?ml$/.test(f))) {
    const document = parseDocument(readFileSync(new URL(file,dir),"utf8"));
    assert.deepEqual(document.errors.map(e => e.message), [], file);
    assert.ok(document.get("jobs"), file);
    assert.ok(document.get("on"), file);
  }
});

test("read-only completion uses the declared issue input instead of a nonexistent item output", () => {
  const workflow = parseDocument(read("../.github/workflows/agent-worker.yml")).toJS();
  const step = workflow.jobs.agent.steps.find(s => s.name === "Publish and verify read-only completion report");
  assert.equal(step.env.NUMBER, "${{ inputs.number }}");
});

test("read-only completion normalizes the role prefix and verifies the exact run receipt", () => {
  const worker = read("../.github/workflows/agent-worker.yml");
  assert.ok(worker.includes('RECEIPT="Run: $RUN_URL (attempt $GITHUB_RUN_ATTEMPT)"'));
  assert.ok(worker.includes('startswith($marker) and contains($receipt)'));
  assert.ok(worker.includes('REPORT=$(printf'));
  assert.ok(worker.includes('"$MARKER" "$REPORT" "$RECEIPT"'));
});

test("free smoke can exercise only synthetic discovery and reviewer seats", () => {
  const workflow = parseDocument(read("../.github/workflows/free-agent-smoke.yml")).toJS();
  assert.deepEqual(workflow.on.workflow_dispatch.inputs.stage.options, ["ai:discovery", "ai:review"]);
  assert.equal(workflow.jobs.smoke.with.tool_mode, "readonly");
  assert.equal(workflow.jobs.smoke.with.stage_override, "${{ inputs.stage }}");
  const worker = read("../.github/workflows/agent-worker.yml");
  assert.ok(worker.includes('Reviewer smoke requires a dedicated Reviewer smoke issue.'));
});

test("read-only work receives bounded authoritative issue body and reviewer fixture is checked", () => {
  const worker = read("../.github/workflows/agent-worker.yml");
  assert.ok(worker.includes("Authoritative current task: issue #%s"));
  assert.ok(worker.includes("cat /tmp/body.md"));
  assert.ok(worker.includes("Read-only issue body exceeds bounded prompt size."));
  assert.ok(worker.includes("Synthetic reviewer did not reject the flawed rule."));
  assert.ok(worker.includes("registration email password duplicate"));
});

test("read-only reporting is workflow-owned across all prompt sources", () => {
  const worker = read("../.github/workflows/agent-worker.yml");
  const prompt = read("../governance/FREE_AGENT_SYSTEM_PROMPT.md");
  const router = read("../scripts/agent-router.mjs");
  assert.ok(worker.includes("Read-only mode: never write or post comments."));
  assert.ok(worker.includes("start with a separate Verdict: APPROVE or Verdict: REJECT line"));
  assert.ok(prompt.includes("Never attempt to publish a read-only report"));
  assert.ok(router.includes("The workflow owns stage transitions and publishes your final assistant report."));
  assert.ok(!router.includes("Only perform the specific issue comment explicitly requested"));
});
