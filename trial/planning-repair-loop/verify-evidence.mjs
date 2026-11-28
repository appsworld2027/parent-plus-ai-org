import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {cpSync,mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
const accepted='synthetic-loop-approved-semantic-audit-required';
const read=(dir,file)=>JSON.parse(readFileSync(join(dir,file),'utf8'));
export function verifySavedLoop(source){
  const src=resolve(source), recorded=read(src,'checkpoint.json');
  assert.equal(recorded.status,accepted);
  assert.equal(recorded.productionReady,false);
  assert.equal(recorded.qualification,false);
  assert.ok(recorded.rounds.length>0&&recorded.rounds.length<=4);
  const scratch=mkdtempSync(join(tmpdir(),'ai-org-offline-qualification-'));
  try{
    for(const r of recorded.rounds)cpSync(join(src,'round-'+r.round),join(scratch,'round-'+r.round),{recursive:true});
    execFileSync(process.execPath,['trial/planning-repair-loop/run.mjs','run',recorded.role,recorded.variant,scratch],{env:{...process.env,AI_ORG_TRIAL_REPLAY_ONLY:'1',...(recorded.quoteRetryRound===undefined?{}:{AI_ORG_TRIAL_EXACT_QUOTE_ROUND:String(recorded.quoteRetryRound)}),...(recorded.reconcileGate?{AI_ORG_TRIAL_RECONCILE_GATE:'1'}:{}),...(recorded.indexedReviewRound===undefined?{}:{AI_ORG_TRIAL_INDEXED_REVIEW_ROUND:String(recorded.indexedReviewRound)}),...(recorded.indexedReviewVersion===2?{AI_ORG_TRIAL_INDEXED_REVIEW_V2:'1'}:{})},timeout:30000,stdio:'pipe'});
    const replay=read(scratch,'checkpoint.json');
    assert.equal(replay.status,accepted);
    assert.deepEqual(replay.rounds,recorded.rounds);
    assert.equal(replay.fixtureHash,recorded.fixtureHash);
    assert.deepEqual(read(scratch,'preflight.json'),read(src,'preflight.json'));
    return {role:recorded.role,variant:recorded.variant,rounds:replay.rounds.length,finalRawHash:replay.rounds.at(-1).rawHash,finalReviewHash:replay.rounds.at(-1).reviewRawHash,qualification:false,modelCalls:0};
  }finally{rmSync(scratch,{recursive:true,force:true});}
}
