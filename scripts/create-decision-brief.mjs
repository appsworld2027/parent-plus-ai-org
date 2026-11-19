import {readFile, writeFile, appendFile, mkdir} from 'node:fs/promises';
const ideaId = process.argv[2];
if (!ideaId) { console.error('Usage: node scripts/create-decision-brief.mjs IDEA-ID'); process.exit(2); }
const path = `evidence/ideas/${ideaId}.json`;
const idea = JSON.parse(await readFile(path,'utf8'));
const answers = process.env.DISCOVERY_ANSWERS ? JSON.parse(process.env.DISCOVERY_ANSWERS) : {};
const brief = {
  ideaId: idea.ideaId, featureId: idea.featureId, state: 'Decision Required', createdAt: new Date().toISOString(),
  problem: answers.problem ?? idea.founderIdea,
  users: answers.users ?? ['Primary product user','Internal operator'],
  desiredOutcome: answers.desiredOutcome ?? 'Complete the requested user outcome with measurable acceptance criteria',
  journeys: answers.journeys ?? ['User starts the feature','User completes the primary outcome','User recovers from an error'],
  scopeIn: answers.scopeIn ?? ['Primary happy path','Validation and authorization','Automated regression coverage'],
  scopeOut: answers.scopeOut ?? ['Unapproved adjacent features','Production changes before release approval'],
  risks: answers.risks ?? ['Privacy and authorization boundaries','Data migration compatibility','Incomplete test evidence'],
  recommendation: 'Proceed with a small vertical slice after founder approval; keep production and destructive changes gated.',
  openDecisions: idea.openQuestions,
  approvalOptions: ['Approve recommended approach','Request changes','Defer decision'],
  assignedRoles: idea.assignedRoles,
  sessionId: idea.sessionId, responseId: idea.responseId
};
await mkdir('evidence/decision-briefs',{recursive:true});
await writeFile(`evidence/decision-briefs/${ideaId}.json`,JSON.stringify(brief,null,2)+'\n');
await writeFile(`evidence/decision-briefs/${ideaId}.md`, `# Decision brief — ${ideaId}\n\n**State:** Decision Required\n\n## Founder idea\n${brief.problem}\n\n## Users\n${brief.users.map(x=>`- ${x}`).join('\n')}\n\n## Desired outcome\n${brief.desiredOutcome}\n\n## Journeys\n${brief.journeys.map(x=>`- ${x}`).join('\n')}\n\n## Scope in\n${brief.scopeIn.map(x=>`- ${x}`).join('\n')}\n\n## Scope out\n${brief.scopeOut.map(x=>`- ${x}`).join('\n')}\n\n## Risks\n${brief.risks.map(x=>`- ${x}`).join('\n')}\n\n## Recommendation\n${brief.recommendation}\n\n## Decisions required\n${brief.openDecisions.map(x=>`- ${x}`).join('\n')}\n\n## Founder action\nApprove recommended approach, request changes, or defer decision.\n`);
await appendFile('orchestration/task-events.jsonl',JSON.stringify({event:'decision-brief-created',...brief})+'\n');
console.log(JSON.stringify(brief));
