import {readFile, mkdir, writeFile} from 'node:fs/promises';

const input = process.argv[2] ?? 'evidence/agent-status.json';
const output = process.argv[3] ?? 'evidence/agent-dashboard.html';
let data;
try { data = JSON.parse(await readFile(input, 'utf8')); }
catch { data = {generatedAt: new Date().toISOString(), agents: []}; }
const esc = value => String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const rows = (data.agents ?? []).map(a => `<tr><td>${esc(a.role)}</td><td><span class="${esc(a.status)}">${esc(a.status)}</span></td><td>${esc(a.task ?? '—')}</td><td>${esc(a.featureId ?? '—')}</td><td>${esc(a.testId ?? '—')}</td><td>${esc(a.sessionId ?? '—')}</td><td>${esc(a.responseId ?? '—')}</td><td>${esc(a.evidence ?? '—')}</td></tr>`).join('');
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>AppsWorld AI Agent Dashboard</title><style>body{font:15px system-ui;background:#0d1117;color:#e6edf3;margin:2rem}h1{color:#58a6ff}table{border-collapse:collapse;width:100%;background:#161b22}th,td{border:1px solid #30363d;padding:.65rem;text-align:left}th{background:#21262d}.running{color:#3fb950}.configured{color:#58a6ff}.blocked{color:#f85149}.idle{color:#8b949e}.pending{color:#d29922}small{color:#8b949e}</style></head><body><h1>AppsWorld AI Organization — Agent Dashboard</h1><p><small>Generated ${esc(data.generatedAt)}. A role is not reported as running unless an execution record exists.</small></p><table><thead><tr><th>Role</th><th>Status</th><th>Task</th><th>Feature ID</th><th>Test ID</th><th>Session ID</th><th>Response ID</th><th>Evidence</th></tr></thead><tbody>${rows || '<tr><td colspan="8">No execution records supplied.</td></tr>'}</tbody></table></body></html>`;
await mkdir(output.split('/').slice(0,-1).join('/') || '.', {recursive:true});
await writeFile(output, html);
