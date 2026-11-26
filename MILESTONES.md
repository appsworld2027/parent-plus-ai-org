# Delivery milestones

## Milestone 1 — Independent organization foundation

Status: complete.

Exit evidence: private AppsWorld repository; reusable role profiles; two team
definitions; founder-conflict gate; read-only pull-request CI; merges
`1fd268616dc040ba64a199c13de4e12040d14284` and `106994be`; Actions run
`44290459150`.

## Milestone 2 — Live reusable AI roles

Status: complete.

Exit criteria: CPTO, PM A, PM B, Database, Integration, Coding, and QA execute an
independent pilot assignment; their conclusions influence the implementation; no
project-specific instruction enters reusable profiles.

Evidence: `pilot/evidence/live-roles.json`, agent profiles, and reusable-role tests.
Eleven logical positions remain six reusable specialist profiles instantiated by
team and workload, avoiding eleven continuously running agents.

## Milestone 3 — Founder synchronization

Status: complete.

Exit criteria: one decision register; routine decisions proceed under CPTO authority;
material disagreement between Ankit and Manu blocks only affected work; candidate,
QA, and CI commits must match.

Evidence: `governance/decisions/`, `org.py gate`, issue templates, and governance tests.

## Milestone 4 — Quality, reporting, and cost controls

Status: complete.

Exit criteria: pull-request tests; scheduled/dispatchable daily report; status,
blockers, decisions, quality, measured usage, missing measurements, and incremental
spend are visible; reports never invent token data.

Evidence: `.github/workflows/quality.yml`, `.github/workflows/daily-report.yml`,
`demo/status.json`, `demo/usage.jsonl`, and reporting tests.

## Milestone 5 — Independent two-team pilot

Status: complete.

Exit criteria: Team A owns a SQLite reminder adapter behind a stable public contract;
Team B validates only that contract; exact retries are idempotent; conflicting and
invalid writes are rejected; concurrent writes preserve one valid row; persistent
storage locks produce stable errors; no Parent Plus code or infrastructure is used.

Evidence: `pilot/`, `tests/test_pilot.py`, pull request #6, Actions run
`44296038392`, and merge `46d97a97a46c4454a089875147e06d557f836430`.

## Milestone 6 — Controlled Parent Plus connection

Status: discovery complete; implementation deliberately not started.

Exit evidence: `projects/parent-plus/ONBOARDING.md`, organization issue #3, and merge
`b27bce897e`. The product repository was inspected read-only and its baseline was not
modified. Product delivery remains a separate milestone with human-controlled
production release.

## Milestone 7 — Cezar and Superpowers automation

Status: complete.

Exit criteria: stable Cezar is pinned and installed; Superpowers skills are pinned,
licensed and loadable; a one-team workflow executes end to end in an isolated
worktree; two-team bounded dispatch is configured; deterministic checks and
independent QA gate delivery; daily reporting and new-PR QA automations are portable;
usage and cost are visible; no automatic merge or Parent Plus modification occurs.

Local evidence: Cezar `0.20.0`, Superpowers `7.0.2`, 15 skills, four workflows,
two enabled dry-run automations, 12 passing tests, one successful scheduled-task
launch, zero automation failures and zero reported cost.

Hosted evidence: pull request #8, Actions run `44299136249`, and merge
`74f76db09381c7b30087eabf98550c6f83ddaed7`.


## Milestone 8 — Free-only autonomous agent execution

Status: implementation branch prepared; pending CI and required caller credentials.

Scope:
- Enforce free-only Groq execution in the router and reusable worker.
- Remove Claude/Codex paid-subscription execution paths from unattended agents.
- Enable background execution by default with an explicit emergency-off variable.
- Resume paused work when the Groq free key is available.
- Replace the unavailable private-repository GitHub Pages deployment with a retained dashboard artifact.
- Record numeric Groq usage as provider/model evidence without storing transcripts.

Exit evidence required:
- AI Org quality workflow passes on the merge candidate.
- Router tests prove paid labels and credentials cannot select a paid engine.
- A real Groq free-tier tool-call probe passes.
- A supervised, synthetic task completes through discovery, plan, build, independent QA, repair and PR.
- Parent Plus and Studio private handbook checkouts succeed after owner-side deploy-key setup.
- A real product feature passes locked acceptance tests and independent review before any release.
