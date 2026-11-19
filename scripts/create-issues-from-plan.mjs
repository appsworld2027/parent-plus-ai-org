import {readFile, writeFile, mkdir, appendFile} from 'node:fs/promises';
const ideaId = process.argv[2];
if (!ideaId) { console.error('Usage: node scripts/create-issues-from-plan.mjs IDEA-ID'); process.exit(2); }
const plan = JSON.parse(await readFile(`product/plans/${ideaId}.json`,'utf8'));
const issues = [];
for (const feature of plan.features) {
  const body = `## Ownership\n- Role: ${feature.owner}\n- Feature ID: ${feature.id}\n- Parent idea: ${ideaId}\n\n## Sub-features\n${feature.subfeatures.map(x=>`- ${x}`).join('\n')}\n\n## Acceptance\n- User journey is covered by happy, negative, boundary and edge scenarios.\n- Authorization/privacy behavior is explicit.\n- Test evidence is recorded in CSV/XLSX.\n\n## Dependencies\n- ${plan.dependencies.join('\n- ')}\n\n## Tracking\nFeature ID: ${feature.id}\nTest ID: to-be-created\nSession ID: not-supplied\nResponse ID: not-supplied`;
  issues.push({title:`[${feature.owner}] ${feature.id} — ${feature.name}`,role:feature.owner,featureId:feature.id,body});
}
for (const stream of plan.workstreams) {
  const body = `## PM workstream\n- PM: ${stream.pm}\n- Workstream: ${stream.name}\n- Roles: ${stream.roles.join(', ')}\n- Parent idea: ${ideaId}\n\nCoordinate dependencies, keep the task state current, and link implementation, tests, defects and evidence.`;
  issues.push({title:`[${stream.pm}] ${ideaId} — ${stream.name} delivery coordination`,role:stream.pm,featureId:plan.featureId,body});
}
await mkdir('orchestration/issue-bundles',{recursive:true});
await writeFile(`orchestration/issue-bundles/${ideaId}.json`,JSON.stringify({ideaId,productRequirements:plan.productRequirements,issues,createdAt:new Date().toISOString()},null,2)+'\n');
await appendFile('orchestration/task-events.jsonl',JSON.stringify({event:'issue-bundle-created',ideaId,issueCount:issues.length,roles:issues.map(i=>i.role)})+'\n');
console.log(JSON.stringify({ideaId,issueCount:issues.length,issues:issues.map(i=>({title:i.title,role:i.role,featureId:i.featureId}))}));
