# QA charter — how AI Org agents test like the best QA teams

Applies to every product. Product-specific suites live in the product repo (`qa/lab/`); this file defines the method.

## Two QA roles (never the builder)
- **Quinn-Contract** — writes locked acceptance tests from the founder-approved Feature Contract before code exists.
- **Quinn-Explore** — owns the product-wide lab: generates test data, runs journeys and risk probes, keeps the scenario catalogue and traceability current, opens `ai:fix` issues. Uses the strongest available model.

## Test data — agents prepare it, founders never do
1. Deterministic persona generator (fixed seed) covering every user type in the PRD, including edge personas: empty accounts, busy accounts, archived/ended/future records, unverified identities, multilingual/emoji/HTML names, siblings, multi-provider families.
2. Data is created **as each signed-in persona through the app's own APIs/RPCs**, never by writing to tables, so preparing data is itself a test. Time-shifting (e.g. "8 days ago") is the only admin-level setup and is labelled SETUP.
3. Every persona has an **independent expected result (oracle)** computed from the contract/PRD, not from app code.
4. Fictional data only; staging/hosted runs use dedicated test accounts, never real users.

## Coverage — 12 disciplines on every feature
Functional & acceptance · negative & edge · unit logic · resilience (loading, error, offline, retry, lost response) · security & privacy (isolation per persona, data minimisation, XSS) · data integrity & DB · accessibility (axe + keyboard) · visual/responsive/cross-browser · performance & scale · localization/time zones · release & ops (smoke, CI) · code quality (lint, coverage, mutation).
Every Feature Contract must include ACs for: loading, empty, error, offline, permission denied, stale data, very large data.

## Journeys and documentation drift
- Each journey is a sequence of named steps with a screenshot per screen.
- Each screen is checked against its PRD/contract reference: correct heading and purpose, required content, **no prototype sample data or hard-coded metrics**, honest loading/error/empty states.
- Any mismatch between screen and documentation is a defect (`doc-drift`), not a note.

## Evidence and traceability
- Every test title starts with a stable ID. `testing/qa-scenarios.csv` maps requirement → scenario → test ID → latest result → evidence link. Excel reports are generated from it.
- Every isolation/security test has a **sanity guard** (it must prove it checked a real number of personas) and a **control** (the allowed action succeeds), so it cannot pass vacuously.
- Monthly **mutation check**: deliberately break one security rule in a scratch run; the lab must fail.
- Agent self-reports are never evidence; only runs, files and commits are.
- **Acceptance-test gate** (`scripts/grade-acceptance.mjs`): before any build starts, the locked spec is run against today's app and every test must be red for the right reason — failing at a new hook the spec declares (`// NEW-HOOKS:`), or explicitly marked `// GUARD:` (already works, must keep working) or `// RED-BECAUSE:`. Crashes, timeouts before any assertion, failures on existing UI without a reason, vacuous passes and missing AC IDs fail the gate. Added 2026-11-23 after the first agent-written spec failed for the wrong reason in 11 of 18 tests while its PR claimed otherwise.

## Cadence
Per PR (paths touched) and nightly on main. Report-only first; each check is promoted to blocking CI once green (ratchet). High severity = anything that can mislead a user (false success/empty/count) or expose private data — blocks merge.

## Limits stay visible
Physical devices, real hosted accounts, rollback/restore and legal checks are `Blocked` rows until a human or a staging environment runs them — never dropped.
