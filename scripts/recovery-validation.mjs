export function latestExecutionCheckpoint(ledger) {
  if (!ledger || !Array.isArray(ledger.batches)) throw new Error('Missing durable execution ledger')
  if (ledger.continuation !== undefined) {
    if (!ledger.continuation?.taskId || !ledger.continuation?.nextAction) throw new Error('Ledger has no actionable continuation checkpoint')
    return ledger.continuation
  }
  const latest = ledger.batches.filter(batch => batch?.status !== 'skipped').at(-1)
  if (!latest?.taskId || !latest?.nextAction) throw new Error('Ledger has no actionable checkpoint')
  return latest
}

export function validateCheckpointFreshness({ liveRefSha, fetchedRefSha, ledger, dashboard }) {
  if (!liveRefSha || !fetchedRefSha || liveRefSha !== fetchedRefSha) {
    throw new Error('Fetched checkpoint does not match the live reporting branch tip')
  }
  const latest = latestExecutionCheckpoint(ledger)
  if (!dashboard || !dashboard.includes(ledger.sprintId) || !dashboard.includes(latest.taskId) || !dashboard.includes(latest.nextAction)) {
    throw new Error('Command Centre is missing, stale, or conflicts with the latest ledger checkpoint')
  }
  return latest
}

export function currentAuthorityConflicts(records) {
  const grouped = new Map()
  for (const record of records ?? []) {
    if (!['founder', 'owner'].includes(record?.authority) || !record.scope || record.value == null) continue
    const values = grouped.get(record.scope) ?? new Set()
    values.add(String(record.value))
    grouped.set(record.scope, values)
  }
  return [...grouped.entries()].filter(([, values]) => values.size > 1).map(([scope]) => scope)
}

export function assertNoCurrentAuthorityConflicts(records) {
  const conflicts = currentAuthorityConflicts(records)
  if (conflicts.length) throw new Error(`Conflicting current founder/owner decisions for: ${conflicts.join(', ')}`)
}
