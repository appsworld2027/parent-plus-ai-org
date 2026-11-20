#!/usr/bin/env node
// Builds the founder dashboard (site/index.html) from GitHub issues, PRs, workflow runs
// and orchestration/task-events.jsonl. Read-only: it never changes GitHub.
// Env: GH_TOKEN (optional for public repos), AI_ORG_REPO, ENGINE_CLAUDE / ENGINE_CODEX ("true"/"false").
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
const ORG_REPO = process.env.AI_ORG_REPO || "appsworld2027/parent-plus-ai-org";
const engines = { Claude: process.env.ENGINE_CLAUDE === "true", Codex: process.env.ENGINE_CODEX === "true" };
const projects = JSON.parse(readFileSync("org/projects.json", "utf8")).projects;

const STAGES = [
  ["ai:founder-decision", "Needs your decision", "You"],
  ["ai:founder-test", "Ready for you to test", "You"],
  ["ai:discovery", "Discovery", "Maya"],
  ["ai:plan", "Planning", "Arjun"],
  ["ai:build", "Building", "Dev / Tara / Ravi"],
  ["ai:qa", "QA", "Quinn"],
  ["ai:review", "Review", "Rex"],
  ["ai:fix", "Fixing", "Dev"],
  ["ai:blocked", "Blocked", "Kiran / Leela"],
];

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const ago = (iso) => {
  const m = Math.round((Date.now() - new Date(iso)) / 60000);
  return m < 60 ? `${m}m ago` : m < 2880 ? `${Math.round(m / 60)}h ago` : `${Math.round(m / 1440)}d ago`;
};

async function gh(path) {
  const r = await fetch(`https://api.github.com/${path}`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "appsworld-dashboard", ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
  });
  if (!r.ok) throw new Error(`GET ${path} -> HTTP ${r.status}`);
  return r.json();
}

function events() {
  const f = "orchestration/task-events.jsonl";
  if (!existsSync(f)) return [];
  return readFileSync(f, "utf8").trim().split("\n").filter(Boolean).slice(-15).reverse().map((l) => {
    try { return JSON.parse(l); } catch { return { message: l }; }
  });
}

async function load(repo) {
  const [items, runs] = await Promise.all([
    gh(`repos/${repo}/issues?state=open&per_page=100`),
    gh(`repos/${repo}/actions/runs?per_page=10`),
  ]);
  const cards = [];
  for (const it of items) {
    const names = it.labels.map((l) => l.name);
    const stage = STAGES.find(([l]) => names.includes(l));
    if (!stage) continue;
    cards.push({
      repo, stage: stage[0], owner: stage[2], number: it.number, title: it.title, url: it.html_url,
      kind: it.pull_request ? "PR" : "Issue", updated: it.updated_at,
      lane: names.includes("lane:a") ? "Lane A · Kiran" : names.includes("lane:b") ? "Lane B · Leela" : "",
      engine: names.includes("engine:claude") ? "Claude" : names.includes("engine:codex") ? "Codex" : "",
    });
  }
  return { repo, cards, runs: runs.workflow_runs };
}

const repos = [ORG_REPO, ...projects.map((p) => p.repo)];
const results = await Promise.all(repos.map((r) => load(r).catch((e) => ({ repo: r, error: e.message, cards: [], runs: [] }))));
if (results.every((r) => r.error)) { console.error(results.map((r) => r.error).join("\n")); process.exit(1); }

const all = results.flatMap((r) => r.cards);
const card = (c) => `<a class="card" href="${esc(c.url)}"><b>${c.kind} #${c.number}</b> ${esc(c.title)}
  <small>${esc(c.repo.split("/")[1])} · ${esc(c.owner)}${c.lane ? " · " + esc(c.lane) : ""}${c.engine ? " · " + c.engine : ""} · ${ago(c.updated)}</small></a>`;
const needsYou = all.filter((c) => c.stage === "ai:founder-decision" || c.stage === "ai:founder-test");
const board = STAGES.filter(([l]) => !l.startsWith("ai:founder")).map(([l, title, owner]) => {
  const cs = all.filter((c) => c.stage === l);
  return `<div class="col"><h3>${esc(title)} <span>${esc(owner)} · ${cs.length}</span></h3>${cs.map(card).join("") || '<p class="empty">—</p>'}</div>`;
}).join("");
const runRows = results.flatMap((r) => r.runs.map((x) => ({ ...x, repo: r.repo })))
  .sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 15)
  .map((x) => {
    const st = x.status !== "completed" ? "running" : x.conclusion;
    return `<tr><td class="st ${esc(st)}">${esc(st)}</td><td>${esc(x.name)}</td><td>${esc(x.repo.split("/")[1])}</td><td><a href="${esc(x.html_url)}">run</a></td><td>${ago(x.updated_at)}</td></tr>`;
  }).join("");
