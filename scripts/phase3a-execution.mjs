#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const draft = 'refs/heads/codex/founder-charter-mcp-retirement'
const lock = 'refs/heads/codex/phase3a-batch-lock'
const reporting = 'refs/heads/codex/phase3a-execution'
const ledgerFile = 'governance/phase3a-execution.json'
const dashboardFile = 'governance/PHASE_3A_CHECKPOINT.md'
const limit = 3
const statuses = new Set(['successful', 'failed', 'blocked', 'skipped'])
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', timeout: 30000 }).trim()
const head = ref => git('ls-remote', '--refs', 'origin', ref).split(/\s/)[0]
const fetchCommit = ref => {
  git('fetch', '--quiet', 'origin', ref)
  return git('rev-parse', 'FETCH_HEAD')
}
const now = () => new Date().toISOString()
const text = value => String(value ?? 'Unavailable').replaceAll('|', '&#124;').replace(/\s+/g, ' ')
const refFor = id => `refs/heads/codex/recovery/${id}`

function commit(parent, message, files = {}) {
  const dir = mkdtempSync(join(tmpdir(), 'phase3a-index-'))
  const env = { ...process.env, GIT_INDEX_FILE: join(dir, 'index') }
  const run = (args, input) => execFileSync('git', args, { env, input, encoding: 'utf8', timeout: 30000 }).trim()
  try {
    run(['read-tree', parent])
    for (const [path, content] of Object.entries(files)) {
      const blob = run(['hash-object', '-w', '--stdin'], content)
      run(['update-index', '--add', '--cacheinfo', `100644,${blob},${path}`])
    }
    return run(['-c', 'user.name=AppsWorld Codex', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com',
      'commit-tree', run(['write-tree']), '-p', parent, '-m', message])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

const push = (ref, value, expected) => git('push', '--quiet', `--force-with-lease=${ref}:${expected}`, 'origin', `${value}:${ref}`)
function read() {
  const parent = fetchCommit(reporting)
  return { parent, ledger: JSON.parse(git('show', `${parent}:${ledgerFile}`)) }
}

function render(ledger, backlog) {
  const rows = ledger.batches.map(batch => `| ${batch.number} | ${text(batch.taskId)} | ${batch.status} | ${text(batch.resultCommit)} | ${text(batch.verification)} | ${text(batch.recovery)} | ${text(JSON.stringify(batch.resources))} | ${text(batch.nextAction)} |`)
  const final = ledger.batches.length === limit && ledger.batches.every(batch => batch.completedAt)
  return [
    '# AI Org Development Command Centre', '',
    `Sprint **${ledger.sprintId}** · **${final ? 'Consolidated Founder Dashboard' : 'Sprint in progress'}**`, '',
    '| Batch | Task | Outcome | Published commit | Verification and CI | Recovery / blocker | Resources | Next action |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |', ...rows, '',
    'The Parent Plus pilot remains **NO-GO**. MM restrictions and independent review remain in effect.', '',
    '[AI Org draft #68](https://github.com/appsworld2027/parent-plus-ai-org/pull/68) · [Studio #9](https://github.com/appsworld2027/ai-org-studio/pull/9) · [Studio #10](https://github.com/appsworld2027/ai-org-studio/pull/10) · [Execution ledger](phase3a-execution.json)', '',
    backlog,
  ].join('\n') + '\n'
}

function save(parent, ledger, expected = parent) {
  const backlog = git('show', `${parent}:governance/phase3a-backlog.md`)
  const result = commit(parent, 'Record Phase 3A execution evidence', {
    [ledgerFile]: JSON.stringify(ledger, null, 2) + '\n',
    [dashboardFile]: render(ledger, backlog),
  })
  push(reporting, result, expected)
}

function update(edit) {
  for (let attempt = 0; attempt <= 1; attempt++) {
    const { parent, ledger } = read()
    const result = edit(ledger)
    if (!result) return
    try {
      save(parent, ledger)
      return result
    } catch (error) {
      if (attempt || head(reporting) === parent) throw error
    }
  }
}

function owned(ledger, id) {
  const batch = ledger.batches.find(item => item.runId === id && item.status === 'running')
  if (!batch || head(lock) !== batch.lockOwner) throw new Error('Run does not own the GitHub lock')
  return batch
}

function begin(taskId) {
  const { ledger } = read()
  if (ledger.batches.length >= limit) return { status: 'limit' }
  const runId = randomUUID()
  const baseCommit = fetchCommit(draft)
  const lockOwner = commit(baseCommit, `Phase 3A lock ${runId}`)
  let acquired = false
  if (!head(lock)) {
    try { push(lock, lockOwner, ''); acquired = true } catch (error) {
      const current = head(lock)
      if (current === lockOwner) acquired = true
      else if (!current) throw error
    }
  }
  try {
    const result = update(current => {
      if (current.batches.length >= limit) return
      if (acquired) {
        for (const item of current.batches.filter(batch => batch.status === 'running')) {
          const recovery = head(refFor(item.runId))
          const published = recovery && recovery === baseCommit
          Object.assign(item, { status: 'interrupted', completedAt: now(),
            resultCommit: published ? recovery : null,
            recovery: recovery || 'No recovery ref was published',
            nextAction: published ? 'Verify published commit and draft CI' : recovery ? 'Fetch recovery ref and verify before publishing' : 'Reconstruct from the latest draft' })
        }
      }
      const previous = current.batches.findLast(item => item.taskId === taskId && item.status !== 'skipped')
      const isRetry = previous && ['interrupted', 'failed', 'blocked'].includes(previous.status)
      const exhausted = isRetry && previous.remainingRetries === 0
      const running = acquired && !exhausted
      const batch = {
        sprintId: current.sprintId, number: current.batches.length + 1, runId, taskId,
        status: running ? 'running' : 'skipped', baseCommit, resultCommit: null, startedAt: now(),
        completedAt: running ? null : now(), lockOwner: acquired ? lockOwner : null,
        verification: null, recovery: exhausted ? 'Retry allowance exhausted' : acquired ? null : 'Another run owns the lock',
        remainingRetries: isRetry ? 0 : 1, resources: {},
        nextAction: exhausted ? 'Select a different eligible task' : acquired ? 'Implement and persist recovery commit' : 'Wait for the lock owner',
      }
      current.batches.push(batch)
      return batch
    })
    if (acquired && result?.status !== 'running') push(lock, '', lockOwner)
    return result ?? { status: 'limit' }
  } catch (error) {
    if (acquired) push(lock, '', lockOwner)
    throw error
  }
}

function persist(id, sha, publish) {
  const { ledger } = read()
  const batch = owned(ledger, id)
  if (Date.now() - Date.parse(batch.startedAt) >= 25 * 60000) throw new Error('Development window ended')
  if (!/^[a-f0-9]{40}$/.test(sha)) throw new Error('An exact commit SHA is required')
  git('merge-base', '--is-ancestor', batch.baseCommit, sha)
  const ref = refFor(id)
  const previous = head(ref)
  if (previous && previous !== sha) {
    fetchCommit(ref)
    git('merge-base', '--is-ancestor', previous, sha)
  }
  if (previous !== sha) push(ref, sha, previous)
  if (publish) {
    if (head(draft) !== batch.baseCommit) throw new Error('Draft moved. The recovery commit remains available.')
    push(draft, sha, batch.baseCommit)
  }
  return { recoveryRef: ref, commit: sha, published: publish }
}

function finish(id, status, evidence) {
  if (!statuses.has(status)) throw new Error('Invalid terminal status')
  const batch = update(ledger => {
    const item = owned(ledger, id)
    const recovery = head(refFor(id))
    const published = recovery && head(draft) === recovery
    if (status === 'successful' && (!published || !evidence.verification)) throw new Error('Success requires publication and verification')
    Object.assign(item, {
      status, completedAt: now(), resultCommit: published ? recovery : null,
      verification: evidence.verification ?? null, recovery: evidence.recovery ?? (recovery || null),
      resources: evidence.resources ?? {}, nextAction: evidence.nextAction ?? null,
    })
    return item
  })
  push(lock, '', batch.lockOwner)
  return batch
}

const [action, arg, value, extra] = process.argv.slice(2)
let result
switch (action) {
  case 'init': {
    if (head(reporting)) throw new Error('Execution ledger already exists')
    const base = fetchCommit(draft)
    const backlog = git('show', `${base}:${dashboardFile}`).split('<details>')[1]
    const parent = commit(base, 'Seed Phase 3A development backlog',
      { 'governance/phase3a-backlog.md': backlog ? '<details>' + backlog + '\n' : '' })
    save(parent, { sprintId: arg, batches: [] }, '')
    result = { reporting }
    break
  }
  case 'status': result = read().ledger; break
  case 'begin':
    if (!arg) throw new Error('A task ID is required')
    result = begin(arg)
    break
  case 'checkpoint': result = persist(arg, value, false); break
  case 'publish': result = persist(arg, value, true); break
  case 'finish': result = finish(arg, value, JSON.parse(extra ?? '{}')); break
  default: throw new Error('Use init, status, begin, checkpoint, publish or finish')
}
console.log(JSON.stringify(result))
