// Reference fixtures are not Quinn-authored evidence. Missing approved lock always blocks Dev.
// This validates the manifest's integrity, not the external review of the linked role run evidence.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { TRIAL } from '../safe-trial.mjs';
const ROOT = new URL('../../',import.meta.url);
const HASH=/^[a-f0-9]{64}$/; const SHA=/^[a-f0-9]{40}$/;
const RUN=/^https:\/\/github\.com\/appsworld2027\/parent-plus-ai-org\/actions\/runs\/\d+(?:\/artifacts\/\d+)?$/;
const expectedStages=[['ai:tests','quinn-qa','author'],['ai:tests-review','quinn-qa','challenger'],['ai:tests-signoff','arjun-cpto','accountable']];
export function validateLock(lock,{source,contractHash,testHash,supportHash}) {
  if(!lock||lock.schema!=='course-test-lock/v1'||!SHA.test(source)||lock.source!==source)throw Error('Missing or wrong source-bound prebuild receipt');
  for(const [name,actual] of Object.entries({contractHash,testHash,supportHash})) {
    if(!HASH.test(actual??'')||lock[name]!==actual)throw Error('Lock input hash mismatch: '+name);
  }
  if(!Array.isArray(lock.stages)||lock.stages.length!==3)throw Error('Quinn author, independent challenger and Arjun lock receipts required');
  const attempts=new Set(), contexts=new Set(), runs=new Set(), artifacts=new Set();
  for(const [stage,role,seat] of expectedStages) {
    const r=lock.stages.find(x=>x?.stage===stage);
    if(!r||r.role!==role||r.seat!==seat||r.passed!==true||!HASH.test(r.contextSha256??'')||!HASH.test(r.artifactSha256??'')||!RUN.test(r.run??'')||typeof r.attempt!=='string'||!r.attempt.trim()||r.source!==source||r.contractHash!==contractHash||r.testHash!==testHash||r.supportHash!==supportHash) throw Error('Invalid exact lock evidence for '+stage);
    attempts.add(r.attempt);contexts.add(r.contextSha256);runs.add(r.run);artifacts.add(r.artifactSha256);
  }
  if([attempts,contexts,runs,artifacts].some(s=>s.size!==3))throw Error('Separate author/challenger/signoff attempts, contexts, receipts required');
  if(lock.intendedRed!==true||!RUN.test(lock.redRun??'')||!HASH.test(lock.redReceiptSha256??'')||lock.criticalMutationControlsPassed!==true)throw Error('Intended RED and critical mutation control evidence required');
  return true;
}
const hash=p=>createHash('sha256').update(readFileSync(new URL(p,ROOT))).digest('hex');
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  try {
    const lock=JSON.parse(readFileSync(new URL('trial/controls/coach-course-management.LOCK.json',ROOT),'utf8'));
    // The support manifest must be produced from the exact sanitized pinned product fixtures. It is not a model assertion.
    validateLock(lock,{source:TRIAL.base,contractHash:hash('trial/controls/coach-course-management.CONTRACT.md'),testHash:hash('trial/controls/coach-course-management.spec.ts.txt'),supportHash:hash('trial/controls/coach-course-management.SUPPORT.json')});
    console.log('Locked inputs and separate stage receipt structure verified. External evidence review remains mandatory.');
  } catch(e){console.error('::error::Missing or invalid independently approved prebuild lock; Dev blocked: '+e.message);process.exitCode=1;}
}
