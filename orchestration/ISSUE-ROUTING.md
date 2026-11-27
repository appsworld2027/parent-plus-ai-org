# Approved-plan issue routing

`route-approved-plan.yml` converts an approved product plan into PM and specialist issues.

It always creates an auditable bundle under `orchestration/issue-bundles/`. It creates remote Parent Plus issues only when the optional `PARENT_PLUS_TOKEN` secret is present with issue-write permission.

This preserves a truthful state: a generated bundle is not reported as remote assignment unless GitHub confirms issue creation.

## Executable agent stages

The reusable AI Org router maps these `ai:*` labels to the 11 role definitions:

| Label | Role | Purpose |
|---|---|---|
| `ai:discovery` | Maya — AI Product Manager | Product discovery and feature contract |
| `ai:plan` | Arjun — AI CPTO | Architecture and technical plan |
| `ai:lane-a` | Kiran — Project Manager A | Decompose and coordinate Lane A |
| `ai:lane-b` | Leela — Project Manager B | Decompose and coordinate Lane B |
| `ai:design` | Iris — Product Designer | UX flows, screen states and design specification |
| `ai:database` | Tara — Database Specialist | Schema, migrations, RLS and data-access work |
| `ai:integration` | Ravi — Integration Specialist | APIs, authentication and external integrations |
| `ai:tests` | Quinn — QA Specialist | Author locked acceptance tests |
| `ai:tests-review` | Quinn — QA Specialist | Independent challenge of locked tests |
| `ai:tests-signoff` | Arjun — AI CPTO | Accountable test sign-off |
| `ai:build` / `ai:fix` | Dev — Coding Specialist | Implementation and defect repair |
| `ai:qa` | Quinn — QA Specialist | Independent execution and verification |
| `ai:review` | Rex — Code Reviewer | Independent code review |
| `ai:release-ops` | Sam — Release & DevOps | Release-readiness evidence and operational checks |

The deterministic `ai:contract`, `ai:delivery` and `ai:release` lifecycle stages remain loop-controller owned; they do not start a model worker. Tara and Ravi may also own scoped `ai:build`/`ai:fix` tasks when the issue explicitly says `Owner: Tara` or `Owner: Ravi`.

All background stages are constrained by `governance/AUTONOMY_POLICY.json`: free Groq models only, no paid fallback. The stage map determines role assignment; it does not prove that a worker ran. Runtime evidence must come from the GitHub Actions run and its report.
