#!/usr/bin/env node
// AI Org outer-loop controller (deterministic, no model calls). Runs in the PRODUCT repo checkout,
// with the handbook at .ai-org-handbook/. Modes:
//   advance  - move every open loop item one step when its gate is met (scheduled + after each agent run)
//   command  - handle a founder command comment: /approve  /changes <text>  /next  /stop
//   next     - start the next backlog item (only when nothing else is in flight)
// Founder touches only two gates: approve the Feature Contract, and approve the Demo Pack (ship to main).
// Everything else (contract tests, build, QA, review, merge into the feature branch, release checks) is automatic.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const MARK = {
  contractReady: "ai-org:contract-ready", buildFor: "ai-org:build-for", fixFor: "ai-org:fix-for",
  demo: "ai-org:demo-pack", shipped: "ai-org:shipped", ciFix: "ai-org:ci-fix", blocked: "ai-org:blocked",
};
const IN_FLIGHT = ["ai:discovery", "ai:tests", "ai:contract", "ai:delivery", "ai:release", "ai:founder-test", "ai:build", "ai:fix", "ai:qa", "ai:review"];
const INNER = ["ai:build", "ai:fix", "ai:qa", "ai:review", "ai:blocked"];
const BAD = ["failure", "cancelled", "timed_out", "action_required", "startup_failure", "stale"];

