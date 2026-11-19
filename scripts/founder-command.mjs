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
try { execFileSync('gh',argv,{stdio:'inherit'}); } catch { console.error(JSON.stringify({...trace,status:'blocked',reason:'GitHub CLI could not dispatch the requested backend workflow'})); process.exit(1); }
console.log(JSON.stringify({...trace,status:'dispatched',workflow:workflows[command],inputs}));
