import {readFile, writeFile, appendFile, mkdir} from 'node:fs/promises';
const ideaId = process.argv[2];
if (!ideaId) { console.error('Usage: node scripts/create-product-plan.mjs IDEA-ID'); process.exit(2); }
const decisionPath = `evidence/decisions/${ideaId}.json`;
let decision;
try { decision = JSON.parse(await readFile(decisionPath,'utf8')); } catch { console.error(`Missing founder decision: ${decisionPath}`); process.exit(3); }
if (decision.decision !== 'approve') { console.error(`Planning blocked: founder decision is ${decision.decision}, not approve`); process.exit(4); }
const brief = JSON.parse(await readFile(`evidence/decision-briefs/${ideaId}.json`,'utf8'));
const now = new Date().toISOString();
const features = [
  {id:`${brief.featureId}-01`,name:'Primary user journey',owner:'pm-a',subfeatures:['Entry and validation','Primary outcome','Recovery state']},
  {id:`${brief.featureId}-02`,name:'Secure data and permissions',owner:'pm-b',subfeatures:['Data model','Authorization','Audit and privacy']},
  {id:`${brief.featureId}-03`,name:'Integration and quality',owner:'pm-b',subfeatures:['API contract','Integration handling','Regression evidence']}
];
const plan = {ideaId,featureId:brief.featureId,state:'Ready',createdAt:now,productRequirements:{problem:brief.problem,users:brief.users,desiredOutcome:brief.desiredOutcome,scopeIn:brief.scopeIn,scopeOut:brief.scopeOut,risks:brief.risks,acceptance:brief.acceptance??['Primary journey passes','Unauthorized access is denied','Evidence is recorded']},features,workstreams:[{pm:'pm-a',name:'Product experience',roles:['ux','frontend','qa']},{pm:'pm-b',name:'Platform and backend',roles:['backend','database','integration','security','qa']}],qualityTypes:['happy','negative','validation','boundary','edge','regression','integration','api-contract','database','migration','authorization-security','privacy-safety','performance','load','stress','reliability-resilience','recovery-rollback','accessibility-usability','cross-device','chaos-failure-injection'],dependencies:['Founder-approved decision brief','API contract before parallel implementation','Database impact review before migration']};
await mkdir('product/plans',{recursive:true});
await writeFile(`product/plans/${ideaId}.json`,JSON.stringify(plan,null,2)+'\n');
await writeFile(`product/plans/${ideaId}.md`, `# Product plan — ${ideaId}\n\n**State:** Ready\n\n## Requirements\n- Problem: ${plan.productRequirements.problem}\n- Users: ${plan.productRequirements.users.join(', ')}\n- Outcome: ${plan.productRequirements.desiredOutcome}\n\n## Features\n${features.map(f=>`- **${f.id} ${f.name}** — ${f.subfeatures.join(', ')} — owner ${f.owner}`).join('\n')}\n\n## Workstreams\n- PM A: Product experience — UX, frontend, QA\n- PM B: Platform/backend — backend, database, integration, security, QA\n\n## Quality coverage\n${plan.qualityTypes.join(', ')}\n\n## Delivery dependencies\n${plan.dependencies.map(d=>`- ${d}`).join('\n')}\n`);
await appendFile('orchestration/task-events.jsonl',JSON.stringify({event:'product-plan-created',...plan})+'\n');
console.log(JSON.stringify(plan));