const evRows = events().map((e) => `<tr><td>${esc(e.timestamp || e.ts || e.time || e.createdAt || "")}</td><td>${esc(e.agent || e.role || "")}</td><td>${esc(e.event || e.type || e.status || "")}</td><td>${esc(e.summary || e.message || e.title || [e.ideaId || e.issue, e.state].filter(Boolean).join(" · ") || JSON.stringify(e).slice(0, 160))}</td></tr>`).join("");
const errors = results.filter((r) => r.error).map((r) => `<p class="err">Could not read ${esc(r.repo)}: ${esc(r.error)}</p>`).join("");
const engineChips = Object.entries(engines).map(([n, on]) => `<span class="chip ${on ? "on" : "off"}">${n} engine: ${on ? "connected" : "not connected — agents pause until a subscription is added"}</span>`).join(" ");
const testLinks = projects.map((p) => p.testUrl ? `<a href="${esc(p.testUrl)}">Test ${esc(p.name)}</a>` : `<span class="muted">${esc(p.name)}: test link not set yet</span>`).join(" · ");

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta http-equiv="refresh" content="300"><title>AppsWorld AI Org — Dashboard</title><style>
:root{color-scheme:light}body{font:15px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;background:#f6f7f9;color:#1b1f24}
header{background:#fff;border-bottom:1px solid #e3e6ea;padding:16px 20px}h1{font-size:20px;margin:0 0 6px}h2{font-size:16px;margin:22px 20px 8px}
.muted,small{color:#5b6570}.chip{display:inline-block;padding:3px 10px;border-radius:12px;font-size:13px;margin:4px 6px 0 0}.on{background:#dcf5e3}.off{background:#fde8e8}
.needs{margin:0 20px;display:grid;gap:8px}.board{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px;margin:0 20px}
.col{background:#fff;border:1px solid #e3e6ea;border-radius:10px;padding:10px}.col h3{font-size:14px;margin:0 0 8px}.col h3 span{font-weight:400;color:#5b6570}
.card{display:block;background:#f9fafb;border:1px solid #e3e6ea;border-radius:8px;padding:8px;margin-bottom:8px;color:inherit;text-decoration:none}.card small{display:block;margin-top:4px}
.needs .card{background:#fff8e6;border-color:#f3d48a}.empty{color:#9aa3ad;margin:0}table{border-collapse:collapse;margin:0 20px 10px;background:#fff;width:calc(100% - 40px)}
td{border-bottom:1px solid #eef0f2;padding:6px 8px;font-size:14px}.st.success{color:#137333}.st.failure{color:#b3261e}.st.running{color:#8a5a00}.err{color:#b3261e;margin:6px 20px}
footer{margin:24px 20px;color:#5b6570;font-size:13px}</style></head><body>
<header><h1>AppsWorld AI Organization</h1><div class="muted">Updated ${esc(new Date().toISOString().replace("T", " ").slice(0, 16))} UTC · refreshes every 5 min · ${testLinks}</div>${engineChips}</header>
${errors}
<h2>Needs you (${needsYou.length})</h2><div class="needs">${needsYou.map(card).join("") || '<p class="empty">Nothing needs you right now.</p>'}</div>
<h2>What the agents are working on</h2><div class="board">${board}</div>
<h2>Recent automation runs</h2><table>${runRows || '<tr><td class="empty">No runs yet</td></tr>'}</table>
<h2>Recent agent events</h2><table>${evRows || '<tr><td class="empty">No events yet</td></tr>'}</table>
<footer>Read-only view generated by scripts/build-dashboard.mjs. Source of truth: GitHub issues, pull requests and workflow runs.</footer></body></html>`;

mkdirSync("site", { recursive: true });
writeFileSync("site/index.html", html);
console.log(`dashboard: ${all.length} active cards, ${needsYou.length} need founder, ${results.filter((r) => r.error).length} repo errors -> site/index.html`);
