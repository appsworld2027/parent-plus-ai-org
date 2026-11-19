import {execFileSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';

const command = process.argv[2];
const args = Object.fromEntries(process.argv.slice(3).map(x=>{const [k,...v]=x.split('=');return [k.replace(/^--/,''),v.join('=')]}));
const repo = args.repo ?? 'appsworld2027/parent-plus-ai-org';
const trace = {command, conversationId:args.conversationId ?? randomUUID(), sessionId:args.sessionId ?? null, responseId:args.responseId ?? null, startedAt:new Date().toISOString()};
const workflows = {discover:'founder-intake.yml',decision:'ai-pm-discovery.yml',approve:'approve-decision.yml',plan:'product-planning.yml',route:'route-approved-plan.yml',test:'multi-agent-qa.yml',status:'daily-report.yml'};
if (!workflows[command]) { console.error(`Unknown command. Use: ${Object.keys(workflows).join(', ')}`); process.exit(2); }
const inputs={};
for(const k of ['idea','idea_id','decision','product_repo','feature_id','test_id','discovery_answers']) if(args[k]) inputs[k]=args[k];
const argv=['workflow','run',workflows[command],'--repo',repo];
for(const [k,v] of Object.entries(inputs)) argv.push('-f',`${k}=${v}`);
const json = (args) => JSON.parse(execFileSync('gh', args, {encoding:'utf8'}));
const wait = args.wait !== 'false';
const timeoutMs = Math.max(10000, Number(args.timeoutMs ?? 120000));
const intervalMs = Math.max(1000, Number(args.intervalMs ?? 3000));
const dispatchedAt = Date.now();
try { execFileSync('gh',argv,{stdio:'inherit'}); } catch { console.error(JSON.stringify({...trace,status:'blocked',reason:'GitHub CLI could not dispatch the requested backend workflow'})); process.exit(1); }

const base = {...trace, workflow:workflows[command], inputs};
if (!wait) { console.log(JSON.stringify({...base,status:'dispatched'})); process.exit(0); }

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const createdAfterDispatch = (run) => Date.parse(run.createdAt ?? 0) >= dispatchedAt - 5000;
let run;
const deadline = Date.now() + timeoutMs;
while (!run && Date.now() < deadline) {
  try {
    const runs = json(['run','list','--repo',repo,'--workflow',workflows[command],'--event','workflow_dispatch','--limit','10','--json','databaseId,createdAt,status,conclusion,url,headSha,attempt']);
    run = runs.filter(createdAfterDispatch).sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt))[0];
  } catch { /* transient GitHub CLI/API failure; retry within the bounded window */ }
  if (!run) await sleep(intervalMs);
}
if (!run) {
  console.log(JSON.stringify({...base,status:'pending',reason:'Workflow dispatched but a run ID was not observable before timeout',timeoutMs}));
  process.exit(0);
}

let details = run;
while (details.status !== 'completed' && Date.now() < deadline) {
  await sleep(intervalMs);
  try { details = json(['run','view',String(run.databaseId),'--repo',repo,'--json','databaseId,createdAt,status,conclusion,url,headSha,attempt,jobs']); } catch { /* keep polling */ }
}
const status = details.status === 'completed' ? (details.conclusion === 'success' ? 'completed' : 'failed') : 'pending';
const jobs = (details.jobs ?? []).map(job => ({name:job.name,status:job.status,conclusion:job.conclusion}));
const blockers = jobs.filter(job => job.conclusion && !['success','skipped'].includes(job.conclusion)).map(job => `${job.name}: ${job.conclusion}`);
console.log(JSON.stringify({...base,status,runId:details.databaseId,url:details.url,conclusion:details.conclusion ?? null,headSha:details.headSha ?? null,attempt:details.attempt ?? null,jobs,blockers,evidence:{workflowRun:details.url}}));
process.exit(status === 'failed' ? 1 : 0);
