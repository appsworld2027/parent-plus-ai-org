#!/usr/bin/env node
// handoff — structured handover packets between AI Org agents (AI Org v3, ITER18-PPDEV). Product-agnostic.
// Every agent ends its run by writing docs/product/<slug>/handoffs/NN-<stage>-<role>.md with fixed sections.
// The worker validates it; a missing or empty section fails the run so context is never silently lost.
// Usage: node handoff.mjs validate <file>        -> exit 1 with the missing sections
//        node handoff.mjs latest <dir>            -> prints the newest packet path
//        node handoff.mjs template <stage> <role> -> prints an empty packet to fill in
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";

// True when this file is the program being run (also through symlinked paths such as a mounted handbook).
function isMain(url) { try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(url)); } catch { return false; } }

export const SECTIONS = [
  ["Understanding", "5 lines: goal · constraints · known traps · what I must not touch · how I prove it is done"],
  ["Done", "what was produced, with evidence (commit SHA, gate report, command + result line)"],
  ["Decisions", "choices made and why"],
  ["Assumptions", "each one marked VERIFIED (how) or UNVERIFIED"],
  ["Traps", "things the next role will trip on (fixtures, timing, data defaults…)"],
  ["Next must", "exact instructions for the next role"],
  ["Next must not", "boundaries for the next role"],
  ["Open questions", "addressed to a named role, or 'none'"],
  ["Memory proposals", "lessons worth keeping for future features, each with its evidence, or 'none'"],
  ["Session lifecycle", "CONTINUE / COMPACT / SWITCH / ESCALATE with brief evidence; unavailable metrics stated explicitly"],
  ["Persistence", "durable checkpoint location and verified commit/link, or portable handover and explicit persistence limitation"],
  ["Resources and next action", "measured resources or unavailable, plus the exact next eligible task"],
];
const EMPTY = /^(\s*(-\s*)?(tbd|todo|n\/a|\.\.\.|…)?\s*)$/i;

export function parsePacket(md = "") {
  const out = {}; let cur = null;
  for (const line of md.split("\n")) {
    const h = line.match(/^##\s+(.+?)\s*$/);
    if (h) { cur = SECTIONS.map(([n]) => n).find((n) => n.toLowerCase() === h[1].toLowerCase()) || null; if (cur) out[cur] = []; continue; }
    if (cur) out[cur].push(line);
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join("\n").trim()]));
}
export function validatePacket(md = "") {
  const p = parsePacket(md), problems = [];
  if (!/^#\s+Handover\b/m.test(md)) problems.push("first heading must be '# Handover — <stage> — <role>'");
  for (const [name] of SECTIONS) {
    if (!(name in p)) problems.push(`missing section '## ${name}'`);
    else if (p[name].split("\n").every((l) => EMPTY.test(l))) problems.push(`section '## ${name}' is empty`);
  }
  const u = p.Understanding || "";
  if (u && u.split("\n").filter((l) => l.trim()).length < 5) problems.push("'## Understanding' needs 5 lines (goal, constraints, traps, must not touch, proof)");
  if (p.Done && !/[0-9a-f]{7,40}|PASS|passed|exit 0|https?:\/\//i.test(p.Done)) problems.push("'## Done' has no evidence (commit SHA, gate result, command result or link)");
  if (p.Assumptions && !/\b(VERIFIED|UNVERIFIED|none)\b/.test(p.Assumptions)) problems.push("'## Assumptions' must mark each item VERIFIED or UNVERIFIED (or say none)");
  if (p["Session lifecycle"] && !/\b(CONTINUE|COMPACT|SWITCH|ESCALATE)\b/.test(p["Session lifecycle"])) problems.push("'## Session lifecycle' must record CONTINUE, COMPACT, SWITCH, or ESCALATE");
  if (p.Persistence && !((/\bVERIFIED\b/i.test(p.Persistence) && /[0-9a-f]{7,40}|https?:\/\/|refs\/heads\//i.test(p.Persistence)) || (/\bUNAVAILABLE\b/i.test(p.Persistence) && /portable handover/i.test(p.Persistence)))) problems.push("'## Persistence' must cite a durable checkpoint or state UNAVAILABLE and provide a portable handover");
  if (p["Resources and next action"] && !(/\b(unavailable|not reported|measured)\b/i.test(p["Resources and next action"]) && /next action\s*:/i.test(p["Resources and next action"]))) problems.push("'## Resources and next action' must state resource measurement availability and an exact 'Next action:'");
  return { ok: problems.length === 0, problems, packet: p };
}
export function template(stage, role) {
  return [`# Handover — ${stage} — ${role}`, "", ...SECTIONS.flatMap(([n, hint]) => [`## ${n}`, `<!-- ${hint} -->`, ""])].join("\n");
}
export function packetsIn(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => /^\d{2}-.+\.md$/.test(f)).sort().map((f) => join(dir, f));
}

if (isMain(import.meta.url)) {
  const [cmd, a, b] = process.argv.slice(2);
  if (cmd === "validate") {
    const r = validatePacket(readFileSync(a, "utf8"));
    console.log(r.ok ? `handover OK: ${a}` : `handover INVALID: ${a}\n- ${r.problems.join("\n- ")}`);
    process.exit(r.ok ? 0 : 1);
  } else if (cmd === "latest") { const all = packetsIn(a); console.log(all.at(-1) || ""); }
  else if (cmd === "template") console.log(template(a, b));
  else { console.error("usage: handoff.mjs validate <file> | latest <dir> | template <stage> <role>"); process.exit(2); }
}
