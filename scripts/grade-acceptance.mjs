#!/usr/bin/env node
// grade-acceptance — "red for the right reason" gate for locked acceptance tests (AI Org §7A, ITER15-PPDEV).
// Product-agnostic. Grades a Playwright spec written BEFORE the feature exists, from a Playwright JSON report of
// running it against the current app. A test may only:
//   OK      fail at a locator that names a NEW hook the spec declares (`// NEW-HOOKS:` header) and the app lacks;
//   OK      fail elsewhere only when the test explains why (`// RED-BECAUSE: …`);
//   OK      pass only as a declared guard rail (`// GUARD: …`) describing behaviour the app already has.
// Everything else fails the gate: crashes (ReferenceError, TypeError…), timeouts before any locator, unexplained
// failures on existing UI (usually a setup mistake), unexplained passes (vacuous), missing/duplicate AC IDs,
// skipped/focused tests, declared hooks that already exist in the app.
// Usage: node grade-acceptance.mjs --spec <spec.ts> --report <pw.json> --contract <ACCEPTANCE.md> [--src src] [--tsc-exit 0] [--md out.md]
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";

// True when this file is the program being run (also through symlinked paths such as a mounted handbook).
function isMain(url) { try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(url)); } catch { return false; } }

const CRASH = /ReferenceError|TypeError|SyntaxError|RangeError|is not defined|is not a function|Cannot read propert|page\.evaluate:|Unexpected token|Target page, context or browser has been closed/;
const strip = (s = "") => s.replace(/\u001b\[[0-9;]*m/g, "");

export function parseHooks(spec) {
  const hooks = [];
  for (const m of spec.matchAll(/^\s*\/\/\s*NEW-HOOKS:\s*(.+)$/gm))
    for (const h of m[1].split("|").map((x) => x.trim()).filter(Boolean)) hooks.push(h);
  return hooks;
}
// Map "AC-07" -> body text of that test (to read GUARD / RED-BECAUSE notes).
export function testBodies(spec) {
  const out = {}, re = /\btest(?:\.(?:only|skip|fixme))?\(\s*['"`](AC-\d+)[^\n]*/g, idx = [...spec.matchAll(re)];
  idx.forEach((m, i) => {
    const end = i + 1 < idx.length ? idx[i + 1].index : spec.length;
    // Include the comment lines directly above the test (where GUARD / RED-BECAUSE notes live).
    const before = spec.slice(0, m.index).split("\n"); before.pop();
    const notes = []; while (before.length && /^\s*\/\//.test(before.at(-1))) notes.unshift(before.pop());
    const lastEnd = notes.length ? notes.join("\n") + "\n" : "";
    out[m[1]] = (out[m[1]] ? out[m[1]] + "\n" : "") + lastEnd + spec.slice(m.index, end);
  });
  return out;
}
export function contractIds(md) { return [...new Set([...md.matchAll(/^\|\s*(AC-\d+)\s*\|/gm)].map((m) => m[1]))]; }
function walk(dir, files = []) {
  for (const f of readdirSync(dir)) { const p = join(dir, f); const s = statSync(p);
    if (s.isDirectory()) { if (f !== "node_modules") walk(p, files); } else if (/\.(tsx?|jsx?)$/.test(f)) files.push(p); }
  return files;
}
const hookRe = (h) => { const m = h.match(/^\/(.+)\/([a-z]*)$/); return m ? new RegExp(m[1], m[2]) : null; };
export function hookInText(h, text) { const r = hookRe(h); return r ? r.test(text) : text.includes(h); }
export function hookInLocator(h, loc) { const r = hookRe(h); return loc.includes(r ? r.source : h) || (!r && loc.includes(h)); }
export function locatorsOf(message) {
  const m = strip(message), locs = [];
  for (const x of m.matchAll(/Locator:\s*(.+)/g)) locs.push(x[1].trim());
  for (const x of m.matchAll(/waiting for (getBy[^\n]+|locator\([^\n]+)/g)) locs.push(x[1].trim());
  return locs;
}
export function results(report) {
  const out = [];
  const visit = (suite) => {
    for (const sp of suite.specs || []) for (const t of sp.tests || []) {
      const r = (t.results || []).at(-1) || {};
      const msg = strip([r.error?.message, ...(r.errors || []).map((e) => e.message)].filter(Boolean).join("\n"));
      out.push({ id: (sp.title.match(/^(AC-\d+)/) || [])[1] || sp.title, title: sp.title, status: r.status || t.status, message: msg });
    }
    for (const s of suite.suites || []) visit(s);
  };
  for (const s of report.suites || []) visit(s);
  return out;
}
export function classify(r, body, newHooks) {
  const guard = /\/\/\s*GUARD:/.test(body), because = /\/\/\s*RED-BECAUSE:/.test(body);
  if (r.status === "passed") return guard ? ["OK", "guard rail: passes on today's app as declared"] : ["FAIL", "passes without the feature and is not a declared GUARD (tests nothing new)"];
  if (r.status === "skipped") return ["FAIL", "skipped"];
  if (CRASH.test(r.message)) return ["FAIL", `crashed: ${(r.message.match(CRASH) || [""])[0]} — ${r.message.split("\n").find((l) => CRASH.test(l))?.trim().slice(0, 140)}`];
  const locs = locatorsOf(r.message);
  if (!locs.length) return ["FAIL", `no locator reached (${r.message.split("\n")[0].slice(0, 120)}) — timed out or failed in setup`];
  const hit = locs.find((l) => newHooks.some((h) => hookInLocator(h, l)));
  if (hit) return ["OK", `red on new hook: ${hit.slice(0, 110)}`];
  const undeclaredId = locs.map((l) => (l.match(/getByTestId\(['"`]([^'"`]+)/) || [])[1]).find(Boolean);
  if (undeclaredId) return ["FAIL", `waits for testID "${undeclaredId}" that is not declared in NEW-HOOKS (Dev would not know to build it)`];
  return because ? ["OK", `red on existing UI, explained (RED-BECAUSE): ${locs[0].slice(0, 90)}`]
    : ["FAIL", `fails on existing UI, not a new hook, no RED-BECAUSE (usually a setup mistake): ${locs[0].slice(0, 110)}`];
}
export function grade({ spec, report, contract, srcText = "", tscExit = 0 }) {
  const problems = [], warnings = [];
  const declared = parseHooks(spec);
  if (!declared.length) problems.push("No `// NEW-HOOKS:` header: declare the new UI text/testIDs the feature adds (separate with |).");
  const newHooks = declared.filter((h) => { if (srcText && hookInText(h, srcText)) { warnings.push(`hook "${h}" already exists in the app source, so failing on it proves nothing; not counted`); return false; } return true; });
  if (tscExit !== 0) problems.push(`TypeScript check failed (exit ${tscExit}).`);
  if (/\b(?:test|it|describe)\.(?:skip|only|fixme)\s*\(|\bx(?:it|test|describe)\s*\(/.test(spec)) problems.push("Skipped or focused test in the spec.");
  const ids = contractIds(contract), bodies = testBodies(spec);
  const missing = ids.filter((i) => !bodies[i]), extra = Object.keys(bodies).filter((i) => !ids.includes(i));
  if (missing.length) problems.push(`No test for ${missing.join(", ")}.`);
  if (extra.length) warnings.push(`Tests for IDs not in the contract: ${extra.join(", ")}.`);
  const dup = [...spec.matchAll(/\btest(?:\.(?:only|skip|fixme))?\(\s*['"`](AC-\d+)/g)].map((m) => m[1]).filter((x, i, a) => a.indexOf(x) !== i);
  if (dup.length) problems.push(`More than one test for ${[...new Set(dup)].join(", ")}.`);
  const rows = results(report).map((r) => { const [verdict, why] = classify(r, bodies[r.id] || "", newHooks); return { ...r, verdict, why }; });
  if (!rows.length) problems.push("The report has no test results (the spec did not run).");
  const guards = rows.filter((r) => r.status === "passed" && r.verdict === "OK").length;
  const explained = rows.filter((r) => r.verdict === "OK" && r.why.startsWith("red on existing UI, explained")).length;
  if (rows.length && guards > Math.max(2, Math.floor(rows.length / 4))) problems.push(`${guards} of ${rows.length} tests already pass today (GUARD). At most a quarter may: the rest must fail until the feature exists.`);
  if (rows.length && explained > Math.max(2, Math.floor(rows.length / 4))) problems.push(`${explained} of ${rows.length} tests rely on RED-BECAUSE instead of a declared new hook. Declare the new texts/testIDs in NEW-HOOKS.`);
  const bad = rows.filter((r) => r.verdict === "FAIL");
  const pass = problems.length === 0 && bad.length === 0;
  return { pass, problems, warnings, rows, counts: { tests: rows.length, ok: rows.length - bad.length, fail: bad.length, contract: ids.length } };
}
export function markdown(g) {
  return [`### Acceptance-test gate: ${g.pass ? "PASS" : "FAIL"} — ${g.counts.ok}/${g.counts.tests} tests red (or guarded) for the right reason, ${g.counts.contract} ACs in the contract`, "",
    ...g.problems.map((p) => `- ❌ ${p}`), ...g.warnings.map((w) => `- ⚠️ ${w}`), "",
    "| AC | Result on today's app | Verdict | Why |", "|---|---|---|---|",
    ...g.rows.map((r) => `| ${r.id} | ${r.status} | ${r.verdict === "OK" ? "✅" : "❌"} | ${r.why.replace(/\|/g, "\\|")} |`)].join("\n");
}

if (isMain(import.meta.url)) {
  const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : d; };
  const src = arg("src", "src");
  let srcText = ""; try { srcText = walk(src).map((f) => readFileSync(f, "utf8")).join("\n"); } catch { /* no src */ }
  const g = grade({ spec: readFileSync(arg("spec"), "utf8"), report: JSON.parse(readFileSync(arg("report"), "utf8")),
    contract: readFileSync(arg("contract"), "utf8"), srcText, tscExit: Number(arg("tsc-exit", "0")) });
  const md = markdown(g); console.log(md); if (arg("md")) writeFileSync(arg("md"), md + "\n");
  process.exit(g.pass ? 0 : 1);
}
