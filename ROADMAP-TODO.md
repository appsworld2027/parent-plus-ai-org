# AppsWorld AI Organization — Execution TODO

**Baseline:** `main` at the current consolidated AI Organization release  
**Owner:** Codex acting as CPTO/CTO  
**Products:** Product-agnostic core; Parent Plus is the first adapter

## Operating rule

Routine planning, implementation, testing, reporting, and remediation proceed autonomously. Founder involvement is limited to product direction, material conflicts, paid services, credentials/secrets, production actions, and legal/privacy decisions.

## Milestone plan

### M1 — Core organization usable ✅

- Keep `main` as the only long-lived branch.
- Maintain reusable CPTO, PM, Database, Integration, Coding, and QA role definitions.
- Validate Cezar/Superpowers/skills/workflows with `npm run ai:verify`.

**Exit:** validator passes and the repository can be connected to a product through an adapter.

### M2 — Product adapter enforcement ✅

- Require `.ai-org/manifest.json` in connected product repositories.
- Run adapter validation in pull requests.
- Keep product-specific requirements in the product repository.

**Exit:** a product pull request fails when the adapter is missing or invalid.

### M3 — Parent Plus quality baseline 🟡

- Merge the Parent Plus feature/scenario/traceability registry PR after checks.
- Install dependencies in a clean runner and execute typecheck/unit tests.
- Execute Parent and Coach journeys using disposable data.
- Record every execution in `testing/test-matrix.csv` and `.xlsx`.

**Exit:** no required scenario remains unclassified; all unexecuted scenarios are explicitly `NOT RUN` or `BLOCKED`.

### M4 — Defect discovery and remediation 🟡

- Run scheduled feature inventory.
- Deduplicate inventory issues.
- Route each issue to Database, Integration, Coding, QA, or PM.
- Create an isolated remediation branch and draft PR.
- Run independent quality checks before merge.

**Exit:** every discovered issue has an owner, evidence, status, and next action.

### M5 — Full quality gates 🟡

- Add browser/UI/accessibility/responsive tests.
- Add authorization/privacy/media tests.
- Add API contract and database migration tests.
- Add performance, resilience, recovery, and rollback tests.
- Enforce release decision from evidence, not documentation.

**Exit:** release gate reports coverage and pass rate separately; failed or unrun critical tests block release.

### M6 — Autonomous runtime ⚠️

- Provide an authenticated Codex-compatible runner for Cezar.
- Configure scheduled read-only inventory and issue routing.
- Keep production deployment and rollback behind explicit production authorization.
- Add cost/usage telemetry when the runtime exposes usage data.

**Exit:** a scheduled run can discover, route, test, and prepare remediation without manual prompting; no claim of full live autonomy until an actual run proves it.

## Immediate task backlog

| ID | Task | Dependency | Acceptance evidence | Priority |
|---|---|---|---|---|
| TODO-01 | Merge Parent Plus QA baseline PR | GitHub checks | PR merged with artifact links | P0 |
| TODO-02 | Repair clean npm dependency install | Runner/cache | `npm ci` completes | P0 |
| TODO-03 | Run Parent Plus typecheck and unit tests | TODO-02 | CI run URLs and matrix rows | P0 |
| TODO-04 | Run Parent/Coach E2E journeys | TODO-02, test data | Playwright evidence | P0 |
| TODO-05 | Execute authorization/privacy/media scenarios | Disposable database | PASS/FAIL evidence | P0 |
| TODO-06 | Resolve duplicate batch and invitation-loop gaps | TODO-04/05 | Issue, fix PR, retest | P1 |
| TODO-07 | Add accessibility/responsive/browser coverage | TODO-04 | Browser evidence | P1 |
| TODO-08 | Add performance/reliability/recovery coverage | TODO-03 | Benchmark and recovery evidence | P1 |
| TODO-09 | Validate scheduled inventory workflow | Product adapter | Hosted workflow run | P1 |
| TODO-10 | Validate live Codex/Cezar runner | Authenticated runtime | Successful dry-run execution | P1 |
| TODO-11 | Configure cost reporting | Runtime usage source | Daily usage artifact | P2 |
| TODO-12 | Define production rollback runbook | Production authorization | Tested rollback evidence | P2 |

## Dependency order

```text
TODO-02 → TODO-03 → TODO-04 → TODO-05
                         ↓
              TODO-06 / TODO-07 / TODO-08
                         ↓
              TODO-09 → TODO-10 → TODO-11
                         ↓
                       TODO-12
```

## Definition of done

The organization is operational when the core validator passes, every connected product has a valid adapter, scheduled discovery works, remediation PRs are generated in isolation, quality evidence is produced automatically, and release gates prevent claims of success when critical coverage is missing.
