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
  "ai:build": "dev-coder",
  "ai:qa": "quinn-qa",
  "ai:review": "rex-reviewer",
  "ai:fix": "dev-coder",
};
const NO_AGENT = ["ai:founder-decision", "ai:founder-test", "ai:blocked"];
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

export function route({ labels = [], body = "", isPR = false, engines = { claude: false, codex: false, free: false } }) {
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
  if (engine === "free") out.free_model = REVIEW_ROLES.includes(role) ? FREE_MODELS.reviewer : FREE_MODELS.builder;
  return out;
}

export function buildPrompt({ agent, number, isPR, repo }) {
  const kind = isPR ? "pull request" : "issue";
  const cli = isPR ? "gh pr" : "gh issue";
  const extra = agent.slug === "maya-ai-pm" ? " and `.ai-org-handbook/playbooks/ai-pm.md`" : "";
  return [
    `You are ${agent.name}, the ${agent.role} of the AppsWorld AI Organization, running as a background worker in GitHub Actions on ${repo}.`,
    `1. Read \`.ai-org-handbook/AGENTS.md\`, then \`.ai-org-handbook/org/agents/${agent.slug}.md\`${extra}. Follow them exactly.`,
    `2. Read ${kind} #${number} and all its comments with \`${cli} view ${number} --comments\`.`,
    `3. Do your role's job for this ${kind} only. Keep changes small and reversible. Run the repo's checks before claiming anything.`,
    `4. Finish by commenting on #${number}, starting with "[${agent.name} — ${agent.role}]": what you did, evidence links, and any decision with options and one Recommended choice.`,
    `5. Move the stage label as your role file says (\`${cli} edit ${number} --add-label … --remove-label …\`).`,
    `6. Never print secrets. Never contact the founder except through ai:founder-decision or ai:founder-test issues.`,
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
    engines: { claude: process.env.ENGINE_CLAUDE === "true", codex: process.env.ENGINE_CODEX === "true", free: process.env.ENGINE_FREE === "true" },
  });
  const out = { ...r };
  if (r.role) {
    const agent = agentInfo(r.role);
    Object.assign(out, { agent_name: agent.name, agent_role: agent.role, model: agent.model });
    if (r.action === "run") out.prompt = buildPrompt({ agent, number: arg("number"), isPR, repo: arg("repo") });
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
