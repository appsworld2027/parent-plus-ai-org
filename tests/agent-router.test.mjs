import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const autonomyPolicy = JSON.parse(readFileSync(new URL("../governance/AUTONOMY_POLICY.json", import.meta.url), "utf8"));
import { route as policyRoute, ENGINES, ALLOWED_ENGINES, agentInfo, buildPrompt, pauseComment, PAUSE_MARKER, FREE_MODELS, testsBrief, buildBrief, STAGE_SEAT, STAGE_ROLE } from "../scripts/agent-router.mjs";

// Tests exercise the canonical policy: caller inputs cannot widen the allowed engine set.
const route = (a) => policyRoute(a);
const both = { claude: true, codex: true, free: false }, none = { claude: false, codex: false, free: false };
const freeOnly = { claude: false, codex: false, free: true }, all = { claude: true, codex: true, free: true };

test("no stage label is skipped", () => assert.equal(route({ labels: ["bug"] }).action, "skip"));
test("founder and blocked stages never run an agent", () => {
  for (const s of ["ai:founder-decision", "ai:founder-test", "ai:blocked", "ai:release", "ai:delivery", "ai:contract"]) assert.equal(route({ labels: [s, "ai:build"], engines: all }).action, "skip");
});
test("stages map to the right agents", () => {
  const cases = {
    "ai:discovery": "maya-ai-pm", "ai:plan": "arjun-cpto",
    "ai:lane-a": "kiran-pjm-a", "ai:lane-b": "leela-pjm-b",
    "ai:design": "iris-design", "ai:database": "tara-database", "ai:integration": "ravi-integration",
    "ai:tests": "quinn-qa", "ai:tests-review": "quinn-qa", "ai:tests-signoff": "arjun-cpto",
    "ai:build": "dev-coder", "ai:qa": "quinn-qa", "ai:review": "rex-reviewer",
    "ai:fix": "dev-coder", "ai:release-ops": "sam-release"
  };
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
test("paid engine labels cannot override the free-only policy", () => {
  for (const label of ["engine:claude", "engine:codex"]) {
    const r = route({ labels: ["ai:build", label], engines: all });
    assert.equal(r.engine, "free");
    assert.equal(r.fallback, false);
  }
});
test("QA and review always use the distinct free reviewer model, regardless of paid author labels", () => {
  assert.equal(route({ labels: ["ai:qa", "engine:claude"], isPR: true, engines: all }).engine, "free");
  assert.equal(route({ labels: ["ai:qa", "engine:claude"], isPR: true, engines: all }).free_model, FREE_MODELS.reviewer);
  assert.equal(route({ labels: ["ai:review", "engine:codex"], isPR: true, engines: all }).engine, "free");
  assert.equal(route({ labels: ["ai:review", "engine:codex"], isPR: true, engines: all }).free_model, FREE_MODELS.reviewer);
});
test("the free builder is preferred when no engine label is set", () => {
  assert.equal(route({ labels: ["ai:build"], engines: all }).engine, "free");
  assert.equal(route({ labels: ["ai:build"], engines: all }).free_model, FREE_MODELS.builder);
});
test("NVIDIA is preferred only in eligible synthetic trials while Groq remains the reviewer", () => {
  const providers = { groq: true, nvidia: true };
  const b = route({ labels: ["ai:build"], engines: freeOnly, freeProviders: providers, supervisedTrial: true });
  const q = route({ labels: ["ai:review"], isPR: true, engines: freeOnly, freeProviders: providers });
  assert.equal(b.free_model, FREE_MODELS.nvidiaBuilder);
  assert.equal(b.free_provider, "nvidia");
  assert.equal(b.free_model_role, "builder");
  assert.equal(q.free_model, FREE_MODELS.reviewer);
  assert.equal(q.free_provider, "groq");
  assert.equal(q.free_model_role, "independent-reviewer");
  assert.notEqual(b.free_provider, q.free_provider);
});
test("builder falls back to Groq when NVIDIA is unavailable; reviewer pauses without Groq", () => {
  const b = route({ labels: ["ai:build"], engines: freeOnly, freeProviders: { groq: true, nvidia: false } });
  assert.equal(b.free_model, FREE_MODELS.builder);
  const q = route({ labels: ["ai:review"], isPR: true, engines: freeOnly, freeProviders: { groq: false, nvidia: true } });
  assert.equal(q.action, "pause");
  assert.match(q.reason, /independent review requires the approved Groq reviewer/i);
});
test("free engine runs when it is the only engine, with builder and reviewer models", () => {
  const b = route({ labels: ["ai:fix"], engines: freeOnly });
  assert.equal(b.action, "run"); assert.equal(b.engine, "free"); assert.equal(b.free_model, FREE_MODELS.builder);
  const q = route({ labels: ["ai:review", "engine:free"], isPR: true, engines: freeOnly });
  assert.equal(q.engine, "free"); assert.equal(q.free_model, FREE_MODELS.reviewer);
  assert.notEqual(FREE_MODELS.builder, FREE_MODELS.reviewer);
});
test("all 11 organization roles are explicitly routable and have a role file", () => {
  const expected = ["arjun-cpto", "dev-coder", "iris-design", "kiran-pjm-a", "leela-pjm-b",
    "maya-ai-pm", "quinn-qa", "ravi-integration", "rex-reviewer", "sam-release", "tara-database"];
  assert.deepEqual([...new Set(Object.values(STAGE_ROLE))].sort(), [...expected].sort());
  for (const slug of expected) {
    const a = agentInfo(slug); assert.ok(a.name && a.role, slug);
  }
});
test("prompt and pause comment carry the agent identity", () => {
  const agent = agentInfo("quinn-qa");
  const p = buildPrompt({ agent, number: 7, isPR: true, repo: "o/r" });
  assert.match(p, /You are Quinn/); assert.match(p, /gh pr view 7/); assert.match(p, /quinn-qa\.md/);
  assert.ok(pauseComment({ agent, stage: "ai:qa" }).startsWith(PAUSE_MARKER));
});


test("read-only runs never instruct the agent to advance labels or mutate other resources", () => {
  const prompt = buildPrompt({
    agent: agentInfo("maya-ai-pm"),
    number: 91,
    isPR: false,
    repo: "appsworld2027/parent-plus-ai-org",
    stage: "ai:discovery",
    toolMode: "readonly"
  });
  assert.match(prompt, /Read-only mode/);
  assert.match(prompt, /do not modify files, branches, labels, commits, PRs/i);
  assert.doesNotMatch(prompt, /Move the stage label/);
});

test("read-only runs never receive handover creation or validation instructions", () => {
  const p = buildPrompt({ agent: agentInfo("maya-ai-pm"), number: 91, isPR: false, repo: "o/r", stage: "ai:discovery", toolMode: "readonly", featureSlug: "registration" });
  assert.match(p, /Read-only mode/);
  assert.match(p, /Read-only tasks never create handover packets/);
  assert.doesNotMatch(p, /handoff\.mjs template|handoff\.mjs validate/);
});

test("Quinn's prompt points to the QA charter and Maya's to the contract playbook", () => {
  assert.match(buildPrompt({ agent: agentInfo("quinn-qa"), number: 1, isPR: false, repo: "o/r" }), /qa-charter\.md/);
  assert.match(buildPrompt({ agent: agentInfo("maya-ai-pm"), number: 1, isPR: false, repo: "o/r" }), /feature-contract\.md/);
});
test("writing tests uses the builder model; QA and review verdicts keep the reviewer model", () => {
  assert.equal(route({ labels: ["ai:tests"], engines: freeOnly }).free_model, FREE_MODELS.builder);
  assert.equal(route({ labels: ["ai:qa"], isPR: true, engines: freeOnly }).free_model, FREE_MODELS.reviewer);
  assert.equal(route({ labels: ["ai:review"], isPR: true, engines: freeOnly }).free_model, FREE_MODELS.reviewer);
});
test("the ai:tests prompt carries the focused brief; other stages do not", () => {
  const q = agentInfo("quinn-qa");
  const p = buildPrompt({ agent: q, number: 42, isPR: false, repo: "o/r", stage: "ai:tests" });
  assert.match(p, /first version/); assert.match(p, /Change NOTHING outside the locked folder/); assert.match(p, /Closes #42/);
  assert.match(p, /node_modules/); assert.match(p, /Never push to `main`/);
  assert.doesNotMatch(buildPrompt({ agent: q, number: 42, isPR: true, repo: "o/r", stage: "ai:qa" }), /first version/);
  assert.ok(testsBrief(7).includes("#7"));
});
test("ai:tests brief teaches the fixture/browser/read-failure lessons and requires the gate", () => {
  const p = buildPrompt({ agent: agentInfo("quinn-qa"), number: 42, isPR: false, repo: "o/r", stage: "ai:tests" });
  assert.match(p, /DEFAULT state/); assert.match(p, /runs in the browser/); assert.match(p, /READ fail/);
  assert.match(p, /grade-acceptance\.mjs/); assert.match(p, /Acceptance-test gate: PASS/); assert.match(p, /NEW-HOOKS/);
  assert.match(p, /EXCLUDED/); assert.match(p, /cut off/);
});
test("Dev gets a build brief on ai:build/ai:fix issues only", () => {
  const d = agentInfo("dev-coder");
  assert.match(buildPrompt({ agent: d, number: 46, isPR: false, repo: "o/r", stage: "ai:build" }), /Run the locked spec once BEFORE/);
  assert.match(buildPrompt({ agent: d, number: 46, isPR: false, repo: "o/r", stage: "ai:fix" }), /35 minutes/);
  assert.doesNotMatch(buildPrompt({ agent: agentInfo("quinn-qa"), number: 46, isPR: true, repo: "o/r", stage: "ai:qa" }), /BEFORE changing code/);
  assert.ok(buildBrief(9).includes("#9"));
});
test("an explicit free model overrides the stage default", () => {
  assert.equal(route({ labels: ["ai:tests"], engines: freeOnly, freeModel: "groq/openai/gpt-oss-120b@medium" }).free_model, "groq/openai/gpt-oss-120b@medium");
  assert.equal(route({ labels: ["ai:tests"], engines: freeOnly }).free_model, FREE_MODELS.builder);
});
test("v3: QA stages carry seats, onboarding + handover rules, and the right brief", () => {
  assert.equal(route({ labels: ["ai:tests-review"], engines: freeOnly }).seat, "challenger");
  assert.equal(route({ labels: ["ai:tests-signoff"], engines: freeOnly }).seat, "accountable");
  assert.equal(STAGE_SEAT["ai:tests"], "author");
  const q = agentInfo("quinn-qa"), a = agentInfo("arjun-cpto");
  const ch = buildPrompt({ agent: q, number: 42, isPR: false, repo: "o/r", stage: "ai:tests-review", featureSlug: "registration" });
  assert.ok(ch.includes("compact onboarding pack is embedded below in this initial prompt")); assert.ok(ch.includes("Do not attempt to access `/tmp/onboarding.md`")); assert.match(ch, /handoff\.mjs template ai:tests-review quinn-qa/); assert.match(ch, /handoff\.mjs validate <path>/); assert.match(ch, /Do NOT edit the spec/); assert.match(ch, /would still pass if the feature were built wrong/);
  const so = buildPrompt({ agent: a, number: 42, isPR: false, repo: "o/r", stage: "ai:tests-signoff" });
  assert.match(so, /Verdict: APPROVE/); assert.match(so, /Memory proposals/); assert.match(so, /ai:founder-decision/);
  assert.match(buildPrompt({ agent: q, number: 42, isPR: false, repo: "o/r", stage: "ai:tests" }), /challenger or CPTO verdict of CHANGES/);
});

test("policy: canonical autonomy policy is the engine source of truth and remains fail-closed", () => {
  assert.deepEqual(ALLOWED_ENGINES, autonomyPolicy.execution.allowedEngines);
  assert.equal(autonomyPolicy.execution.backgroundEnabled, true);
  assert.equal(autonomyPolicy.execution.allowPaidFallback, false);
  assert.equal(autonomyPolicy.execution.requirePrivateRepositoriesForConfidentialCode, true);
});

test("policy: paid engines never run, even when connected or labelled", () => {
  assert.deepEqual(ALLOWED_ENGINES, ["free"]);
  for (const labels of [["ai:build"], ["ai:build", "engine:claude"], ["ai:review", "engine:codex"]]) {
    assert.equal(policyRoute({ labels, isPR: true, engines: all }).engine, "free");
    assert.equal(policyRoute({ labels, isPR: true, engines: both }).action, "pause");
  }
});
test("policy: model overrides are restricted to the approved free-provider allowlist", () => {
  assert.equal(policyRoute({ labels: ["ai:tests"], engines: freeOnly, freeModel: "groq/openai/gpt-oss-120b@medium" }).free_model, "groq/openai/gpt-oss-120b@medium");
  assert.equal(policyRoute({ labels: ["ai:build"], engines: freeOnly, freeProviders: { groq: true, nvidia: true }, supervisedTrial: true, freeModel: FREE_MODELS.nvidiaBuilder }).free_model, FREE_MODELS.nvidiaBuilder);
  for (const freeModel of ["openrouter/vendor/paid-model", "nvidia_nim/a/b", "deepseek/deepseek-chat", "groq/openai/paid-model", "groq/qwen/qwen3.8-27b MODEL=other"])
    assert.equal(policyRoute({ labels: ["ai:build"], engines: freeOnly, freeModel }).free_model, FREE_MODELS.builder);
});

test("policy: enabled background stages run only on the approved free engine", () => {
  for (const s of ["ai:discovery", "ai:plan", "ai:tests", "ai:tests-review", "ai:tests-signoff", "ai:build", "ai:qa", "ai:review", "ai:fix"]) {
    const r = policyRoute({ labels: [s], engines: all });
    assert.equal(r.action, "run", s);
    assert.equal(r.engine, "free", s);
    assert.ok(r.free_model === FREE_MODELS.builder || r.free_model === FREE_MODELS.reviewer, s);
  }
});

// A syntactically valid free model is still inadmissible for an incompatible seat.
test("independent review cannot be overridden to either builder family", () => {
  for (const stage of ["ai:tests-review", "ai:qa", "ai:review"]) {
    for (const freeModel of [FREE_MODELS.builder, FREE_MODELS.builder + "@high", FREE_MODELS.nvidiaBuilder]) {
      const r = route({ labels: [stage], engines: freeOnly, freeProviders: { groq: true, nvidia: true }, freeModel });
      assert.equal(r.free_model, FREE_MODELS.reviewer, stage + ": " + freeModel);
      assert.equal(r.free_model_override_rejected, true);
    }
  }
});
test("test authors and implementation seats cannot use the independent reviewer family", () => {
  for (const stage of ["ai:tests", "ai:build", "ai:fix", "ai:database", "ai:integration"]) {
    for (const freeModel of [FREE_MODELS.reviewer, FREE_MODELS.reviewer + "@medium"]) {
      const r = route({ labels: [stage], engines: freeOnly, freeModel });
      assert.equal(r.free_model, FREE_MODELS.builder, stage);
      assert.equal(r.free_model_override_rejected, true);
    }
  }
});
test("review pauses rather than taking a connected NVIDIA builder when Groq is unavailable", () => {
  const r = route({ labels: ["ai:review"], engines: freeOnly, freeProviders: { groq: false, nvidia: true }, freeModel: FREE_MODELS.nvidiaBuilder });
  assert.equal(r.action, "pause");
  assert.equal(r.free_model, undefined);
});
test("a reviewer may choose supported reasoning effort on its own model", () => {
  const r = route({ labels: ["ai:review"], engines: freeOnly, freeModel: FREE_MODELS.reviewer + "@high" });
  assert.equal(r.free_model, FREE_MODELS.reviewer + "@high");
  assert.equal(r.free_model_override_rejected, false);
});

// Every named role has an actionable quality method, not just a label and model.
test("all 11 roles get a focused quality method on an actual free route", () => {
  const roles = new Set();
  for (const [stage, slug] of Object.entries(STAGE_ROLE)) {
    const routed = route({ labels: [stage], engines: freeOnly });
    assert.equal(routed.action, "run", stage);
    assert.equal(routed.role, slug);
    const prompt = buildPrompt({ agent: agentInfo(slug), number: 19, isPR: false, repo: "example/synthetic", stage });
    assert.match(prompt, /Role quality method:/, slug);
    roles.add(slug);
  }
  assert.equal(roles.size, 11);
});
test("readonly reviewer prompts do not ask the agent to post, push or advance state", () => {
  for (const stage of ["ai:review", "ai:tests-review", "ai:tests-signoff", "ai:tests", "ai:build"]) {
    const prompt = buildPrompt({ agent: agentInfo(STAGE_ROLE[stage]), number: 7, isPR: true, repo: "example/synthetic", stage, toolMode: "readonly", featureSlug: "synthetic" });
    assert.match(prompt, /workflow.*publish/i);
    assert.doesNotMatch(prompt, /Finish by commenting|Post the verdict directly|Comment on the contract PR|commit and push|Open the contract PR|handoff\\.mjs template/);
  }
});

test("NVIDIA evaluation credentials cannot select unattended product builder inference", () => {
  const providers = { groq: true, nvidia: true };
  const r = route({ labels: ["ai:build"], engines: freeOnly, freeProviders: providers, freeModel: FREE_MODELS.nvidiaBuilder });
  assert.equal(r.free_model, FREE_MODELS.builder);
  assert.equal(r.free_model_override_rejected, true);
  const p = route({ labels: ["ai:build"], engines: freeOnly, freeProviders: { groq: false, nvidia: true } });
  assert.equal(p.action, "pause");
});
test("validated read-only synthetic smoke can still use NVIDIA; ordinary readonly is not enough", () => {
  const providers = { groq: true, nvidia: true };
  const base = { labels: ["ai:discovery"], engines: freeOnly, freeProviders: providers };
  assert.equal(route(base).free_model, FREE_MODELS.builder);
  assert.equal(route({ ...base, syntheticSmoke: true }).free_model, FREE_MODELS.nvidiaBuilder);
  assert.equal(route({ ...base, labels: ["ai:build"], syntheticSmoke: true }).free_model, FREE_MODELS.builder);
});

test("qualified 20B route is restricted to manually dispatched F010 discovery, no implicit fallback", () => {
 const pilotContext={repo:"appsworld2027/parent-plus-ai-org",issueNumber:"170",workflow:"AI agents",event:"workflow_dispatch",ref:"audit/f010-pilot-20261128",toolMode:"standard"};
 const base={labels:["ai:discovery"],engines:freeOnly,freeProviders:{groq:true,nvidia:true}};
 assert.equal(route({...base,pilotContext}).free_model,"groq/openai/gpt-oss-20b");
 assert.equal(route({...base,pilotContext}).strategy_packet_completion_cap,1800);
 assert.equal(route({...base,pilotContext}).strategy_worker_output_cap,512);
 for (const [k,v] of Object.entries({repo:"elsewhere/product",issueNumber:"171",workflow:"Role qualification",event:"issues",ref:"main",toolMode:"readonly"})) {
   assert.equal(route({...base,pilotContext:{...pilotContext,[k]:v}}).free_model,"groq/openai/gpt-oss-120b");
 }
 assert.equal(route({...base,pilotContext,labels:["ai:build"]}).free_model,"groq/openai/gpt-oss-120b");
 assert.equal(route({...base,pilotContext,labels:["ai:review"]}).free_model,"groq/qwen/qwen3.8-27b");
 assert.equal(route({...base,pilotContext,freeProviders:{groq:false,nvidia:true}}).action,"pause");
});
