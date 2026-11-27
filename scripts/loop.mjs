#!/usr/bin/env node
// AI Org outer-loop controller (deterministic, no model calls). Runs in the PRODUCT repo checkout,
// with the handbook at .ai-org-handbook/. Modes:
//   advance  - move every open loop item one step when its gate is met (scheduled + after each agent run)
//   command  - handle a founder command comment: /approve  /changes <text>  /next  /stop
//   next     - start eligible backlog items under the delivery lane policy
// Founder touches only two gates: approve the Feature Contract, and approve the Demo Pack (ship to main).
// Everything else (contract tests, build, QA, review, merge into the feature branch, release checks) is automatic.
import { execFileSync } from "node:child_process";
import { selectDeliveryItems, verifyScopedChanges } from "./delivery-lanes.mjs";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { realpathSync } from "node:fs";
import { dirname, join } from "node:path";

// True when this file is the program being run (also through symlinked paths such as a mounted handbook).
function isMain(url) { try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(url)); } catch { return false; } }

export const MARK = {
  contractReady: "ai-org:contract-ready", buildFor: "ai-org:build-for", fixFor: "ai-org:fix-for",
  demo: "ai-org:demo-pack", shipped: "ai-org:shipped", ciFix: "ai-org:ci-fix", blocked: "ai-org:blocked", gateFail: "ai-org:gate-fail", qaFix: "ai-org:qa-fix", qaReq: "ai-org:qa-request",
};
// Acceptance-test gate (scripts/grade-acceptance.mjs, run by the agent worker after Quinn): the build may only start
// when the locked tests are red for the right reason on the contract PR's head commit.
export function gateDecision(statuses = [], priorFails = 0, maxRetries = 2) {
  const s = statuses.find((x) => x.context === "acceptance-gate");
  if (!s || s.state === "pending") return "wait";
  if (s.state === "success") return "build";
  return priorFails < maxRetries ? "retry" : "block";
}
// AI Org v3 QA chain (RACI in .ai-org/manifest.json raci["ai:tests"]): after the gate passes, a challenger on a
// different model reviews, the author gets ONE fix round, then the accountable seat (Arjun, AI CPTO) signs off.
// verdicts.challenger = latest challenger verdict ever (it reviews once); verdicts.signoff = latest CPTO verdict
// posted after the last fix round started. At most two fix rounds (one from the challenger, one from the CPTO).
export function qaChainStep({ raci, verdicts = {}, fixRounds = 0 }) {
  if (!raci) return "build"; // single-agent stage (pre-v3 behaviour)
  if (raci.reviewer && !verdicts.challenger) return "challenge";
  if (verdicts.challenger === "changes" && fixRounds === 0) return "fix";
  if (raci.accountable && !verdicts.signoff) return "signoff";
  if (verdicts.signoff === "approve" || !raci.accountable) return "build";
  if (verdicts.signoff === "changes") return fixRounds < 2 ? "fix" : "block";
  return "wait";
}
// Agents commit handover notes after the tests, so the branch head moves. Gate statuses are looked up on every commit
// since the locked tests last changed (newest first), never only on the head.
export function gateStatusSince(commitsNewestFirst = [], statusesOf = () => []) {
  for (const sha of commitsNewestFirst) { const st = statusesOf(sha); if (st.some((s) => s.context === "acceptance-gate")) return st; }
  return [];
}
const IN_FLIGHT = ["ai:discovery", "ai:tests", "ai:tests-review", "ai:tests-signoff", "ai:contract", "ai:delivery", "ai:release", "ai:founder-test", "ai:build", "ai:fix", "ai:qa", "ai:review"];
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
  const who = agent.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mine = comments.filter((c) => (c.created_at || "") > (since || "") && new RegExp(`^\\s*\\**\\[${who}(\\b|\\])`, "i").test(c.body || ""))
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  const last = mine.at(-1); if (!last) return null;
  const head = last.body.slice(0, 600);
  if (/Verdict:\s*\**\s*(CHANGES|FAIL|REQUEST)/i.test(head)) return "changes";
  if (/Verdict:\s*\**\s*(APPROVE|PASS)/i.test(head)) return "approve";
  return null;
}
// GitHub supplies the account ID. The comment binds that account's verdict to a reviewed revision.
export function verdictEvidence(comments, policy, role, sha, excludedIds = []) {
  const id = policy?.[role];
  if (!Number.isSafeInteger(id) || id <= 0 || excludedIds.includes(id) ||
      Object.values(policy).filter((value) => value === id).length !== 1 ||
      !/^[a-f0-9]{40}$/.test(sha)) return [];
  const marker = `<!-- ai-org:reviewed-commit ${sha} -->`;
  return comments.filter((comment) => comment.user?.type === "User" && comment.user?.id === id &&
    comment.body?.split(/\r?\n/).some((line) => line.trim() === marker));
}
export function hasIndependentApproval(reviews, { head, authorLogin, reviewerIds }) {
  if (!head || !authorLogin || !Array.isArray(reviewerIds) || !reviewerIds.length) return false;
  const approvals = new Map();
  for (const review of [...reviews].sort((a, b) => a.id - b.id)) {
    const user = review.user;
    if (!user || user.type !== "User" ||
        user.login?.toLowerCase() === authorLogin.toLowerCase() || !reviewerIds.includes(user.id)) continue;
    if (!["APPROVED", "CHANGES_REQUESTED", "DISMISSED"].includes(review.state)) continue;
    approvals.set(user.id, review);
  }
  const latest = [...approvals.values()];
  return !latest.some((review) => review.state === "CHANGES_REQUESTED") &&
    latest.some((review) => review.state === "APPROVED" && review.commit_id === head);
}
export function failRounds(comments) {
  return comments.filter((c) => /^\s*\[(Quinn|Rex)\b/i.test(c.body || "") && /Verdict:\s*\**\s*(CHANGES|FAIL)/i.test((c.body || "").slice(0, 600))).length;
}
// required: job names that must exist and succeed. Others only must not fail.
export function checksState(runs, required = ["foundation"], requiredApp) {
  if (runs.some((r) => r.status !== "completed")) return "pending";
  if (runs.some((r) => BAD.includes(r.conclusion))) return "fail";
  if (!required.every((n) => runs.some((r) => r.name === n && r.conclusion === "success" && (!requiredApp || r.app === requiredApp)))) return "missing";
  return "success";
}
export function latestRequiredWorkflow(runs, workflow, branch, sha) {
  const path = `.github/workflows/${workflow}`;
  return runs.filter((run) => run.head_sha === sha && run.head_branch === branch && run.path?.split("@", 1)[0] === path)
    .sort((a, b) => b.id - a.id)[0];
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
// A contract is waiting for the founder when Maya's latest contract-ready marker is newer than the latest founder /changes.
export function contractState(comments = [], founders = []) {
  let ready = null, changedAt = "";
  for (const c of [...comments].sort((a, b) => (a.created_at || "").localeCompare(b.created_at || ""))) {
    const m = (c.body || "").match(new RegExp(`${MARK.contractReady}\\s+([a-z0-9-]+)`));
    if (m) ready = { slug: m[1], at: c.created_at || "" };
    if (parseCommand(c.body || "")?.cmd === "changes" && isFounder(c.user?.login, c.author_association, founders)) changedAt = c.created_at || "";
  }
  return { slug: ready?.slug || null, ready: !!ready && ready.at > changedAt };
}
export const slugOfBranch = (b = "") => (b.match(/^ai\/contract-(.+)$/) || [])[1] || null;
export function demoPack({ pr, title, why, acs, preview, founders = [], checksUrl = "" }) {
  const rows = acs.map((a) => `| ${a.id} | ${a.when || "—"} | ${a.then} | ✅ |`).join("\n");
  const steps = acs.slice(0, 3).map((a, i) => `${i + 1}. ${a.given ? `With ${a.given}, ` : ""}${a.when} → you should see ${a.then}`).join("\n");
  return [`<!-- ${MARK.demo} -->`, `## Demo Pack — ${title || `PR #${pr}`}`, "",
    `**Test it here:** ${preview || "the Vercel preview link of this PR (your AI assistant sends it to you)"}`, "", steps, "",
    `${founders.map((f) => `@${f}`).join(" ")} this feature passed every check and is ready for **your test**. **What you can do now:** ${why || "see the table below"}`, "",
    "| AC | When you… | You should see | Automated result |", "|---|---|---|---|", rows, "",
    "**Your decision — tell your AI assistant in chat** (you never need to open GitHub; the assistant posts it here for you):",
    "- \"approve\" → it posts `/approve`: ship it to production (merges to `main`)",
    "- \"change: <what to change>\" → it posts `/changes <what to change>`: agents fix it and send a new Demo Pack", "",
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
    `3. Commit both on branch \`ai/contract-${item.slug}\` (create it from main the first time; on later rounds \`git fetch origin && git switch ai/contract-${item.slug}\`) and push that branch. NEVER commit to \`main\`. No app code, no tests.`,
    `4. Comment here: 2-minute summary, the AC table, out-of-scope list, any product question with options + one Recommended; end with \`<!-- ${MARK.contractReady} ${item.slug} -->\`.`,
    "5. Label this issue `ai:founder-decision` and remove `ai:discovery`. The founder decides in their AI chat; it posts `/approve` or `/changes <text>` here."].join("\n");
}

// ---------- IO ----------
const DRY = process.argv.includes("--dry-run");
const REPO = (() => { const i = process.argv.indexOf("--repo"); return i > -1 ? process.argv[i + 1] : process.env.GITHUB_REPOSITORY; })();
const HERE = dirname(fileURLToPath(import.meta.url));
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: "utf8", maxBuffer: 64 << 20, stdio: ["pipe", "pipe", "pipe"], ...opts });
const gh = (...a) => run("gh", a);
const ghj = (...a) => JSON.parse(gh(...a) || "null");
const api = (path) => ghj("api", `repos/${REPO}/${path}`);
const apiItems = (path, query) => gh("api", "--paginate", `repos/${REPO}/${path}`, "--jq", query)
  .split("\n").filter(Boolean).map((line) => JSON.parse(line));
