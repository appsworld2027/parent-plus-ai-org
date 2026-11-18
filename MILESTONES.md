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

Status: complete locally; hosted CI is the publication gate.

Exit criteria: Team A owns a SQLite reminder adapter behind a stable public contract;
Team B validates only that contract; exact retries are idempotent; conflicting and
invalid writes are rejected; concurrent writes preserve one valid row; persistent
storage locks produce stable errors; no Parent Plus code or infrastructure is used.

Evidence: `pilot/` and `tests/test_pilot.py`.

## Milestone 6 — Controlled Parent Plus connection

Status: discovery complete; implementation deliberately not started.

Exit evidence: `projects/parent-plus/ONBOARDING.md`, organization issue #3, and merge
`b27bce897e`. The product repository was inspected read-only and its baseline was not
modified. Product delivery remains a separate milestone with human-controlled
production release.