// ---------- pure logic (unit-tested) ----------
export function parseCommand(body = "") {
  const line = body.split(/\r?\n/).map((l) => l.trim()).find((l) => l.length) || "";
  const m = line.match(/^\/(approve|changes|next|stop)\b[:\s]*(.*)$/i);
  if (!m) return null;
  const cmd = m[1].toLowerCase();
  const rest = body.slice(body.indexOf(m[0]) + m[0].length).split(/\r?\n(?:On .+wrote:|>)/)[0];
  return { cmd, text: (m[2] + rest).trim() };
}
export function isFounder(author, association, founders = []) {
  return founders.map((f) => f.toLowerCase()).includes(String(author).toLowerCase()) && ["OWNER", "MEMBER", "COLLABORATOR"].includes(association);
}
// Latest verdict by an agent (e.g. "Rex") posted after `since` (ISO). Returns "approve" | "changes" | null.
export function latestVerdict(comments, agent, since) {
  const mine = comments.filter((c) => (c.created_at || "") > (since || "") && new RegExp(`^\\s*\\[${agent}\\b`, "i").test(c.body || ""))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const last = mine.at(-1); if (!last) return null;
  const head = last.body.slice(0, 600);
  if (/Verdict:\s*\**\s*(CHANGES|FAIL|REQUEST)/i.test(head)) return "changes";
  if (/Verdict:\s*\**\s*(APPROVE|PASS)/i.test(head)) return "approve";
  return null;
}
export function failRounds(comments) {
  return comments.filter((c) => /^\s*\[(Quinn|Rex)\b/i.test(c.body || "") && /Verdict:\s*\**\s*(CHANGES|FAIL)/i.test((c.body || "").slice(0, 600))).length;
}
// required: job names that must exist and succeed. Others only must not fail.
export function checksState(runs, required = ["foundation"]) {
  if (runs.some((r) => r.status !== "completed")) return "pending";
  if (runs.some((r) => BAD.includes(r.conclusion))) return "fail";
  if (!required.every((n) => runs.some((r) => r.name === n && r.conclusion === "success"))) return "missing";
  return "success";
}
export function parseAcceptance(md = "") {
  const why = (md.match(/##\s*Why this feature[^\n]*\n+([\s\S]*?)(\n##|$)/i) || [])[1]?.trim().split(/\n\s*\n/)[0]?.replace(/\s+/g, " ") || "";
  const acs = [];
  for (const line of md.split("\n")) {
    const cells = line.split("|").map((s) => s.trim());
    if (/^AC-\d+/.test(cells[1] || "")) acs.push({ id: cells[1], given: cells[2] || "", when: cells[3] || "", then: cells[4] || "" });
  }
  const title = (md.match(/^#\s*Feature Contract:\s*(.+)$/m) || [])[1]?.trim() || "";
  return { title, why, acs };
}
export function nextBacklogItem(md = "", usedSlugs = []) {
  for (const line of md.split("\n")) {
    const m = line.match(/^\s*-\s*\[\s\]\s*([a-z0-9-]+)\s*[—-]+\s*(.+?)(?:\s*[—-]+\s*(.+))?$/i);
    if (m && !usedSlugs.includes(m[1])) return { slug: m[1], title: m[2].trim(), ref: (m[3] || "").trim() };
  }
  return null;
}
export const slugOfBranch = (b = "") => (b.match(/^ai\/contract-(.+)$/) || [])[1] || null;
export function demoPack({ pr, title, why, acs, preview, founders = [], checksUrl = "" }) {
  const rows = acs.map((a) => `| ${a.id} | ${a.when || "—"} | ${a.then} | ✅ |`).join("\n");
  const steps = acs.slice(0, 3).map((a, i) => `${i + 1}. ${a.given ? `With ${a.given}, ` : ""}${a.when} → you should see ${a.then}`).join("\n");
  return [`<!-- ${MARK.demo} -->`, `## Demo Pack — ${title || `PR #${pr}`}`, "",
    `${founders.map((f) => `@${f}`).join(" ")} this feature passed every check and is ready for **your test**.`, "",
    `**What you can do now:** ${why || "see the acceptance table below"}`, "",
    `**Try it:** ${preview || "the Vercel preview link in the checks on this PR"}`, "", steps, "",
    "| AC | When you… | You should see | Automated result |", "|---|---|---|---|", rows, "",
    "**Your decision — reply on this PR (GitHub app or reply to the notification email):**",
    "- `/approve` — ship it to production (merges to `main`)",
    "- `/changes <what to change>` — agents fix it and send a new Demo Pack", "",
    `Evidence: full validation, locked acceptance tests, QA lab and contract-lock passed on the head commit${checksUrl ? ` (${checksUrl})` : ""}.`].join("\n");
}
export function buildIssueBody({ pr, branch, slug }) {
  return [`<!-- ${MARK.buildFor} ${pr} -->`, "Owner: Dev", `Stage: build (stacked on contract PR #${pr})`, "",
    "## Goal", `Build exactly what the approved Feature Contract says: \`docs/product/${slug}/ACCEPTANCE.md\` on branch \`${branch}\`.`,
    `Locked tests: \`e2e/acceptance/\` on that branch. They fail today; make all of them pass.`, "",
    "## Hard rules (AI Org AGENTS.md §7A)",
    `1. \`git fetch origin && git switch -c ai/build-${slug} origin/${branch}\` — never from main.`,
    "2. NEVER add, edit, delete, rename, skip or focus anything in `e2e/acceptance/`.",
    "3. Handle loading, empty, error and large-data states the contract lists; no behaviour the contract does not ask for.",
    "4. Done only when the acceptance tests and `npm run check` pass. Quote the result lines.",
    `5. Open the PR with base \`${branch}\`, body starting \`Closes #<this issue>\`, label it \`ai:qa\`. Never merge.`].join("\n");
}
export function fixIssueBody({ pr, branch, slug, text, author, n }) {
  return [`<!-- ${MARK.fixFor} ${pr} -->`, "Owner: Dev", `Stage: fix (delivery PR #${pr})`, "",
    `## Requested by @${author}`, text || "(no details)", "",
    "## Hard rules (AI Org AGENTS.md §7A)",
    `1. \`git fetch origin && git switch -c ai/fix-${slug}-${n} origin/${branch}\`.`,
    "2. NEVER touch `e2e/acceptance/`. If the request changes agreed behaviour, stop and comment with options (Maya updates the contract).",
    "3. Done only when the acceptance tests and `npm run check` pass. Quote the result lines.",
    `4. Open the PR with base \`${branch}\`, body starting \`Closes #<this issue>\`, label it \`ai:qa\`. Never merge.`].join("\n");
}
export function discoveryIssueBody(item) {
  return [`Owner: Maya`, `Stage: discovery — backlog item \`${item.slug}\`${item.ref ? ` (${item.ref})` : ""}`, "",
    `## Idea`, item.title, "",
    "## What Maya does (AI Org playbooks/ai-pm.md + playbooks/feature-contract.md)",
    `1. Research silently (code, prototype in founders/prototypes/, PRD.md, roadmap). Decide what a good PM decides alone.`,
    `2. Write \`docs/product/${item.slug}/ACCEPTANCE.md\` (template: AI Org playbooks/feature-contract.md, incl. loading/empty/error/offline/large-data ACs) and \`SUMMARY.md\` (≤2 min).`,
    `3. Commit both on branch \`ai/contract-${item.slug}\` (from main) and push. No app code, no tests.`,
    `4. Comment here: 2-minute summary, the AC table, out-of-scope list, any product question with options + one Recommended; end with \`<!-- ${MARK.contractReady} ${item.slug} -->\`.`,
    "5. Label this issue `ai:founder-decision` and remove `ai:discovery`. The founder replies `/approve` or `/changes <text>`."].join("\n");
}

// ---------- IO ----------
const DRY = process.argv.includes("--dry-run");
const REPO = (() => { const i = process.argv.indexOf("--repo"); return i > -1 ? process.argv[i + 1] : process.env.GITHUB_REPOSITORY; })();
const HERE = dirname(fileURLToPath(import.meta.url));
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 64 << 20, stdio: ["pipe", "pipe", "pipe"], ...opts });
const gh = (...a) => run("gh", a);
const ghj = (...a) => JSON.parse(gh(...a) || "null");
const api = (path) => ghj("api", `repos/${REPO}/${path}`);
const log = (...a) => console.log(...a);
function act(desc, fn) { log(`${DRY ? "[dry-run] would" : "→"} ${desc}`); if (!DRY) return fn(); }
const manifest = () => existsSync(".ai-org/manifest.json") ? JSON.parse(readFileSync(".ai-org/manifest.json", "utf8")) : {};
const cfg = () => { const m = manifest(); return { founders: m.governance?.founders || [], loop: { backlog: "docs/product/BACKLOG.md", maxFixRounds: 5, agentsWorkflow: "ai-agents.yml", checksWorkflow: "checks.yml", qaWorkflow: "qa-lab.yml", requiredChecks: ["foundation"], lockedPaths: "e2e/acceptance/", ...(m.loop || {}) } }; };
const comments = (n) => api(`issues/${n}/comments?per_page=100`) || [];
const comment = (n, body) => act(`comment on #${n}: ${body.split("\n").find((l) => l && !l.startsWith("<!--")).slice(0, 90)}`, () => gh("api", "-X", "POST", `repos/${REPO}/issues/${n}/comments`, "-f", `body=${body}`));
const label = (n, add = [], remove = []) => act(`#${n} labels +[${add}] -[${remove}]`, () => {
  for (const l of remove) { try { gh("api", "-X", "DELETE", `repos/${REPO}/issues/${n}/labels/${encodeURIComponent(l)}`); } catch { /* not present */ } }
  if (add.length) gh("api", "-X", "POST", `repos/${REPO}/issues/${n}/labels`, ...add.flatMap((l) => ["-f", `labels[]=${l}`]));
});
function wake(n) { if (process.env.GITHUB_ACTIONS === "true") act(`wake agents for #${n}`, () => gh("workflow", "run", cfg().loop.agentsWorkflow, "--repo", REPO, "-f", `number=${n}`)); }
function newIssue(title, body, lbl) {
  return act(`open issue "${title}" (${lbl})`, () => {
    const url = gh("issue", "create", "--repo", REPO, "--title", title, "--body", body).trim();
    const n = url.split("/").pop(); gh("issue", "edit", n, "--repo", REPO, "--add-label", lbl); wake(n); return n;
  });
}
const labelsOf = (x) => (x.labels || []).map((l) => l.name || l);
const openPRs = () => ghj("pr", "list", "--repo", REPO, "--state", "open", "--limit", "100", "--json", "number,title,baseRefName,headRefName,headRefOid,labels,body,url");
const headDate = (sha) => api(`commits/${sha}`).commit.committer.date;
function checkRuns(sha) { return (api(`commits/${sha}/check-runs?per_page=100`)?.check_runs || []).map((r) => ({ name: r.name, status: r.status, conclusion: r.conclusion })); }
function ensureChecks(branch, sha) {
  const runs = api(`actions/runs?head_sha=${sha}&per_page=50`)?.workflow_runs || [];
  const { checksWorkflow, qaWorkflow } = cfg().loop;
  for (const wf of [checksWorkflow, qaWorkflow]) if (wf && !runs.some((r) => r.path?.endsWith(`/${wf}`)))
    act(`dispatch ${wf} on ${branch} (agent pushes do not trigger CI)`, () => { try { gh("workflow", "run", wf, "--repo", REPO, "--ref", branch); } catch (e) { log(`  could not dispatch ${wf}: ${e.message.split("\n")[0]}`); } });
}
function gate(branch, sha) {
  ensureChecks(branch, sha);
  const s = checksState(checkRuns(sha), cfg().loop.requiredChecks);
  return s === "missing" ? "pending" : s;
}
function lock(base, head, sha, labels) {
  run("git", ["fetch", "-q", "origin", base, head]);
  const prev = run("git", ["rev-parse", "HEAD"]).trim();
  run("git", ["checkout", "-q", "--detach", `origin/${head}`]);
  let ok = true, out = "";
  try { out = run("node", [join(HERE, "contract-lock.mjs")], { env: { ...process.env, BASE_REF: `origin/${base}`, PR_LABELS: labels.join(","), CONTRACT_LOCK_PATHS: cfg().loop.lockedPaths, GITHUB_STEP_SUMMARY: "" } }); }
  catch (e) { ok = false; out = (e.stdout || "") + (e.stderr || ""); }
  run("git", ["checkout", "-q", prev]);
  act(`status contract-lock (loop) = ${ok ? "success" : "failure"} on ${sha.slice(0, 7)}`, () => gh("api", "-X", "POST", `repos/${REPO}/statuses/${sha}`, "-f", `state=${ok ? "success" : "failure"}`, "-f", "context=contract-lock (loop)", "-f", `description=${out.split("\n")[0].slice(0, 130)}`));
  return { ok, out };
}
function previewUrl(sha) {
  try {
    for (const d of api(`deployments?sha=${sha}&per_page=10`) || []) {
      const st = (api(`deployments/${d.id}/statuses?per_page=5`) || []).find((s) => s.state === "success" && s.environment_url);
      if (st) return st.environment_url;
    }
  } catch { /* none yet */ }
  return "";
}
const referencedIssues = (body = "") => [...new Set([...body.matchAll(/#(\d+)/g)].map((m) => m[1]))];

// ---------- steps ----------
function advanceBuildPR(pr) {
  const L = labelsOf(pr), slug = slugOfBranch(pr.baseRefName);
  if (!slug || L.some((l) => INNER.includes(l))) return log(`#${pr.number}: inner loop still running (${L.join(",") || "no label"})`);
  const since = headDate(pr.headRefOid);
  const all = [...comments(pr.number), ...referencedIssues(pr.body).flatMap((n) => { try { return comments(n); } catch { return []; } })];
  if (failRounds(all) >= cfg().loop.maxFixRounds && !all.some((c) => (c.body || "").includes(MARK.blocked))) {
    label(pr.number, ["ai:blocked"]); return comment(pr.number, `<!-- ${MARK.blocked} -->\n**[Kiran — Project Manager]** ${cfg().loop.maxFixRounds}+ fix rounds without approval. Paused for Arjun/founder: reply \`/changes <direction>\` or \`/stop\`.`);
  }
  const v = latestVerdict(all, "Rex", since);
  if (v !== "approve") return log(`#${pr.number}: waiting for Rex approval on ${pr.headRefOid.slice(0, 7)} (${v || "none"})`);
  const g = gate(pr.headRefName, pr.headRefOid);
  if (g === "pending") return log(`#${pr.number}: checks pending`);
  if (g === "fail") { label(pr.number, ["ai:fix"]); comment(pr.number, `**[Sam — Release]** CI failed on ${pr.headRefOid.slice(0, 7)} after review. Back to Dev (\`ai:fix\`).`); return wake(pr.number); }
  if (!lock(pr.baseRefName, pr.headRefName, pr.headRefOid, L).ok) { label(pr.number, ["ai:fix"]); comment(pr.number, "**[Sam — Release]** contract-lock failed: this PR touched locked acceptance tests. Revert those changes (`ai:fix`)."); return wake(pr.number); }
  act(`merge #${pr.number} into ${pr.baseRefName}`, () => gh("pr", "merge", String(pr.number), "--repo", REPO, "--merge", "--delete-branch"));
  const contract = openPRs().find((p) => p.headRefName === pr.baseRefName);
  if (contract) { label(contract.number, ["ai:delivery", "ai:release"], ["ai:contract", "ai:founder-test"]); comment(contract.number, `**[Sam — Release]** Reviewed build #${pr.number} merged into this branch. Running release checks; the Demo Pack follows when everything is green.`); }
}
function advanceRelease(pr) {
  const g = gate(pr.headRefName, pr.headRefOid);
  if (g === "pending") return log(`#${pr.number}: release checks pending`);
  if (g === "fail") {
    const mark = `${MARK.ciFix} ${pr.headRefOid}`;
    if (comments(pr.number).some((c) => (c.body || "").includes(mark))) return log(`#${pr.number}: CI fix already requested`);
    comment(pr.number, `<!-- ${mark} -->\n**[Sam — Release]** Release checks failed on ${pr.headRefOid.slice(0, 7)}. Opening a fix for Dev.`);
    const slug = slugOfBranch(pr.headRefName);
    return newIssue(`Fix: release checks failing on #${pr.number}`, fixIssueBody({ pr: pr.number, branch: pr.headRefName, slug, text: "Release checks (full validation / QA lab) failed on the delivery branch. Reproduce, find the root cause, fix it. See the failing checks on the PR.", author: "sam-release", n: pr.headRefOid.slice(0, 7) }), "ai:fix");
  }
  if (!lock("main", pr.headRefName, pr.headRefOid, ["ai:delivery"]).ok) { label(pr.number, ["ai:blocked"], ["ai:release"]); return comment(pr.number, "**[Sam — Release]** Delivery lock failed: locked tests differ from the approved contract. Blocked for review."); }
  const slug = slugOfBranch(pr.headRefName);
  let md = ""; try { md = run("git", ["show", `origin/${pr.headRefName}:docs/product/${slug}/ACCEPTANCE.md`]); } catch { /* none */ }
  const a = parseAcceptance(md);
  comment(pr.number, demoPack({ pr: pr.number, title: a.title || pr.title, why: a.why, acs: a.acs, preview: previewUrl(pr.headRefOid), founders: cfg().founders }));
  label(pr.number, ["ai:founder-test"], ["ai:release"]);
}
function advanceContract(pr) {
  if (comments(pr.number).some((c) => (c.body || "").includes(`${MARK.buildFor} ${pr.number}`))) return log(`#${pr.number}: build already requested`);
  const slug = slugOfBranch(pr.headRefName); if (!slug) return;
  const n = newIssue(`Build: ${pr.title.replace(/^Contract:\s*/i, "")} (stacked on #${pr.number})`, buildIssueBody({ pr: pr.number, branch: pr.headRefName, slug }), "ai:build");
  comment(pr.number, `<!-- ${MARK.buildFor} ${pr.number} -->\n**[Kiran — Project Manager]** Locked tests are in. Build issue ${n ? `#${n}` : "(opened)"} assigned to Dev.`);
}
export function advance() {
  const prs = openPRs();
  for (const pr of prs) {
    const L = labelsOf(pr);
    try {
      if (pr.baseRefName.startsWith("ai/contract-")) advanceBuildPR(pr);
      else if (L.includes("ai:release")) advanceRelease(pr);
      else if (L.includes("ai:contract") && !L.includes("ai:delivery")) advanceContract(pr);
    } catch (e) { log(`#${pr.number}: skipped (${e.message.split("\n")[0]})`); }
  }
  log(`advance: looked at ${prs.length} open PR(s)`);
}
export function next() {
  const open = ghj("issue", "list", "--repo", REPO, "--state", "open", "--limit", "200", "--json", "number,labels");
  const busy = open.filter((i) => labelsOf(i).some((l) => IN_FLIGHT.includes(l)));
  if (busy.length) return log(`next: busy with #${busy.map((i) => i.number).join(", #")} (one feature at a time)`);
  let md = ""; try { md = readFileSync(cfg().loop.backlog, "utf8"); } catch { return log(`next: no ${cfg().loop.backlog}`); }
  const titles = ghj("issue", "list", "--repo", REPO, "--state", "all", "--limit", "300", "--search", "Discovery: in:title", "--json", "title").map((i) => i.title);
  const used = titles.map((t) => (t.match(/\[([a-z0-9-]+)\]$/) || [])[1]).filter(Boolean);
  const item = nextBacklogItem(md, used);
  if (!item) return log("next: backlog empty — Maya will propose new items when asked");
  newIssue(`Discovery: ${item.title} [${item.slug}]`, discoveryIssueBody(item), "ai:discovery");
}
function command() {
  const id = process.env.COMMENT_ID; if (!id) return log("command: no COMMENT_ID");
  const c = api(`issues/comments/${id}`), n = c.issue_url.split("/").pop();
  const parsed = parseCommand(c.body);
  if (!parsed) return log("command: not a command");
  if (!isFounder(c.user.login, c.author_association, cfg().founders)) return log(`command: ignored /${parsed.cmd} from ${c.user.login} (not a founder)`);
  const item = api(`issues/${n}`), L = labelsOf(item), isPR = !!item.pull_request;
  const who = c.user.login;
  if (parsed.cmd === "next") return next();
  if (parsed.cmd === "stop") { label(n, ["ai:blocked"]); return comment(n, `**[Kiran — Project Manager]** Stopped by @${who}. Reply \`/changes <direction>\` to resume.`); }
  if (isPR && L.includes("ai:founder-test")) {
    const pr = ghj("pr", "view", n, "--repo", REPO, "--json", "number,headRefName,headRefOid,baseRefName,body,title");
    if (parsed.cmd === "approve") {
      if (gate(pr.headRefName, pr.headRefOid) !== "success") return comment(n, "**[Sam — Release]** Checks are not green on the latest commit any more, so I did not ship. I'll post a new Demo Pack when they are.");
      if (!lock("main", pr.headRefName, pr.headRefOid, ["ai:delivery"]).ok) return comment(n, "**[Sam — Release]** Delivery lock failed; not shipped.");
      act(`merge #${n} into main (founder @${who} approved)`, () => gh("pr", "merge", String(n), "--repo", REPO, "--merge", "--delete-branch", "--subject", `Merge PR #${n}: ${pr.title.replace(/^Contract:\s*/i, "")} (approved by @${who})`));
      label(n, [], ["ai:founder-test", "ai:delivery"]);
      const { checksWorkflow, qaWorkflow } = cfg().loop;
      for (const wf of [checksWorkflow, qaWorkflow]) act(`dispatch ${wf} on main`, () => { try { gh("workflow", "run", wf, "--repo", REPO, "--ref", "main"); } catch { /* optional */ } });
      for (const i of referencedIssues(pr.body)) act(`close #${i}`, () => { try { gh("issue", "close", i, "--repo", REPO, "-c", `Shipped in #${n}.`); } catch { /* not an issue */ } });
      comment(n, `<!-- ${MARK.shipped} -->\n**[Sam — Release]** Shipped to main (approved by @${who}). Production deploys from main; post-merge checks are running. Starting the next backlog item.`);
      return next();
    }
    if (parsed.cmd === "changes") {
      label(n, [], ["ai:founder-test"]);
      const fx = newIssue(`Changes requested on #${n}`, fixIssueBody({ pr: n, branch: pr.headRefName, slug: slugOfBranch(pr.headRefName), text: parsed.text, author: who, n: id }), "ai:fix");
      return comment(n, `**[Kiran — Project Manager]** Got it, @${who}. Fix issue ${fx ? `#${fx}` : ""} goes to Dev → Quinn → Rex; a new Demo Pack follows.`);
    }
  }
  if (!isPR && L.includes("ai:founder-decision")) {
    const ready = comments(n).map((x) => (x.body || "").match(new RegExp(`${MARK.contractReady}\\s+([a-z0-9-]+)`))).filter(Boolean).at(-1);
    if (parsed.cmd === "approve" && ready) {
      label(n, ["ai:tests"], ["ai:founder-decision"]);
      comment(n, `**[Kiran — Project Manager]** Contract \`${ready[1]}\` approved by @${who}. Quinn now writes the locked acceptance tests, then Dev builds. Next time you hear from us is the Demo Pack.`);
      return wake(n);
    }
    if (parsed.cmd === "approve") { label(n, [], ["ai:founder-decision"]); return comment(n, `**[Kiran — Project Manager]** Decision recorded: approved by @${who}.`); }
    if (parsed.cmd === "changes") { label(n, ["ai:discovery"], ["ai:founder-decision"]); comment(n, `**[Kiran — Project Manager]** @${who} asked for changes — back to Maya:\n\n> ${parsed.text}`); return wake(n); }
  }
  log(`command: /${parsed.cmd} has no action on #${n} (labels: ${L.join(",") || "none"})`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!REPO) { console.error("No repo (GITHUB_REPOSITORY or --repo)"); process.exit(2); }
  const mode = process.argv[2];
  ({ advance, next, command }[mode] || (() => { console.error("usage: loop.mjs advance|next|command [--repo o/r] [--dry-run]"); process.exit(2); }))();
}
