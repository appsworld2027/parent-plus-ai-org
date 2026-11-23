#!/usr/bin/env node
// Decides which agent (and engine) should act on an issue/PR, based on its ai:* stage label.
// Pure logic + a small CLI used by .github/workflows/agent-worker.yml.
// CLI: node agent-router.mjs --labels "ai:build,engine:codex" [--pr] [--body-file f] [--number N] [--repo o/r]
//      env ENGINE_CLAUDE / ENGINE_CODEX / ENGINE_FREE = "true" when that engine's secret exists.
import { readFileSync, appendFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const AGENTS_DIR = fileURLToPath(new URL("../org/agents/", import.meta.url));

export const STAGE_ROLE = {
  "ai:discovery": "maya-ai-pm",
  "ai:plan": "arjun-cpto",
  "ai:tests": "quinn-qa",
  "ai:build": "dev-coder",
  "ai:qa": "quinn-qa",
  "ai:review": "rex-reviewer",
  "ai:fix": "dev-coder",
};
// No agent: founder gates, blocked items, and loop-controller stages (scripts/loop.mjs drives them).
const NO_AGENT = ["ai:founder-decision", "ai:founder-test", "ai:blocked", "ai:release", "ai:delivery", "ai:contract"];
const STAGE_ORDER = [...NO_AGENT, ...Object.keys(STAGE_ROLE)];

// Engine preference when no engine:* label is set: paid subscriptions first, then the free engine.
export const ENGINES = ["claude", "codex", "free"];

// Free engine = Claude Code through Free Claude Code (FCC) on free NVIDIA NIM models.
// Measured 2026-11-20 from GitHub runners: Nemotron 3 Ultra and Mistral Large 4 answer in ~1s and pass
// Claude Code tool use; Kimi K3.1 Pro passes but queues 20-90s per call.
export const FREE_MODELS = {
  builder: "nvidia_nim/nvidia/nemotron-3-ultra-550b-a55b",
  reviewer: "nvidia_nim/mistralai/mistral-large-4-1t-a52b",
};
const REVIEW_ROLES = ["quinn-qa", "rex-reviewer"];

export function agentInfo(slug, dir = AGENTS_DIR) {
  const raw = readFileSync(`${dir}${slug}.md`, "utf8");
  const meta = Object.fromEntries(raw.split("\n---")[0].split("\n").filter((l) => l.includes(":")).map((l) => {
    const i = l.indexOf(":"); return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
  }));
  return { slug, name: meta.name, role: meta.role, model: meta.model };
}

export function route({ labels = [], body = "", isPR = false, engines = { claude: false, codex: false, free: false }, freeModel = "" }) {
  const stage = STAGE_ORDER.find((s) => labels.includes(s));
  if (!stage) return { action: "skip", reason: "no ai:* stage label" };
  if (NO_AGENT.includes(stage)) return { action: "skip", stage, reason: `${stage} waits for a founder or a project manager` };

  let role = STAGE_ROLE[stage];
  if (stage === "ai:build" || stage === "ai:fix") {
    const owner = (body.match(/^\s*Owner:\s*(\w+)/im) || [])[1]?.toLowerCase();
    if (owner === "tara") role = "tara-database";
    if (owner === "ravi") role = "ravi-integration";
  }

  const wanted = ENGINES.find((e) => labels.includes(`engine:${e}`)) || null;
  let preferred = wanted || ENGINES.find((e) => engines[e]) || "claude";
  // Independence: QA and review prefer an engine that did NOT author the PR.
  if ((stage === "ai:qa" || stage === "ai:review") && isPR && wanted) {
    preferred = ENGINES.filter((e) => e !== wanted).find((e) => engines[e]) || wanted;
  }
  const engine = engines[preferred] ? preferred : ENGINES.find((e) => engines[e]) || null;

  if (!engine) return { action: "pause", stage, role, reason: "no Claude, Codex or free engine is connected" };
  const out = { action: "run", stage, role, engine, fallback: engine !== preferred };
  // Writing tests is authoring work: use the faster builder model. Verdicts (ai:qa, ai:review) stay on the reviewer model,
  // so the code is still judged by a different model than the one that wrote it. (2026-11-23: Quinn on the reviewer model
  // made 52 tool calls in 50 minutes and timed out on #42; the builder model averaged ~10 s per call on #37.)
  if (engine === "free") out.free_model = REVIEW_ROLES.includes(role) && stage !== "ai:tests" ? FREE_MODELS.reviewer : FREE_MODELS.builder;
  if (engine === "free" && freeModel) out.free_model = freeModel; // explicit override (model trials, manifest choice)
  return out;
}

// Focused brief for the ai:tests stage (writing locked acceptance tests). Product-agnostic: paths come from the
// product's .ai-org/manifest.json. Written after the first real run explored for 50 minutes and wrote nothing.
export function testsBrief(number) {
  return [
    "## This run: write the locked acceptance tests (stage `ai:tests`) — work in this order",
    "a. Read ONLY: the approved contract (`docs/product/<slug>/ACCEPTANCE.md` on branch `ai/contract-<slug>`), ONE existing spec in the locked folder (`.ai-org/manifest.json` → `loop.lockedPaths`) as your pattern, and the test-support files that spec imports. Do not read dependency source code (`node_modules`), other PRs or unrelated app screens.",
    "b. Write a first version of `<locked folder>/<slug>.spec.ts` early and push it so nothing is lost: one test per AC ID, title starting with the ID. Speed never beats correctness: the run is only done when the gate in step d passes. Set up data through the test fixtures' existing in-page state exactly as the pattern spec does. Change NOTHING outside the locked folder — contract-lock rejects a contract PR that touches other files; if a fixture lacks something, list it in the PR body for Dev.",
    "c. Type-check (`npx tsc --noEmit`), then commit and push to the contract branch at once. Never push to `main`.",
    "   Before writing, learn the fixture's DEFAULT state: open the fixture file and note what data exists before any test changes it (for example a sample record that already triggers the feature or blocks an 'empty' state). Every test must start from a state the contract describes, so neutralise defaults the test does not want.",
    "   Code passed to `page.evaluate` / `addInitScript` runs in the browser: it cannot see variables from the test file unless you pass them as the argument.",
    "   To make a READ fail or stall (loading, error, offline ACs), intercept the network for that read (wrap `window.fetch` in an init script, or `page.route`). Fixture switches named for writes (save/create/record) do not affect reads.",
    "   A test that something is EXCLUDED (archived, ended, voided, due today…) must also add one genuinely counted case, so it fails today and proves the exclusion once the feature exists; an exclusion test that passes on today's app tests nothing. GUARD is only for behaviour the app already has and must keep (at most a quarter of the tests).",
    "   Read test output through the gate, not the raw log: long Playwright output is cut off in your tool results, so errors at the end (often the crashes) are invisible to you.",
    "   Start the file with `// NEW-HOOKS: a | b | /regex/` listing every new text, accessible name or testID the feature adds (the things your tests wait for). Put `// GUARD: <why>` above a test that already passes today on purpose, and `// RED-BECAUSE: <why>` above a test that fails on existing UI for a stated reason. Use stable testIDs or accessible names for new UI, and say which ones in the PR so Dev builds them.",
    "d. Run the spec with the gate, not by eye: `npx playwright test <spec> --reporter=json --timeout=20000 > /tmp/acc.json; node .ai-org-handbook/scripts/grade-acceptance.mjs --spec <spec> --report /tmp/acc.json --contract docs/product/<slug>/ACCEPTANCE.md --src src --md /tmp/gate.md`. It must print `Acceptance-test gate: PASS`. If it fails, fix the tests it names (crash, setup mistake, vacuous pass) and run it again. Never claim a result the gate did not print.",
    `e. Open the contract PR from the contract branch to \`main\`: label \`ai:contract\`, body starting \`Closes #${number}\`, then the full contents of /tmp/gate.md, then any fixture gaps for Dev. Then remove \`ai:tests\` from #${number}.`,
  ].join("\n");
}

// Focused brief for Dev on ai:build / ai:fix: run the locked spec first, change only what makes it pass, stop early when stuck.
export function buildBrief(number) {
  return [
    "## This run: make the locked acceptance tests pass (stage `ai:build` / `ai:fix`) — work in this order",
    "a. Read the issue, the contract (`docs/product/<slug>/ACCEPTANCE.md`) and the locked spec header (`// NEW-HOOKS:` lists exactly which texts / testIDs your UI must expose). Run the locked spec once BEFORE changing code to see the starting failures (`npx playwright test <spec> --reporter=line --timeout=20000`).",
    "b. Fix one group of failing tests at a time, re-running only the spec. Never edit, skip or weaken anything in the locked folder. If a test looks wrong, stop and comment on the issue with the exact test, the assertion and why — the loop sends it back to Quinn; do not work around it.",
    "c. Test-support fixtures outside the locked folder may be extended when the spec needs data they cannot serve (say so in the PR).",
    "d. Commit and push to your build branch after every group that turns green, so progress is never lost. Before 35 minutes have passed, open (or update) the PR even if some tests still fail, with a table of which AC IDs pass and which fail and why, and label it `ai:qa` only when all pass; otherwise leave it unlabelled and comment on the issue.",
    `e. Done = the locked spec and \`npm run check\` pass; quote both result lines in the PR (base = the contract branch, body starting \`Closes #${number}\`).`,
  ].join("\n");
}

export function buildPrompt({ agent, number, isPR, repo, stage = "" }) {
  const kind = isPR ? "pull request" : "issue";
  const cli = isPR ? "gh pr" : "gh issue";
  const extra = agent.slug === "maya-ai-pm" ? " and `.ai-org-handbook/playbooks/ai-pm.md` and `.ai-org-handbook/playbooks/feature-contract.md`" : agent.slug === "quinn-qa" ? " and `.ai-org-handbook/playbooks/qa-charter.md`" : "";
  return [
    `You are ${agent.name}, the ${agent.role} of the AppsWorld AI Organization, running as a background worker in GitHub Actions on ${repo}.`,
    `1. Read \`.ai-org-handbook/AGENTS.md\`, then \`.ai-org-handbook/org/agents/${agent.slug}.md\`${extra}. Follow them exactly.`,
    `2. Read ${kind} #${number} and all its comments with \`${cli} view ${number} --comments\`.`,
    `3. Do your role's job for this ${kind} only. Keep changes small and reversible. Run the repo's checks before claiming anything.`,
    `4. Finish by commenting on #${number}, starting with "[${agent.name} — ${agent.role}]": what you did, evidence links, and any decision with options and one Recommended choice.`,
    `5. Move the stage label as your role file says (\`${cli} edit ${number} --add-label … --remove-label …\`).`,
    `6. Never print secrets. Never contact the founder except through ai:founder-decision or ai:founder-test issues.`,
    ...(stage === "ai:tests" ? ["", testsBrief(number)] : []),
    ...((stage === "ai:build" || stage === "ai:fix") && !isPR ? ["", buildBrief(number)] : []),
  ].join("\n");
}

export const PAUSE_MARKER = "<!-- ai-org:paused -->";
export function pauseComment({ agent, stage }) {
  return `${PAUSE_MARKER}\n**[${agent.name} — ${agent.role}] Paused.** This item is at \`${stage}\`, but no Claude, Codex or free engine is connected yet, so no agent can work on it.\n\nIt will be picked up automatically once an engine secret is added (see FOUNDER_INTERFACE.md). Nothing is lost.`;
}

// ---- CLI ----
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const arg = (n) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : undefined; };
  const labels = (arg("labels") || "").split(",").map((s) => s.trim()).filter(Boolean);
  const bodyFile = arg("body-file");
  const isPR = process.argv.includes("--pr");
  const r = route({
    labels, isPR, body: bodyFile && existsSync(bodyFile) ? readFileSync(bodyFile, "utf8") : "",
    freeModel: process.env.FREE_MODEL_OVERRIDE || "", engines: { claude: process.env.ENGINE_CLAUDE === "true", codex: process.env.ENGINE_CODEX === "true", free: process.env.ENGINE_FREE === "true" },
  });
  const out = { ...r };
  if (r.role) {
    const agent = agentInfo(r.role);
    Object.assign(out, { agent_name: agent.name, agent_role: agent.role, model: agent.model });
    if (r.action === "run") out.prompt = buildPrompt({ agent, number: arg("number"), isPR, repo: arg("repo"), stage: r.stage });
    if (r.action === "pause") out.pause_comment = pauseComment({ agent, stage: r.stage });
  }
  console.log(JSON.stringify({ ...out, prompt: out.prompt ? "(set)" : undefined, pause_comment: out.pause_comment ? "(set)" : undefined }));
  if (process.env.GITHUB_OUTPUT) {
    for (const [k, v] of Object.entries(out)) {
      if (v === undefined) continue;
      const d = `EOF_${Math.random().toString(36).slice(2)}`;
      appendFileSync(process.env.GITHUB_OUTPUT, `${k}<<${d}\n${v}\n${d}\n`);
    }
  }
}
