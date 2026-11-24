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
export function buildPack({ role, stage, slug, seat = "", handbook = ".ai-org-handbook", product = ".", feature = "", attempt = "", task = "", max = 60000 }) {
  const manifest = (() => { try { return JSON.parse(read(join(product, ".ai-org/manifest.json"))); } catch { return {}; } })();
  const docs = manifest?.product?.docsFolder || "docs/product";
  const memDir = join(product, manifest?.memory?.folder || "docs/ai-memory");
  const memory = existsSync(memDir) ? readdirSync(memDir).filter((f) => f.endsWith(".md")).sort()
    .map((f) => `### ${f}\n${read(join(memDir, f)).trim()}`).join("\n\n") : "";
  const featureDir = feature || join(product, docs, slug || "_none_");
  const handoffDir = join(featureDir, "handoffs");
  const handoffs = packetsIn(handoffDir).map((p) => `### ${p.split("/").pop()}\n${read(p).trim()}`).join("\n\n");
  const parts = [
    ["1. Your role and RACI", 6000, `${read(join(handbook, "org/agents", `${role}.md`)).trim()}\n\n${seat ? `**Your seat in this stage: ${seat}.**\n\n` : ""}${raciText(raciFor(manifest, stage), raciStage(stage))}`],
    ["2. Lessons for your role (from earlier features)", 6000, read(join(handbook, "org/lessons", `${role}.md`)).trim() || "none yet"],
    ["3. Product memory (verified facts about this product)", 20000, memory || "none yet"],
    ["4. Feature contract and handovers so far", 20000, `${slug ? read(join(featureDir, "ACCEPTANCE.md")).trim() || "no contract file" : "no feature slug"}\n\n${handoffs || "No handovers yet — you are the first role on this feature."}`],
    ["5. Previous attempt (why it failed — do not repeat it)", 6000, read(attempt).trim() || "First attempt."],
    ["6. Your task now", 8000, read(task).trim() || "See the issue."],
  ];
  let body = parts.map(([h, n, t]) => `## ${h}\n\n${cap(t, n)}`).join("\n\n");
  body = cap(`# Onboarding pack — ${role} — ${stage}${slug ? ` — ${slug}` : ""}\n\nRead all of this before acting. Your first output must be the 5-line Understanding (goal · constraints · known traps · what you must not touch · how you will prove it is done).\n\n${body}`, max);
  return body;
}

if (isMain(import.meta.url)) {
  const arg = (n, d = "") => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
  const pack = buildPack({ role: arg("role"), stage: arg("stage"), slug: arg("slug"), seat: arg("seat"), feature: arg("feature"), attempt: arg("attempt"),
    task: arg("task"), handbook: arg("handbook", ".ai-org-handbook"), product: arg("product", "."), max: Number(arg("max", "60000")) });
  if (arg("out")) writeFileSync(arg("out"), pack + "\n"); else console.log(pack);
}
