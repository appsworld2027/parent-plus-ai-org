# Four-repository integration readiness audit — 2026-11-26

Status: **Audit completed; integration not yet validated; Parent Plus pilot NO-GO**.
Scope: GitHub source and metadata inspection only. No live Studio launch, Garage round-trip, Codex worker, deployed app acceptance, or local tests were executed by this audit.
Evidence labels: **Verified** = GitHub content/metadata inspected directly; **Reported** = historical test or checkpoint statement; **Unverified** = runtime behavior not exercised.

## Founder executive decision
Continue safe read-only and non-production integration validation. Do not merge PRs, promote MM code, authorize reviewers, use production credentials, change worker sandbox/permissions, or start the Parent Plus pilot. No new founder decision is needed for a test plan or read-only audit. Isolated worker and disposable credential require separate explicit authorization.

## Systems and evidence

| System | Verified existing implementation | Current state / gap |
| --- | --- | --- |
| AI Org (appsworld2027/parent-plus-ai-org) | Governance, AGENTS.md, recovery source order, Cezar/Superpowers automation documentation, Phase 3A ledger, draft reporting reconciliation | PR #68 head `99c65dcc560b88a77594416c05d9666f91b07720` open draft; Organization quality and adapter enforcement checks succeeded. Actual isolated worker/auth and cross-engine recovery remain unverified. |
| Studio (appsworld2027/ai-org-studio) | Chat-first UI described in README; server/garage.mjs implements per-product memory pack, journaling and git-based sync; server/status.mjs maps GitHub issues/workflow runs into agent board | Studio PR #10 head `fe5448508e6c7599d89abba849f97869619619af` open draft, Studio checks succeeded. Runtime launch, real chat, live agent status and approval flow not exercised here. |
| Garage (appsworld2027/studio-garage) | README specifies per-product MEMORY.md, journal, artifact folders, team-models.json | README-level contract verified. No root MEMORY.md found (not required by per-product design). Live product-folder persistence, remote synchronization, privacy controls and fresh-session recovery not verified. |
| Parent Plus (appsworld2027/Parent-plus-) | README and MM/development PROGRESS.md show Coach/Parent app, extensive historical tests and prototype work | Current instruction confines MM work to MM/development; main promotion requires fresh explicit owner authorization. Product testing/production readiness not revalidated in this audit. |

## Authoritative sources (explicitly retrieved)
- AI Org draft: `AGENTS.md`, `governance/FOUNDER_DASHBOARD.md`, `governance/SESSION_RECOVERY.md`, `governance/PHASE_3A_CHECKPOINT.md` at `codex/founder-charter-mcp-retirement`; PR #68 and head CI.
- AI Org Phase 3A continuation: `governance/phase3a-execution.json` at `codex/phase3a-execution`; latest recorded continuation is **blocked** on isolated Codex worker and disposable credential. Preserve this authoritative pointer; this audit is not a replacement execution ledger.
- Studio `README.md`, `package.json`, `server/garage.mjs`, `server/status.mjs` at `main`; PR #10 and head CI.
- Garage `README.md` at `main`.
- Parent Plus `README.md` at `main`, `PROGRESS.md` and `ai-workspace/development/SHARED_DEVELOPMENT_WORKFLOW.md` at `MM/development`.
- Source inspection does not establish exact currently deployed revisions, hosted availability, worker identity isolation or subscription consumption.

## Prioritized controlled execution plan

### A. Studio–Garage integration acceptance (non-production, no production secrets)
1. Verify an authorized non-production Studio environment and safe fictional test product. Do not expose Studio publicly or copy provider credentials.
2. Start Studio; confirm UI loads and can read authorized product and AI Org GitHub status. Record exact source SHA, start method and test environment.
3. Create a **fictional** test decision via the authorized Studio flow. Confirm it is written to the expected per-product Garage MEMORY.md/journal and remotely persisted if the intended implementation calls for a push. Inspect for secrets and personal data.
4. Restart Studio/new session; verify retrieval of the same decision and that it is not silently treated as approved product policy. Test missing/stale memory and Git sync failure. Confirm failure is reported, not masked.
5. Capture reproducible logs/tests and cleanup. Mark PASS only on observed runtime evidence.

### B. AI Org worker security (separate blocked dependency)
1. Produce a minimal threat model and acceptance test plan for `.github/workflows/agent-worker.yml`, particularly `--dangerously-bypass-approvals-and-sandbox`, CODEX_AUTH_JSON scope, job permissions and refresh behavior.
2. Require authorized isolated disposable environment and disposable credential before actual execution. No production credential transfer.
3. Prove containment, step-level credential access, token refresh, failure isolation, least-privilege correction and rollback before changing live worker configuration.
4. Keep independent reviewer authorization deferred; do not impersonate or assign identities.

### C. End-to-end organization demonstration (only after A and B pass)
Use a disposable non-production feature: founder request -> AI PM brief -> specialist implementation -> automated tests -> independent QA -> Studio founder view -> Garage checkpoint -> new-session recovery. Do not merge/deploy or lift the pilot hold without existing explicit gates.

## Cross-repo acceptance evidence required
- Runtime environment and source SHA for each component.
- Reproducible steps and actual outputs for Studio launch, GitHub board read, Garage write/read, restart recovery.
- Auth/sandbox isolation evidence before any Codex worker permission changes.
- Test scope, passing/failing/skipped counts, provenance and known gaps.
- Separate founder decision log for any material authorization.
- No invented progress percentage: full cross-repo denominator is unavailable.

## Exact next action
Owner: authorized AI Org/Studio implementer.
Execute **A1–A2** in a safe non-production environment if available; otherwise prepare the exact environment prerequisites and stop at the missing access. Do not claim an active worker or scheduled run without evidence. In parallel, produce B1 threat model as a read-only artifact. Update the existing Phase 3A ledger/checkpoint only through its authorized branch and workflow, retaining the current worker-blocked continuation.

## Session handover
Lifecycle: CONTINUE for safe planning/integration investigation; ESCALATE only when a non-production worker/credential or consequential permission is needed.
Context utilization, actual token counts, expenditure and next scheduled execution: unavailable.
This audit is a navigation artifact, not a replacement for the existing authoritative ledger or owner rules. New sessions must follow `governance/SESSION_RECOVERY.md` and verify live PR heads/checks before acting.
