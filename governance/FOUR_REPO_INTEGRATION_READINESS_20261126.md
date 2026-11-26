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

## Live founder validation addendum — 2026-11-26 (Studio and free-model routing)
Evidence: founder-provided Cloud Shell outputs/screenshots, directly inspected GitHub sources. These observations supersede earlier *unverified* labels where indicated; do not equate an available role with a running worker.

### Confirmed progress
- Studio launched in Cloud Shell on port 8484; founder screenshot shows Parent Plus selected, Agents board populated from GitHub, Garage tab readable and Other models selector with NVIDIA/OpenRouter/Groq/Gemini/Ollama. Browser-based UI access **verified by founder**; no real provider model call yet.
- Garage `parent-plus/MEMORY.md` verified on GitHub, fictional marker `GARAGE-INTEGRATION-TEST-20261126` written in commit `a3ebe3487e45528a1a1db300e5469eac661ee797` and read back remotely. Founder fast-forwarded local Garage checkout `328be17 -> a3ebe34` with local `parent-plus/team-models.json` modification preserved; latest screenshot shows marker in Studio. **Manual sync and cross-surface retrieval PASS**. Automatic external-change refresh **not verified**: `server/garage.mjs` pulls at chat start, not necessarily on browser refresh. Marker remains to clean up after final recovery test.
- `studio-garage` visibility was reported by founder's `gh repo view` as **PUBLIC**, despite Studio labeling it private. Do not treat UI privacy label as authoritative; use only fictional data for test.

### Critical distinction: 11 defined roles ≠ 11 connected/running workers
- AI Org `AGENTS.md` defines 11 named AI roles. `scripts/agent-router.mjs` maps workflow stages to roles and selects an engine from **Claude, Codex, free** according to engine availability and optional labels. This is real orchestration code.
- Studio `server/team.mjs` supports per-agent model assignment and a two-model free pool. Garage's *committed* `parent-plus/team-models.json` (2026-11-24) currently assigns mostly Claude and Codex. The founder has a modified **local** copy (contents not inspected), so do not overwrite it or assume the committed assignments reflect their current Studio selection.
- `.github/workflows/agent-worker.yml` uses `vars.UNATTENDED_AGENTS == 'on'` as the master switch and presence of `NVIDIA_NIM_API_KEY` to make the free engine available; Studio's **Keys** configuration is local to Studio and is **not** the same as GitHub Actions secrets. Neither the GitHub variable's live value nor NVIDIA credential availability was verified. No active worker has been demonstrated.
- Free-engine worker uses Free Claude Code as an execution adapter with NVIDIA NIM models; **this is not Claude subscription login**, but the tool's name can confuse users. Founder explicitly wants Claude and Codex logged out for pilots. Do not silently route to either paid-subscription engine.
- Studio `Other models` chat is an interactive tool-using agent for a selected product; it is **not automatically** the unattended GitHub Actions worker. Studio's published team plan says the router *may* read it, while the inspected router uses available engine secrets, stage and manifest overrides; live end-to-end consumption of team-models.json is unproven.

### Pilot path authorized by founder preference
1. Keep Claude Code and Codex logged out; use NVIDIA/free models only for the first controlled test, without enabling unattended GitHub Actions.
2. In Studio **Other models → Keys**, check whether an NVIDIA key is already configured (do not paste it into chat). If not, connect a free NVIDIA key through Studio's UI. Then select NVIDIA and a model, create a new chat in a disposable product workspace, and ask for a short non-destructive response. Record actual provider/model, response, errors, and whether any tool execution was requested.
3. Validate builder/reviewer assignments using the two distinct free NVIDIA models; keep Parent Plus production and MM/development unchanged. Never overwrite the locally modified team-models.json merely to make it match the older remote plan.
4. Use a separate small disposable pilot repository/product, not Parent Plus, for a complete contract → build → test → review demonstration. Confirm available engine credential and master switch before enabling any unattended workflow. No merges/deployments without existing gates.
5. After the final memory-recovery test, remove only the explicitly fictional Blue Kite marker while preserving unrelated changes and logs.

### Exact next founder interaction
Open Studio **Other models → Keys** and report whether NVIDIA shows *Connected/Key saved* or *Needs key*. Then perform one simple new-chat reply. No Claude/Codex login and no background worker activation required for this step.
