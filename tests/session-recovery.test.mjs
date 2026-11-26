import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { assertNoCurrentAuthorityConflicts, currentAuthorityConflicts, latestExecutionCheckpoint, validateCheckpointFreshness } from '../scripts/recovery-validation.mjs'

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const instructions = read('AGENTS.md')
const recovery = read('governance/SESSION_RECOVERY.md')

test('fresh-session recovery reads authority, durable checkpoint, live PR evidence, then history', () => {
  const authority = recovery.indexOf('## 1. Authoritative instructions and founder decisions')
  const checkpoint = recovery.indexOf('## 2. Latest active execution checkpoint and ledger')
  const live = recovery.indexOf('## 3. Current PR and CI evidence')
  const history = recovery.indexOf('## 4. Historical context last')
  assert.ok(authority >= 0 && authority < checkpoint && checkpoint < live && live < history)
  assert.match(instructions, /If the workspace starts empty, explicitly retrieve this file from GitHub/)
  assert.match(instructions, /governance\/SESSION_RECOVERY\.md/)
})

test('recovery points to existing ledger, Command Centre, and authoritative Parent Plus owner source', () => {
  assert.match(recovery, /appsworld2027\/parent-plus-ai-org/)
  assert.match(recovery, /codex\/phase3a-execution/)
  assert.match(recovery, /governance\/phase3a-execution\.json/)
  assert.match(recovery, /governance\/PHASE_3A_CHECKPOINT\.md/)
  assert.match(recovery, /appsworld2027\/Parent-plus-/)
  assert.match(recovery, /ai-workspace\/development\/SHARED_DEVELOPMENT_WORKFLOW\.md/)
  assert.match(recovery, /MM\/development/)
  assert.match(recovery, /pilot NO-GO\/hold/)
  assert.match(recovery, /5df2575553d7998cb4429038301f762a7a2dbecb/)
  assert.match(recovery, /710082b2d8cf3c1007086df31f87b34ae8e02573/)
})

test('stale or missing evidence and unresolved decision conflicts cannot be guessed through', () => {
  assert.match(recovery, /Check the reporting branch's current tip first/)
  assert.match(recovery, /Always query GitHub for live state/)
  assert.match(recovery, /If the ledger, Command Centre, PR, or CI evidence is missing or stale/)
  assert.match(recovery, /If current founder decisions or owner instructions conflict/)
  assert.match(recovery, /pause only the affected action for resolution/)
  assert.match(recovery, /at `main` for the currently adopted baseline/)
  assert.match(recovery, /treat its policy changes as proposals/)
  assert.match(recovery, /Do not infer that an old roadmap item, pilot plan, merged PR, or passing check lifts a newer hold/)
  assert.match(recovery, /automatically loaded.*explicitly retrieved/)
  assert.match(recovery, /npm run ai:recovery:smoke/)
})

test('freshness validator rejects missing or stale checkpoints and surfaces conflicting current authorities', () => {
  const ledger = { sprintId: 'test-sprint', batches: [{ taskId: 'latest-task', nextAction: 'continue test', status: 'successful' }] }
  const dashboard = 'test-sprint latest-task continue test'
  assert.throws(() => latestExecutionCheckpoint(null), /Missing durable execution ledger/)
  assert.throws(() => latestExecutionCheckpoint({ batches: [] }), /no actionable checkpoint/)
  assert.throws(() => validateCheckpointFreshness({ liveRefSha: 'new', fetchedRefSha: 'old', ledger, dashboard }), /does not match the live reporting branch tip/)
  assert.throws(() => validateCheckpointFreshness({ liveRefSha: 'same', fetchedRefSha: 'same', ledger, dashboard: 'stale dashboard' }), /missing, stale, or conflicts/)
  assert.deepEqual(currentAuthorityConflicts([
    { authority: 'founder', scope: 'shared-scope', value: 'approved' },
    { authority: 'owner', scope: 'shared-scope', value: 'hold' },
  ]), ['shared-scope'])
  assert.throws(() => assertNoCurrentAuthorityConflicts([
    { authority: 'founder', scope: 'shared-scope', value: 'approved' },
    { authority: 'owner', scope: 'shared-scope', value: 'hold' },
  ]), /Conflicting current founder\/owner decisions/)
  assert.deepEqual(currentAuthorityConflicts([
    { authority: 'owner', scope: 'shared-scope', value: 'hold' },
    { authority: 'historical', scope: 'shared-scope', value: 'approved' },
  ]), [], 'historical notes cannot override or conflict with current authority')
})