const log = (...a) => console.log(...a);
function act(desc, fn) { log(`${DRY ? "[dry-run] would" : "→"} ${desc}`); if (!DRY) return fn(); }
const manifest = () => existsSync(".ai-org/manifest.json") ? JSON.parse(readFileSync(".ai-org/manifest.json", "utf8")) : {};
const cfg = () => { const m = manifest(); return { founders: m.governance?.founders || [], raci: m.raci || null, loop: { backlog: "docs/product/BACKLOG.md", maxFixRounds: 5, agentsWorkflow: "ai-agents.yml", checksWorkflow: "checks.yml", qaWorkflow: "qa-lab.yml", requiredChecks: ["foundation"], lockedPaths: "e2e/acceptance/", ...(m.loop || {}) } }; };
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
function prAuthorId(number) {
  const id = api(`pulls/${number}`)?.user?.id;
  if (!Number.isSafeInteger(id) || id <= 0) throw new Error("PR author ID unavailable");
  return id;
}
const headDate = (sha) => api(`commits/${sha}`).commit.committer.date;
function checkRuns(sha) { return (api(`commits/${sha}/check-runs?per_page=100`)?.check_runs || []).map((r) => ({ name: r.name, status: r.status, conclusion: r.conclusion, app: r.app?.slug })); }
function ensureChecks(branch, sha) {
  const runs = api(`actions/runs?head_sha=${sha}&per_page=50`)?.workflow_runs || [];
  const { checksWorkflow, qaWorkflow } = cfg().loop;
  for (const wf of [checksWorkflow, qaWorkflow]) if (wf && !latestRequiredWorkflow(runs, wf, branch, sha))
    act(`dispatch ${wf} on ${branch} (agent pushes do not trigger CI)`, () => { try { gh("workflow", "run", wf, "--repo", REPO, "--ref", branch); } catch (e) { log(`  could not dispatch ${wf}: ${e.message.split("\n")[0]}`); } });
  return runs;
}
function gate(branch, sha) {
  const { checksWorkflow, requiredChecks } = cfg().loop;
  const workflow = latestRequiredWorkflow(ensureChecks(branch, sha), checksWorkflow, branch, sha);
  const overall = checksState(checkRuns(sha), []);
  if (overall === "fail") return "fail";
  if (!workflow || workflow.status !== "completed") return "pending";
  if (workflow.conclusion !== "success") return "fail";
  const path = `actions/runs/${workflow.id}/attempts/${workflow.run_attempt}/jobs?per_page=100`;
  const jobs = apiItems(path, ".jobs[]");
  const required = checksState(jobs, requiredChecks);
  if (required === "missing") return "pending";
  return required === "success" ? overall : required;
}
function lock(base, head, sha, labels) {
  run("git", ["fetch", "-q", "origin", base, head]);
  let ok = true, out = "";
  try { out = run("node", [join(HERE, "contract-lock.mjs")], { env: { ...process.env, BASE_REF: `origin/${base}`, CONTRACT_LOCK_HEAD: sha, PR_LABELS: labels.join(","), CONTRACT_LOCK_PATHS: cfg().loop.lockedPaths, GITHUB_STEP_SUMMARY: "" } }); }
  catch (e) { ok = false; out = (e.stdout || "") + (e.stderr || ""); }
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
// Read scope policy only from the main product checkout, not the PR under review.
function deliveryScopes() {
  if (!existsSync(".ai-org/delivery-lanes.json")) return {};
  const scopes = JSON.parse(readFileSync(".ai-org/delivery-lanes.json", "utf8")).features;
  if (!scopes || typeof scopes !== "object" || Array.isArray(scopes)) throw Error("invalid scopes");
  return scopes;
}
function deliveryScopeGate(pr, slug) {
  try {
    const scopes = deliveryScopes();
    // Unscoped legacy features remain serialized by lane admission.
    if (!Object.hasOwn(scopes, slug)) return { ok: true, legacy: true };
    const before = api(`pulls/${pr.number}`);
    const files = apiItems(`pulls/${pr.number}/files?per_page=100`, ".[]");
    const after = api(`pulls/${pr.number}`);
    return verifyScopedChanges(scopes[slug], files, before, after, pr.headRefOid, pr.baseRefName);
  } catch { return { ok: false, reason: "could not verify PR scope inventory" }; }
}
function advanceBuildPR(pr) {
  const L = labelsOf(pr), slug = slugOfBranch(pr.baseRefName);
  if (!slug || L.some((l) => INNER.includes(l))) return log(`#${pr.number}: inner loop still running (${L.join(",") || "no label"})`);
  const prComments = comments(pr.number);
  const all = [...prComments, ...referencedIssues(pr.body).flatMap((n) => { try { return comments(n); } catch { return []; } })];
  const policy = cfg().loop.aiVerdictReviewerIds;
  const eligible = policy === undefined ? all : verdictEvidence(prComments, policy, "rex", pr.headRefOid, [prAuthorId(pr.number)]);
  if (failRounds(policy === undefined ? all : eligible) >= cfg().loop.maxFixRounds && !all.some((c) => (c.body || "").includes(MARK.blocked))) {
    label(pr.number, ["ai:blocked"]); return comment(pr.number, `<!-- ${MARK.blocked} -->\n**[Kiran — Project Manager]** ${cfg().loop.maxFixRounds}+ fix rounds without approval. Paused for Arjun/founder: reply \`/changes <direction>\` or \`/stop\`.`);
  }
  const verdict = latestVerdict(eligible, "Rex", headDate(pr.headRefOid));
  if (verdict !== "approve") return log(`#${pr.number}: waiting for Rex on ${pr.headRefOid.slice(0, 7)}`);
  const g = gate(pr.headRefName, pr.headRefOid);
  if (g === "pending") return log(`#${pr.number}: checks pending`);
  if (g === "fail") { label(pr.number, ["ai:fix"]); comment(pr.number, `**[Sam — Release]** CI failed on ${pr.headRefOid.slice(0, 7)} after review. Back to Dev (\`ai:fix\`).`); return wake(pr.number); }
  if (!lock(pr.baseRefName, pr.headRefName, pr.headRefOid, L).ok) { label(pr.number, ["ai:fix"]); comment(pr.number, "**[Sam — Release]** contract-lock failed: this PR touched locked acceptance tests. Revert those changes (`ai:fix`)."); return wake(pr.number); }
  const scope = deliveryScopeGate(pr, slug);
  if (!scope.ok) {
    if (scope.outside?.length) { label(pr.number, ["ai:fix"]); comment(pr.number, `**[Kiran — Project Manager]** File scope violation: ${scope.outside.slice(0, 20).join(", ")}. Keep changes within the declared delivery scope; do not widen it from this PR.`); return wake(pr.number); }
    return log(`#${pr.number}: scope gate blocked merge: ${scope.reason}`);
  }
  act(`merge #${pr.number} into ${pr.baseRefName}`, () => gh("pr", "merge", String(pr.number), "--repo", REPO, "--merge", "--match-head-commit", pr.headRefOid, "--delete-branch"));
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
  const prComments = comments(pr.number);
  if (prComments.some((c) => new RegExp(`${MARK.buildFor} ${pr.number} [0-9a-f]{7,40}`).test(c.body || "") || ((c.body || "").includes(`${MARK.buildFor} ${pr.number}`) && !cfg().raci?.["ai:tests"]))) return log(`#${pr.number}: build already requested`);
  const slug = slugOfBranch(pr.headRefName); if (!slug) return;
  if (cfg().loop.acceptanceGate !== false) {
    let commits = [pr.headRefOid];
    try {
      run("git", ["fetch", "-q", "origin", pr.headRefName]);
      const specSha = run("git", ["log", "-1", "--format=%H", `origin/${pr.headRefName}`, "--", cfg().loop.lockedPaths]).trim();
      if (specSha) commits = run("git", ["rev-list", `${specSha}^..origin/${pr.headRefName}`]).trim().split("\n").filter(Boolean);
    } catch { /* fall back to the head */ }
    const statuses = gateStatusSince(commits.slice(0, 30), (sha) => api(`commits/${sha}/status`)?.statuses || []);
    const fails = prComments.filter((c) => (c.body || "").includes(MARK.gateFail)).length;
    const d = gateDecision(statuses, fails);
    const issue = referencedIssues(pr.body)[0];
    if (d === "wait") return log(`#${pr.number}: waiting for the acceptance-test gate on ${pr.headRefOid.slice(0, 7)}`);
    if (d === "retry" || d === "block") {
      if (prComments.some((c) => (c.body || "").includes(`${MARK.gateFail} ${pr.headRefOid}`))) return log(`#${pr.number}: gate failure already handled`);
      comment(pr.number, `<!-- ${MARK.gateFail} ${pr.headRefOid} -->\n**[Kiran — Project Manager]** The locked tests did not pass the acceptance-test gate (see the gate report above). ${d === "retry" ? `Back to Quinn on #${issue} to fix the tests the gate names.` : "Paused for the founder's AI assistant after repeated gate failures."}`);
      if (issue) { label(issue, [d === "retry" ? "ai:tests" : "ai:blocked"]); if (d === "retry") wake(issue); }
      return;
    }
  }
  const raci = cfg().raci?.["ai:tests"];
  if (raci) {
    const issue = referencedIssues(pr.body)[0];
    const fixes = prComments.filter((c) => (c.body || "").includes(MARK.qaFix));
    const fixRounds = fixes.length, since = fixes.at(-1)?.created_at || "";
    const policy = cfg().loop.aiVerdictReviewerIds;
    const excludedIds = policy === undefined ? [] : [prAuthorId(pr.number)];
    const evidenceFor = (role) => policy === undefined ? prComments :
      verdictEvidence(prComments, policy, role, pr.headRefOid, excludedIds);
    const v = {
      challenger: latestVerdict(evidenceFor("challenger"), "Quinn — QA Specialist, challenger", ""),
      signoff: latestVerdict(evidenceFor("signoff"), "Arjun", since),
    };
    const step = qaChainStep({ raci, verdicts: v, fixRounds });
    const busy = issue ? labelsOf(api(`issues/${issue}`)).find((l) => ["ai:tests", "ai:tests-review", "ai:tests-signoff", "ai:blocked"].includes(l)) : null;
    if (busy) return log(`#${pr.number}: ${busy} on #${issue}`);
    const requestMarker = (kind) => `<!-- ${MARK.qaReq} ${kind}${policy === undefined ? "" : ` ${pr.headRefOid}`} -->`;
    const asked = (kind) => prComments.some((c) => (c.body || "").includes(requestMarker(kind)) && (c.created_at || "") > since);
    if ((step === "challenge" && asked("challenge")) || (step === "signoff" && asked("signoff"))) {
      if (issue) label(issue, ["ai:blocked"]);
      return comment(pr.number, `**[Kiran — Project Manager]** The ${step === "challenge" ? "challenger" : "CPTO"} run finished without a \`Verdict:\` line. Paused (\`ai:blocked\`) so the chain does not loop.`);
    }
    if (step === "challenge") { comment(pr.number, `${requestMarker("challenge")}\n**[Kiran — Project Manager]** Gate passed. Quinn (challenger, ${raci.models?.challenger || "second model"}) now reviews these tests on #${issue}.`); label(issue, ["ai:tests-review"]); return wake(issue); }
    if (step === "fix") { comment(pr.number, `<!-- ${MARK.qaFix} ${pr.headRefOid} -->\n**[Kiran — Project Manager]** Review asked for changes. Back to Quinn (author) on #${issue} for one fix round.`); label(issue, ["ai:tests"]); return wake(issue); }
    if (step === "signoff") { comment(pr.number, `${requestMarker("signoff")}\n**[Kiran — Project Manager]** Review complete. Arjun (AI CPTO) signs off on #${issue}.`); label(issue, ["ai:tests-signoff"]); return wake(issue); }
    if (step === "block") { label(issue, ["ai:blocked"]); return comment(pr.number, "**[Kiran — Project Manager]** Sign-off still asks for changes after the fix round. Paused for the founder (`ai:blocked`)."); }
    if (step === "wait") return log(`#${pr.number}: waiting for QA verdicts`);
  }
  const n = newIssue(`Build: ${pr.title.replace(/^Contract:\s*/i, "")} (stacked on #${pr.number})`, buildIssueBody({ pr: pr.number, branch: pr.headRefName, slug }), "ai:build");
  comment(pr.number, `<!-- ${MARK.buildFor} ${pr.number} ${pr.headRefOid} -->\n**[Kiran — Project Manager]** Locked tests are in${cfg().raci?.["ai:tests"] ? " and signed off" : ""}. Build issue ${n ? `#${n}` : "(opened)"} assigned to Dev, with the full handover chain in \`docs/product/${slug}/handoffs/\`.`);
}
function advanceDiscovery() {
  const open = ghj("issue", "list", "--repo", REPO, "--state", "open", "--label", "ai:discovery", "--limit", "50", "--json", "number,labels");
  for (const item of open) {
    if (labelsOf(item).includes("ai:blocked")) continue;
    const { number } = item;
    const st = contractState(comments(number), cfg().founders);
    if (!st.ready) { log(`#${number}: Maya still working on the contract`); continue; }
    label(number, ["ai:founder-decision"], ["ai:discovery"]);
    comment(number, `**[Kiran — Project Manager]** Contract \`${st.slug}\` is ready for the founder's decision (\`docs/product/${st.slug}/\` on branch \`ai/contract-${st.slug}\`).`);
  }
}
export function advance() {
  try { advanceDiscovery(); } catch (e) { log(`discovery: skipped (${e.message.split("\n")[0]})`); }
  const prs = openPRs();
  for (const pr of prs) {
    const L = labelsOf(pr);
    if (L.includes("ai:blocked")) continue;
    try {
      if (pr.baseRefName.startsWith("ai/contract-")) advanceBuildPR(pr);
      else if (L.includes("ai:release")) advanceRelease(pr);
      else if (L.includes("ai:contract") && !L.includes("ai:delivery")) advanceContract(pr);
    } catch (e) { log(`#${pr.number}: skipped (${e.message.split("\n")[0]})`); }
  }
  log(`advance: looked at ${prs.length} open PR(s)`);
}
export function next() {
  const open = ghj("issue", "list", "--repo", REPO, "--state", "open", "--limit", "200", "--json", "number,title,body,labels");
  const prs = openPRs();
  if (open.length >= 200 || prs.length >= 100) return log("next: incomplete active inventory; scheduling paused");
  const busy = [...open.filter(i => /^Discovery: .* \[/.test(i.title) || labelsOf(i).some(l => [...IN_FLIGHT, "ai:founder-decision", "ai:blocked"].includes(l))),
    ...prs.filter(p => /^ai\/(contract|build|fix)-/.test(p.headRefName) || labelsOf(p).some(l => [...IN_FLIGHT, "ai:blocked"].includes(l)))];
  let md = ""; try { md = readFileSync(cfg().loop.backlog, "utf8"); } catch { return log(`next: no ${cfg().loop.backlog}`); }
  const titles = ghj("issue", "list", "--repo", REPO, "--state", "all", "--limit", "300", "--search", "Discovery: in:title", "--json", "title").map((i) => i.title);
  const used = titles.map((t) => (t.match(/\[([a-z0-9-]+)\]$/) || [])[1]).filter(Boolean);
  const items = [];
  for (let item; (item = nextBacklogItem(md, [...used, ...items.map(i => i.slug)]));) items.push(item);
  if (!items.length) return log("next: backlog empty — Maya will propose new items when asked");
  let scopes;
  try { scopes = deliveryScopes(); }
  catch { return log("next: invalid delivery scope configuration; scheduling paused"); }
  const policy = JSON.parse(readFileSync(join(HERE, "../governance/AUTONOMY_POLICY.json"), "utf8"));
  const completed = Object.keys(scopes).length ? ghj("pr", "list", "--repo", REPO, "--state", "merged", "--base", "main", "--limit", "300", "--json", "headRefName").map(p => slugOfBranch(p.headRefName)).filter(Boolean) : [];
  const selected = selectDeliveryItems({items, active:busy, scopes, completed, maxLanes:policy.execution.maxConcurrentDeliveryLanes});
  if (!selected.length) return log("next: capacity, unresolved dependency, unknown scope or overlap; scheduling paused");
  for (const item of selected) newIssue(`Discovery: ${item.title} [${item.slug}]`, discoveryIssueBody(item), "ai:discovery");
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
  if (L.includes("ai:blocked") && parsed.cmd === "approve") return log(`#${n}: blocked; resume work before approving`);
  if (isPR && L.includes("ai:founder-test")) {
    const pr = ghj("pr", "view", n, "--repo", REPO, "--json", "number,headRefName,headRefOid,baseRefName,body,title,author");
    if (parsed.cmd === "approve") {
      if (pr.baseRefName !== "main") return log(`#${n}: release PR must target main`);
      const reviewerIds = cfg().loop.independentReviewerIds;
      if (reviewerIds !== undefined) {
        const reviews = apiItems(`pulls/${n}/reviews?per_page=100`, ".[]");
        if (!hasIndependentApproval(reviews, { head: pr.headRefOid, authorLogin: pr.author?.login, reviewerIds })) {
          return log(`#${n}: waiting for authorized release review on ${pr.headRefOid.slice(0, 7)}`);
        }
      }
      if (gate(pr.headRefName, pr.headRefOid) !== "success") return comment(n, "**[Sam — Release]** Checks are not green on the latest commit any more, so I did not ship. I'll post a new Demo Pack when they are.");
      if (!lock("main", pr.headRefName, pr.headRefOid, ["ai:delivery"]).ok) return comment(n, "**[Sam — Release]** Delivery lock failed; not shipped.");
      const scope = deliveryScopeGate(pr, slugOfBranch(pr.headRefName));
      if (!scope.ok) return log(`#${n}: scope gate blocked release: ${scope.reason}`);
      act(`merge #${n} into main (founder @${who} approved)`, () => gh("pr", "merge", String(n), "--repo", REPO, "--merge", "--match-head-commit", pr.headRefOid, "--delete-branch", "--subject", `Merge PR #${n}: ${pr.title.replace(/^Contract:\s*/i, "")} (approved by @${who})`));
      label(n, [], ["ai:founder-test", "ai:delivery"]);
      const { checksWorkflow, qaWorkflow } = cfg().loop;
      for (const wf of [checksWorkflow, qaWorkflow]) act(`dispatch ${wf} on main`, () => { try { gh("workflow", "run", wf, "--repo", REPO, "--ref", "main"); } catch { /* optional */ } });
      for (const i of referencedIssues(pr.body)) act(`close #${i}`, () => { try { gh("issue", "close", i, "--repo", REPO, "-c", `Shipped in #${n}.`); } catch { /* not an issue */ } });
      comment(n, `<!-- ${MARK.shipped} -->\n**[Sam — Release]** Shipped to main (approved by @${who}). Production deploys from main; post-merge checks are running. Starting the next backlog item.`);
      return next();
    }
    if (parsed.cmd === "changes") {
      label(n, [], ["ai:founder-test", "ai:blocked"]);
      const fx = newIssue(`Changes requested on #${n}`, fixIssueBody({ pr: n, branch: pr.headRefName, slug: slugOfBranch(pr.headRefName), text: parsed.text, author: who, n: id }), "ai:fix");
      return comment(n, `**[Kiran — Project Manager]** Got it, @${who}. Fix issue ${fx ? `#${fx}` : ""} goes to Dev → Quinn → Rex; a new Demo Pack follows.`);
    }
  }
  const all = isPR ? [] : comments(n);
  if (!isPR && (L.includes("ai:founder-decision") || (L.includes("ai:discovery") && contractState(all.filter((x) => String(x.id) !== String(id)), cfg().founders).ready))) {
    const ready = all.map((x) => (x.body || "").match(new RegExp(`${MARK.contractReady}\\s+([a-z0-9-]+)`))).filter(Boolean).at(-1);
    if (parsed.cmd === "approve" && ready) {
      label(n, ["ai:tests"], ["ai:founder-decision", "ai:discovery"]);
      comment(n, `**[Kiran — Project Manager]** Contract \`${ready[1]}\` approved by @${who}. Quinn: write the locked acceptance tests on branch \`ai/contract-${ready[1]}\` (\`git fetch origin && git switch ai/contract-${ready[1]}\`), then Dev builds. Next time the founder hears from us is the Demo Pack.`);
      return wake(n);
    }
    if (parsed.cmd === "approve") { label(n, [], ["ai:founder-decision", "ai:discovery"]); return comment(n, `**[Kiran — Project Manager]** Decision recorded: approved by @${who}.`); }
    if (parsed.cmd === "changes") {
      const slug = ready?.[1], where = slug ? `\n\nMaya: revise \`docs/product/${slug}/\` on branch \`ai/contract-${slug}\` (\`git fetch origin && git switch ai/contract-${slug}\`). Never commit to \`main\`.` : "";
      label(n, ["ai:discovery"], ["ai:founder-decision", "ai:blocked"]); comment(n, `**[Kiran — Project Manager]** @${who} asked for changes — back to Maya:\n\n> ${parsed.text.replace(/\n/g, "\n> ")}${where}`); return wake(n);
    }
  }
  log(`command: /${parsed.cmd} has no action on #${n} (labels: ${L.join(",") || "none"})`);
}

if (isMain(import.meta.url)) {
  if (!REPO) { console.error("No repo (GITHUB_REPOSITORY or --repo)"); process.exit(2); }
  const mode = process.argv[2];
  ({ advance, next, command }[mode] || (() => { console.error("usage: loop.mjs advance|next|command [--repo o/r] [--dry-run]"); process.exit(2); }))();
}
