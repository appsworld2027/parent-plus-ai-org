#!/usr/bin/env node
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assertNoCurrentAuthorityConflicts, latestExecutionCheckpoint, validateCheckpointFreshness } from './recovery-validation.mjs'

const orgRepo = 'https://github.com/appsworld2027/parent-plus-ai-org.git'
const parentRepo = 'https://github.com/appsworld2027/Parent-plus-.git'
const draftBranch = 'codex/founder-charter-mcp-retirement'
const ledgerBranch = 'codex/phase3a-execution'
const ownerBranch = 'MM/development'
const root = mkdtempSync(join(tmpdir(), 'fresh-session-recovery-'))
const run = (cwd, command, ...args) => execFileSync(command, args, {
  cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000,
}).trim()
const git = (cwd, ...args) => run(cwd, 'git', ...args)
const remoteSha = (cwd, url, ref) => git(cwd, 'ls-remote', '--refs', url, ref).split(/\s+/)[0]
try {
  const emptyWorkspace = join(root, 'empty')
  const org = emptyWorkspace
  const parent = join(root, 'parent-plus')
  const cwd = root
  run(cwd, 'mkdir', emptyWorkspace)
  assert.equal(existsSync(join(emptyWorkspace, '.git')), false, 'workspace begins with no repository checkout')
  git(cwd, 'clone', '--quiet', '--depth=1', '--branch', draftBranch, orgRepo, org)

  const guide = git(org, 'show', `HEAD:governance/SESSION_RECOVERY.md`)
  const agents = git(org, 'show', 'HEAD:AGENTS.md')
  const charter = git(org, 'show', 'HEAD:FOUNDER_OPERATING_CHARTER.md')
  const standard = git(org, 'show', 'HEAD:governance/PERSONAL_OPERATING_STANDARD.md')
  const reportingStandard = git(org, 'show', 'HEAD:governance/FOUNDER_DASHBOARD.md')
  for (const source of [agents, charter, standard, guide]) assert.match(source, /FOUNDER_DASHBOARD\.md/)
  assert.match(reportingStandard, /Exact response template/)
  assert.match(reportingStandard, /When rich delivery is unsupported or unconfirmed/)
  const decisions = git(org, 'show', 'HEAD:governance/decisions/LOG.md')
  const adoptedTipBefore = remoteSha(cwd, orgRepo, 'refs/heads/main')
  git(org, 'fetch', '--quiet', '--depth=1', 'origin', 'refs/heads/main')
  const adoptedTip = git(org, 'rev-parse', 'FETCH_HEAD')
  assert.equal(adoptedTip, adoptedTipBefore, 'adopted instruction fetch matches live main tip')
  const adoptedAgents = git(org, 'show', `${adoptedTip}:AGENTS.md`)
  assert.match(agents, /If the workspace starts empty, explicitly retrieve this file from GitHub/)
  assert.match(adoptedAgents, /Founder contract/)
  assert.match(charter, /authoritative governance source/)
  assert.match(standard, /Session lifecycle/)
  assert.match(decisions, /AI Org v3 QA pilot/)
  assert.match(guide, /codex\/phase3a-execution/)
  assert.match(guide, /ai-workspace\/development\/SHARED_DEVELOPMENT_WORKFLOW\.md/)

  const ledgerTipBefore = remoteSha(cwd, orgRepo, `refs/heads/${ledgerBranch}`)
  assert.ok(ledgerTipBefore, 'durable execution branch exists')
  git(org, 'fetch', '--quiet', '--depth=1', 'origin', `refs/heads/${ledgerBranch}`)
  const ledgerTip = git(org, 'rev-parse', 'FETCH_HEAD')
  assert.equal(ledgerTip, ledgerTipBefore, 'ledger fetch matches the live branch tip')
  const ledger = JSON.parse(git(org, 'show', `${ledgerTip}:governance/phase3a-execution.json`))
  const dashboard = git(org, 'show', `${ledgerTip}:governance/PHASE_3A_CHECKPOINT.md`)
  assert.ok(ledger.sprintId && Array.isArray(ledger.batches) && ledger.batches.length, 'durable checkpoint exists')
  const latest = validateCheckpointFreshness({ liveRefSha: ledgerTipBefore, fetchedRefSha: ledgerTip, ledger, dashboard })
  assert.match(dashboard, /NO-GO/)
  assert.match(dashboard, /MM restrictions/)

  git(cwd, 'clone', '--quiet', '--depth=1', '--branch', ownerBranch, parentRepo, parent)
  const ownerTip = git(parent, 'rev-parse', 'HEAD')
  assert.equal(ownerTip, remoteSha(cwd, parentRepo, `refs/heads/${ownerBranch}`), 'owner source matches live MM tip')
  const ownerWorkflow = git(parent, 'show', `${ownerTip}:ai-workspace/development/SHARED_DEVELOPMENT_WORKFLOW.md`)
  assert.match(ownerWorkflow, /Current owner instruction/)
  assert.match(ownerWorkflow, /MM\/development/)
  assert.match(ownerWorkflow, /do not create more MM task branches or work on `main`/)
  assert.match(ownerWorkflow, /new explicit owner instruction/)
  const ownerBranchDecision = ownerWorkflow.match(/MM uses one canonical development branch, `([^`]+)`/)?.[1]
  const pilotDecision = dashboard.match(/Parent Plus pilot remains \*\*([^*]+)\*\*/)?.[1]
  assert.ok(ownerBranchDecision && pilotDecision, 'authoritative owner and hold records were recovered')
  assertNoCurrentAuthorityConflicts([
    { authority: 'owner', scope: 'Parent Plus MM development branch', value: ownerBranchDecision },
    { authority: 'founder', scope: 'Parent Plus pilot authorization', value: pilotDecision },
  ])

  const pr = JSON.parse(run(cwd, 'gh', 'api', 'repos/appsworld2027/parent-plus-ai-org/pulls/68'))
  const draftTip = remoteSha(cwd, orgRepo, `refs/heads/${draftBranch}`)
  assert.equal(git(org, 'rev-parse', 'HEAD'), draftTip, 'retrieved draft instructions match the live branch tip')
  assert.equal(pr.head.sha, draftTip, 'live PR head matches its branch')
  const checks = JSON.parse(run(cwd, 'gh', 'api', `repos/appsworld2027/parent-plus-ai-org/commits/${pr.head.sha}/check-runs`))
  assert.ok(Array.isArray(checks.check_runs), 'live CI response is available')
  assert.ok(checks.check_runs.every(check => check.head_sha === pr.head.sha), 'all retrieved checks belong to the current PR head')

  assert.match(guide, /A newer durable execution checkpoint wins for next action/)
  assert.match(guide, /If the ledger, Command Centre, PR, or CI evidence is missing or stale/)
  assert.match(guide, /If current founder decisions or owner instructions conflict/)
  assert.match(guide, /pause only the affected action for resolution/)
  const roadmap = git(org, 'show', 'HEAD:ROADMAP-TODO.md')
  const staleRoadmapConflict = roadmap.includes('TODO-01 | Merge Parent Plus QA baseline PR') && !latest.nextAction.includes('Merge Parent Plus QA baseline PR')
  if (staleRoadmapConflict) assert.match(guide, /Treat them as historical when their task state conflicts with the ledger/)

  console.log(JSON.stringify({
    result: 'PASS',
    initialWorkspace: 'empty; no checkout was present before recovery',
    sourceLoading: { automaticallyLoaded: [], explicitlyRetrieved: ['AI Org main AGENTS', 'active-branch AGENTS, charter, personal standard, Founder Dashboard and decisions', 'phase3a ledger and Command Centre', 'Parent Plus owner workflow', 'live PR and check-runs'] },
    adoptedInstructionSource: `appsworld2027/parent-plus-ai-org@${adoptedTip}:AGENTS.md`,
    instructionSource: `appsworld2027/parent-plus-ai-org@${draftTip}:AGENTS.md`,
    reportingStandardSource: `appsworld2027/parent-plus-ai-org@${draftTip}:governance/FOUNDER_DASHBOARD.md`,
    checkpointSource: `appsworld2027/parent-plus-ai-org@${ledgerTip}:governance/phase3a-execution.json`,
    commandCentreSource: `appsworld2027/parent-plus-ai-org@${ledgerTip}:governance/PHASE_3A_CHECKPOINT.md`,
    recoveredTask: latest.taskId,
    recoveredNextAction: latest.nextAction,
    recoveredOwnerBranchDecision: ownerBranchDecision,
    recoveredPilotStatus: pilotDecision,
    staleRoadmapItemDetected: staleRoadmapConflict,
    parentOwnerSource: `appsworld2027/Parent-plus-@${ownerTip}:ai-workspace/development/SHARED_DEVELOPMENT_WORKFLOW.md`,
    activePullRequest: { number: pr.number, state: pr.state, draft: pr.draft, head: pr.head.sha, checks: checks.check_runs.map(({ name, status, conclusion }) => ({ name, status, conclusion })) },
    writes: 'none; temporary read-only clones removed',
  }, null, 2))
} finally {
  rmSync(root, { recursive: true, force: true })
}
