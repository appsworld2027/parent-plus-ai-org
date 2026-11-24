#!/usr/bin/env node
// contract-lock — enforces AGENTS.md §7A rule 4 ("locked goalposts").
// A build/fix PR may not touch locked acceptance tests; a contract PR (label ai:contract)
// may contain only the contract docs and its tests; a delivery PR (label ai:delivery = contract + merged build,
// the final stacked PR) may contain app code, but its locked tests must be exactly those of its contract commit
// and no build commit may have touched them; no PR may skip or focus tests.
import { execFileSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";

// True when this file is the program being run (also through symlinked paths such as a mounted handbook).
function isMain(url) { try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(url)); } catch { return false; } }

export const DEFAULT_LOCKED_PATHS = ["tests/acceptance/"];
export const CONTRACT_DOC_PATHS = ["docs/product/", "docs/ai-memory/"]; // contract docs, handovers, CPTO-approved memory
const SKIP_PATTERNS = [
  /\b(?:it|test|describe)\.(?:skip|only|fixme|todo)\s*\(/,
  /\bx(?:it|test|describe)\s*\(/,
];
const TEST_FILE = /(\.(test|spec)\.[cm]?[jt]sx?$)|(^|\/)(e2e|tests?|__tests__)\//;

const under = (path, prefixes) => prefixes.some((p) => path.startsWith(p));

// changes: [{ status, path }]; addedLines: { [path]: string[] }; labels: string[]
// commits: [{ sha, files: string[] }] non-merge commits base..HEAD, newest first (delivery PRs only).
// lockedDrift: locked files that differ between the newest contract commit and HEAD (delivery PRs only).
export const isContractCommit = (files, lockedPaths) =>
  files.length > 0 && files.some((f) => under(f, lockedPaths)) && files.every((f) => under(f, lockedPaths) || under(f, CONTRACT_DOC_PATHS));
export function checkContractLock({ changes, addedLines = {}, labels = [], lockedPaths = DEFAULT_LOCKED_PATHS, commits = [], lockedDrift = [] }) {
  const isDeliveryPR = labels.includes("ai:delivery");
  const isContractPR = labels.includes("ai:contract") && !isDeliveryPR;
  const violations = [];
  if (isDeliveryPR) {
    const contract = commits.find((c) => isContractCommit(c.files, lockedPaths));
    if (!contract) violations.push("Delivery PR has no contract commit (only docs/product/ + locked tests) in its history");
    for (const c of commits) {
      if (isContractCommit(c.files, lockedPaths)) continue;
      for (const f of c.files) if (under(f, lockedPaths)) violations.push(`Build commit ${c.sha.slice(0, 7)} changed locked test: ${f}`);
    }
    for (const f of lockedDrift) violations.push(`Locked test differs from the approved contract commit: ${f}`);
  }
  for (const { status, path } of changes) {
    if (isDeliveryPR) continue;
    if (!isContractPR && under(path, lockedPaths)) {
      violations.push(`Locked acceptance test ${status === "D" ? "deleted" : "changed"} in a non-contract PR: ${path}`);
    }
    if (isContractPR && !under(path, lockedPaths) && !under(path, CONTRACT_DOC_PATHS)) {
      violations.push(`Contract PR may only contain the contract (docs/product/) and its tests: ${path}`);
    }
  }
  for (const [path, lines] of Object.entries(addedLines)) {
    if (!TEST_FILE.test(path) && !under(path, lockedPaths)) continue;
    for (const line of lines) {
      if (SKIP_PATTERNS.some((re) => re.test(line))) {
        violations.push(`Test skipped or focused in ${path}: ${line.trim()}`);
      }
    }
  }
  return { ok: violations.length === 0, isContractPR, isDeliveryPR, violations };
}

export function parseNameStatus(text) {
  const changes = [];
  for (const raw of text.split("\n")) {
    if (!raw.trim()) continue;
    const [status, ...paths] = raw.split("\t");
    for (const path of paths) changes.push({ status: status[0], path });
  }
  return changes;
}

export function parseAddedLines(diffText) {
  const added = {};
  let current = null;
  for (const line of diffText.split("\n")) {
    if (line.startsWith("+++ ")) {
      current = line === "+++ /dev/null" ? null : line.slice(6);
      if (current) added[current] ??= [];
    } else if (current && line.startsWith("+")) {
      added[current].push(line.slice(1));
    }
  }
  return added;
}

function main() {
  const base = process.env.BASE_REF || "origin/main";
  const labels = (process.env.PR_LABELS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const lockedPaths = (process.env.CONTRACT_LOCK_PATHS || DEFAULT_LOCKED_PATHS.join(","))
    .split(",").map((s) => s.trim()).filter(Boolean)
    .map((p) => (p.endsWith("/") ? p : p + "/"));
  const git = (...args) => execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const range = `${base}...HEAD`;
  const changes = parseNameStatus(git("diff", "--name-status", "--find-renames", range));
  const addedLines = parseAddedLines(git("diff", "-U0", "--no-color", range));
  let commits = [], lockedDrift = [];
  if (labels.includes("ai:delivery")) {
    const shas = git("log", "--no-merges", "--format=%H", range.replace("...", "..")).split("\n").filter(Boolean);
    commits = shas.map((sha) => ({ sha, files: git("diff-tree", "--no-commit-id", "--name-only", "-r", sha).split("\n").filter(Boolean) }));
    const contract = commits.find((c) => isContractCommit(c.files, lockedPaths));
    if (contract) lockedDrift = git("diff", "--name-only", contract.sha, "HEAD", "--", ...lockedPaths).split("\n").filter(Boolean);
  }
  const result = checkContractLock({ changes, addedLines, labels, lockedPaths, commits, lockedDrift });

  const kind = result.isDeliveryPR ? "delivery PR" : result.isContractPR ? "contract PR" : "build/fix PR";
  const header = `contract-lock: ${result.ok ? "PASS" : "FAIL"} (${kind}; ` +
    `base ${base}; locked: ${lockedPaths.join(", ")}; ${changes.length} changed files)`;
  const body = result.violations.map((v) => `- ${v}`).join("\n");
  console.log(header + (body ? "\n" + body : ""));
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### ${header}\n${body || "No violations."}\n` +
      (result.ok ? "" : "\nFix: never edit locked tests in a build PR. See AGENTS.md §7A rule 4.\n"));
  }
  process.exit(result.ok ? 0 : 1);
}

if (isMain(import.meta.url)) main();
