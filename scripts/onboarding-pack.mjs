#!/usr/bin/env node
// onboarding-pack — builds the context an agent reads FIRST, so no agent starts from zero (AI Org v3, ITER18-PPDEV).
// Product-agnostic: paths come from the product's .ai-org/manifest.json. Runs in the product checkout with the
// handbook at .ai-org-handbook/. Sections are ordered by execution value and capped to protect free-tier context.
//   1. Exact task                                        (--task <file>)
//   2. Role card + RACI row for this stage               (handbook org/agents/<role>.md, manifest raci)
//   3. Feature contract + relevant handovers             (docs/product/<slug>/ACCEPTANCE.md, handoffs/)
//   4. Previous attempt: why the last run failed         (--attempt <file>, written by the worker)
//   5. Role lessons                                      (handbook org/lessons/<role>.md)
//   6. Product memory                                    (product docs/ai-memory/*.md)
// Usage: node onboarding-pack.mjs --role quinn-qa --stage ai:tests --slug <slug> [--seat author|challenger] [--feature <dir>]
//        [--attempt f] [--task f] [--out f] [--max 5000]
import { readFileSync, existsSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { packetsIn } from "./handoff.mjs";

// True when this file is the program being run (also through symlinked paths such as a mounted handbook).
function isMain(url) { try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(url)); } catch { return false; } }

const read = (p) => (existsSync(p) ? readFileSync(p, "utf8") : "");
const cap = (s, n) => (s.length <= n ? s : s.slice(0, n) + `\n\n[… cut at ${n} characters; open the file for the rest]`);

// One RACI row covers a whole stage family: ai:tests-review and ai:tests-signoff are seats in the ai:tests row.
export const raciStage = (stage = "") => stage.replace(/-(review|signoff)$/, "");
export function raciFor(manifest, stage) { return manifest?.raci?.[stage] || manifest?.raci?.[raciStage(stage)] || null; }
export function raciText(row, stage) {
  if (!row) return `No RACI row for ${stage} in .ai-org/manifest.json — single-agent stage.`;
  const f = (k) => (Array.isArray(row[k]) ? row[k].join(", ") : row[k] || "—");
  return [`| Stage | Responsible | Reviewer | Consulted | Accountable | Informed |`, `|---|---|---|---|---|---|`,
    `| ${stage} | ${f("responsible")} | ${f("reviewer")} | ${f("consulted")} | ${f("accountable")} | ${f("informed")} |`].join("\n");
}
export function buildPack({ role, stage, slug, seat = "", handbook = ".ai-org-handbook", product = ".", feature = "", attempt = "", task = "", max = 5000, readOnly = false }) {
  const manifest = (() => { try { return JSON.parse(read(join(product, ".ai-org/manifest.json"))); } catch { return {}; } })();
  const docs = manifest?.product?.docsFolder || "docs/product";
  const memDir = join(product, manifest?.memory?.folder || "docs/ai-memory");
  // Product memory is an index, not a bulk prompt. Agents open only the one file relevant to the task.
  const memoryFiles = existsSync(memDir) ? readdirSync(memDir).filter((f) => f.endsWith(".md")).sort().slice(0, 6) : [];
  const memory = memoryFiles.length
    ? memoryFiles.map((f) => `- ${f}`).join("\n") + "\nOpen only the relevant file when the task requires it."
    : "none yet";
  const featureDir = feature || (slug ? join(product, docs, slug) : "");
  const handoffDir = featureDir ? join(featureDir, "handoffs") : "";
  const handoffs = handoffDir && existsSync(handoffDir)
    ? packetsIn(handoffDir).slice(-2).map((p) => `### ${p.split("/").pop()}\n${cap(read(p).trim(), 450)}`).join("\n\n")
    : "";
  const handoverContext = slug
    ? (handoffs || "No handovers yet — you are the first role on this feature.")
    : "No feature slug is assigned yet. Never use `_none_`; do not create a handoff folder until a valid feature slug exists.";

  const parts = [
    ["1. Your task now", 1400, read(task).trim() || "See the issue."],
    ["2. Your role and RACI", 1800, `${read(join(handbook, "org/agents", `${role}.md`)).trim()}\n\n${seat ? `**Your seat in this stage: ${seat}.**\n\n` : ""}${raciText(raciFor(manifest, stage), raciStage(stage))}`],
    ["3. Feature contract and relevant handovers", 1200, `${slug ? read(join(featureDir, "ACCEPTANCE.md")).trim() || "no contract file" : "no feature slug"}\n\n${handoverContext}`],
    ["4. Previous attempt (why it failed — do not repeat it)", 300, read(attempt).trim() || "First attempt."],
    ["5. Lessons for your role (from earlier features)", 200, read(join(handbook, "org/lessons", `${role}.md`)).trim() || "none yet"],
    ["6. Product memory (verified facts about this product)", 100, memory || "none yet"],
  ];
  let body = parts.map(([h, n, t]) => `## ${h}\n\n${cap(t, n)}`).join("\n\n");
  const modeNote = readOnly ? "\n\n**READ-ONLY VALIDATION:** Do not modify files, issue labels, branches, commits, PRs or handoffs. Only post the specific issue comment requested by the task. The workflow owns stage transitions." : "";
  body = cap(`# Onboarding pack — ${role} — ${stage}${slug ? ` — ${slug}` : ""}\n\nRead all of this before acting. Your first output must be the 5-line Understanding (goal · constraints · known traps · what you must not touch · how you will prove it is done).${modeNote}\n\n${body}`, max);
  return body;
}

if (isMain(import.meta.url)) {
  const arg = (n, d = "") => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
  const pack = buildPack({ role: arg("role"), stage: arg("stage"), slug: arg("slug"), seat: arg("seat"), feature: arg("feature"), attempt: arg("attempt"),
    task: arg("task"), handbook: arg("handbook", ".ai-org-handbook"), product: arg("product", "."), max: Number(arg("max", "5000")), readOnly: process.argv.includes("--read-only") });
  if (arg("out")) writeFileSync(arg("out"), pack + "\n"); else console.log(pack);
}
