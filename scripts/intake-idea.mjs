import {readFile, writeFile, appendFile, mkdir} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
const source = process.argv[2] ?? process.env.IDEA ?? '';
if (!source.trim()) { console.error('Usage: node scripts/intake-idea.mjs "founder idea"'); process.exit(2); }
const now = new Date().toISOString();
const ideaId = `IDEA-${now.slice(0,10).replaceAll('-','')}-${randomUUID().slice(0,8)}`;
const featureId = `${ideaId}-F01`;
const taskId = `${ideaId}-DISCOVERY`;
const record = {ideaId, featureId, taskId, state:'Discovery', founderIdea:source.trim(), owner:'cpto', assignedRoles:['cpto','pm-a','pm-b','ux','frontend','backend','database','integration','qa','security','release','knowledge','cost'], createdAt:now, sessionId:process.env.SESSION_ID ?? null, responseId:process.env.RESPONSE_ID ?? null, openQuestions:['Who are the users and primary journey?','What is explicitly in and out of scope?','What privacy, security, performance and budget constraints apply?'], acceptance:['Decision brief exists','Feature and user journeys are identified','Open decisions are recorded','No implementation starts before approval']};
await mkdir('evidence/ideas',{recursive:true});
await mkdir('orchestration',{recursive:true});
await writeFile(`evidence/ideas/${ideaId}.json`, JSON.stringify(record,null,2)+'\n');
await appendFile('orchestration/task-events.jsonl', JSON.stringify({event:'idea-created',...record})+'\n');
console.log(JSON.stringify(record));
