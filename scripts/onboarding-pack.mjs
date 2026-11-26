#!/usr/bin/env node
// onboarding-pack — builds the context an agent reads FIRST, so no agent starts from zero (AI Org v3, ITER18-PPDEV).
// Product-agnostic: paths come from the product's .ai-org/manifest.json. Runs in the product checkout with the
// handbook at .ai-org-handbook/. Sections in priority order, each capped, whole pack capped.
//   1. Role card + RACI row for this stage            (handbook org/agents/<role>.md, manifest raci)
//   2. Role lessons                                     (handbook org/lessons/<role>.md)
//   3. Product memory                                   (product docs/ai-memory/*.md)
//   4. Feature contract + every handover so far         (docs/product/<slug>/ACCEPTANCE.md, handoffs/)
//   5. Attempt memory: why the previous run failed      (--attempt <file>, written by the worker)
//   6. The exact task                                   (--task <file>)
// Usage: node onboarding-pack.mjs --role quinn-qa --stage ai:tests --slug <slug> [--seat author|challenger] [--feature <dir>]
//        [--attempt f] [--task f] [--out f] [--max 60000]
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
export function buildPack({ role, stage, slug, seat = "", handbook = ".ai-org-handbook", product = ".", feature = "", attempt = "", task = "", max = 12000 }) {
  const manifest = (() => { try { return JSON.parse(read(join(product, ".ai-org/manifest.json"))); } catch { return {}; } })();
  const docs = manifest?.product?.docsFolder || "docs/product";
  const memDir = join(product, manifest?.memory?.folder || "docs/ai-memory");
  // Memory is an index, not a bulk dump. The agent reads only a relevant memory file on demand.
  const memoryFiles = slug && existsSync(memDir) ? readdirSync(memDir).filter((f) => f.endsWith(".md")).sort() : [];
  const memory = memoryFiles.length
    ? memoryFiles.slice(0, 12).map((f) => `- ${f}`).join("\n") + "\nRead only the relevant memory file if this task needs it."
    : "No product memory loaded. Read a relevant memory file only if the task requires it.";
  const featureDir = feature || join(product, docs, slug || "_none_");
  const handoffDir = join(featureDir, "handoffs");
  const handoffs = packetsIn(handoffDir).slice(-2).map((p) => `### ${p.split("/").pop()}\n${cap(read(p).trim(), 900)}`).join("\n\n");
  const contract = slug ? cap(read(join(featureDir, "ACCEPTANCE.md")).trim() || "no contract file", 2600) : "no feature slug";
  const parts = [
    ["1. Your role and RACI", 3000, `${read(join(handbook, "org/agents", `${role}.md`)).trim()}\n\n${seat ? `**Your seat in this stage: ${seat}.**\n\n` : ""}${raciText(raciFor(manifest, stage), raciStage(stage))}`],
    ["2. Your task now", 1500, read(task).trim() || "Read the issue and its comments."],
    ["3. Feature contract and latest handovers", 3500, `${contract}\n\n${handoffs || "No handovers yet — you are the first role on this feature."}`],
    ["4. Previous attempt", 1000, read(attempt).trim() || "First attempt."],
    ["5. Lessons for your role", 800, read(join(handbook, "org/lessons", `${role}.md`)).trim() || "No role-specific lessons yet."],
    ["6. Product memory index", 500, memory],
  ];
  let body = parts.map(([h, n, t]) => `## ${h}\n\n${cap(t, n)}`).join("\n\n");
  body = cap(`# Onboarding pack — ${role} — ${stage}${slug ? ` — ${slug}` : ""}\n\nRead this compact context before acting. Open referenced source files only when they are relevant. Your first output must be the 5-line Understanding (goal · constraints · known traps · what you must not touch · how you will prove it is done).\n\n${body}`, max);
  return body;
}

if (isMain(import.meta.url)) {
  const arg = (n, d = "") => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
  const pack = buildPack({ role: arg("role"), stage: arg("stage"), slug: arg("slug"), seat: arg("seat"), feature: arg("feature"), attempt: arg("attempt"),
    task: arg("task"), handbook: arg("handbook", ".ai-org-handbook"), product: arg("product", "."), max: Number(arg("max", "60000")) });
  if (arg("out")) writeFileSync(arg("out"), pack + "\n"); else console.log(pack);
}
