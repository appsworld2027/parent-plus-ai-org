import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('../scripts/phase3a-execution.mjs', import.meta.url))
const draft = 'codex/founder-charter-mcp-retirement'
const reporting = 'codex/phase3a-execution'
const lock = 'refs/heads/codex/phase3a-batch-lock'

test('fresh workspaces recover published work and reconcile independent reporting changes', t => {
  const root = mkdtempSync(join(tmpdir(), 'phase3a-test-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const remote = join(root, 'remote.git')
  const run = (cwd, cmd, ...args) => execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim()
  const git = (cwd, ...args) => run(cwd, 'git', ...args)
  const cli = (cwd, ...args) => JSON.parse(run(cwd, process.execPath, script, ...args))
  const evidence = JSON.stringify({ verification: 'isolated smoke test passed', nextAction: 'independent review' })
  const clone = name => {
    const cwd = join(root, name)
    git(root, 'clone', '-q', '-b', draft, remote, cwd)
    git(cwd, 'config', 'user.name', 'Test')
    git(cwd, 'config', 'user.email', 'test@example.invalid')
    return cwd
  }
  git(root, 'init', '-q', '--bare', remote)
  const seed = join(root, 'seed')
  mkdirSync(seed)
  git(seed, 'init', '-q', '-b', draft)
  git(seed, 'remote', 'add', 'origin', remote)
  git(seed, 'config', 'user.name', 'Test')
  git(seed, 'config', 'user.email', 'test@example.invalid')
  mkdirSync(join(seed, 'governance'))
  writeFileSync(join(seed, 'governance/PHASE_3A_CHECKPOINT.md'), '# Checkpoint\n<details>backlog</details>\n')
  git(seed, 'add', '.')
  git(seed, 'commit', '-qm', 'seed')
  git(seed, 'push', '-q', 'origin', draft)
  cli(seed, 'init', 'isolated-test')

  const first = cli(seed, 'begin', 'functional-task')
  writeFileSync(join(seed, 'functional.txt'), 'recovered work\n')
  git(seed, 'add', 'functional.txt')
  git(seed, 'commit', '-qm', 'functional work')
  const original = git(seed, 'rev-parse', 'HEAD')
  const recovery = cli(seed, 'checkpoint', first.runId, original)
  assert.equal(recovery.commit, original)
  assert.throws(() => git(seed, 'push', `--force-with-lease=${lock}:`, 'origin', `HEAD:${lock}`))
  assert.throws(() => git(seed, 'push', `--force-with-lease=${lock}:${original}`, 'origin', `:${lock}`))
  // Simulate a worker that released its exact lock but was interrupted before recording its result.
  git(seed, 'push', `--force-with-lease=${lock}:${first.lockOwner}`, 'origin', `:${lock}`)

  const fresh = clone('fresh')
  const second = cli(fresh, 'begin', 'functional-task')
  assert.equal(second.number, 2)
  assert.equal(second.remainingRetries, 0)
  assert.equal(cli(fresh, 'status').batches[0].status, 'interrupted')
  git(fresh, 'fetch', 'origin', recovery.recoveryRef)
  git(fresh, 'cherry-pick', 'FETCH_HEAD')
  const result = git(fresh, 'rev-parse', 'HEAD')
  // Publish a concurrent edit to the generated checkpoint on the reporting branch only.
  const reporter = clone('reporter')
  git(reporter, 'fetch', 'origin', reporting)
  git(reporter, 'switch', '--detach', 'FETCH_HEAD')
  writeFileSync(join(reporter, 'governance/PHASE_3A_CHECKPOINT.md'), '# Concurrent checkpoint edit\n')
  git(reporter, 'commit', '-qam', 'concurrent checkpoint edit')
  git(reporter, 'push', 'origin', `HEAD:refs/heads/${reporting}`)
  assert.equal(cli(fresh, 'publish', second.runId, result).published, true)
  cli(fresh, 'finish', second.runId, 'successful', evidence)

  const third = cli(clone('third'), 'begin', 'unavailable-task')
  cli(fresh, 'finish', third.runId, 'blocked', JSON.stringify({ recovery: 'preview unavailable' }))
  assert.equal(cli(fresh, 'begin', 'fourth').status, 'limit')
  assert.equal(git(fresh, 'ls-remote', 'origin', lock), '')
  git(fresh, 'fetch', 'origin', reporting)
  const dashboard = git(fresh, 'show', 'FETCH_HEAD:governance/PHASE_3A_CHECKPOINT.md')
  assert.match(dashboard, /Consolidated Founder Dashboard/)
  assert.match(dashboard, /interrupted/)
  assert.match(dashboard, /successful/)
  assert.match(dashboard, /preview unavailable/)
  assert.equal(git(fresh, 'ls-remote', 'origin', `refs/heads/${draft}`).split(/\s/)[0], result)
})
