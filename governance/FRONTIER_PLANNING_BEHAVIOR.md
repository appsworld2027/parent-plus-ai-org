# Kiran and Leela synthetic planning artifact behavior

This is a supplemental deterministic screen of the existing frozen role tasks.
It checks decisions against observed synthetic facts, not natural-language
quality, real scheduler execution, or the full Frontier rubric.

## Interface supplied to the candidate

The controller creates `planningFixture(role,variant)` from
`scripts/frontier-planning-evaluator.mjs`. Supply its JSON and the exact
`canonicalHash(fixture)` along with the original casebook role prompt.
All facts are synthetic. Do not invent or change observations, owners,
task dependencies, or evidence.

Kiran returns `task-graph.json` and `handover.md`; Leela returns
`lane-plan.json` and `conflict-register.json`.
The graph JSON is exactly an object containing:

- fixtureHash: the provided exact hash.
- nodes: all tasks, each with id, owner, lane, dependsOn, observed, evidence
  copied from observed facts (null if no evidence).
- dispatch: a list of decisions, each with taskId, a distinct nonempty worker,
  new generation (previous + 1), the current base SHA, and expiresAt equal to
  the provided leaseUntil. Expired worker identity cannot be reused.
- reconcile: tasks that require reconciliation, each with taskId,
  fencedGeneration (the last observed generation), existingPr, current base,
  and action "inspect-pr-and-fence". Do not dispatch before verified evidence.
- ci: the observed CI value, not a prediction.

Dispatch no more than capacity and dispatchBudget. A task is ready only if its
observed state is pending or expired and every direct dependency is observed
complete. Blocked or reconcile tasks must not run. Do not dispatch tasks sharing
an exclusive resource. Use all feasible dispatch capacity, and when a pair from
both delivery lanes is independent, Leela should keep both lanes active.
Do not mark an unobserved result as completed or CI green.

Leela's conflict register is exactly an object with fixtureHash and conflicts.
Each conflict has tasks (two distinct task IDs), resources (all exact shared
exclusive resource IDs), and mode "serialize". Include conflicts even when a
task is currently blocked; no invented conflicts.

## Evidence and limitations

Six reference variants cover normal, expired lease/migration lock/unknown CI,
and interrupted PR/stale base/quota-limited recovery for both agents.
Fault controls independently reject fixture mismatch, missing nodes, owner
drift, dependency bypass and cycles, wrong evidence, false green CI, blocked
dispatch, duplicate workers, invalid lease generation, stale SHA, conflicting
API/file/schema/product effects, needless serialization, missing reconciliation
and quota overrun. Checks are deterministic and no model or provider is called.

The handover text content for Kiran is not semantically graded here.
Qualification requires native artifact output plus independent review,
trusted provenance, calibrated full rubric, and actual two-worker scheduling
and interruption/recovery evidence.
