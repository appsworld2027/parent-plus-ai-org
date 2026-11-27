# Interactive session recovery

Use this source order at session start, when resuming work, and before reporting project status. Retrieve each source at its named repository and ref. These are pointers to existing instructions and records, not replacement copies of founder decisions.

## 1. Authoritative instructions and founder decisions

Read `AGENTS.md`, `FOUNDER_OPERATING_CHARTER.md`, `governance/PERSONAL_OPERATING_STANDARD.md`, and `governance/decisions/LOG.md` from `appsworld2027/parent-plus-ai-org` at `main` for the currently adopted baseline. Then read those files from the active work branch to identify branch-specific changes. Explicitly retrieve [the Founder Dashboard standard](FOUNDER_DASHBOARD.md) from the authorized revision before substantial reporting. If it is absent from the adopted baseline, check the explicitly authorized draft and record the source. Until an unmerged draft is adopted by an explicit founder decision or merged through its gates, treat its policy changes as proposals; never use a draft to widen permissions. If no checkout is present, use connected GitHub tools to retrieve the files by path/ref first; if those are unavailable, clone the named repository into the workspace. A blank Codex Cloud workspace does not auto-load repository files.

For Parent Plus owner authority, retrieve `ai-workspace/development/SHARED_DEVELOPMENT_WORKFLOW.md` from `appsworld2027/Parent-plus-`, branch `MM/development`. `docs/SHARED_DEVELOPMENT_WORKFLOW.md` is only a move notice. The latest owner instruction in this workflow is branch-specific: MM work stays on `MM/development`; do not work on `main` or promote MM changes without a new explicit owner instruction. Check the live branch tip before relying on a commit reference. At this checkpoint the observed tip was `710082b2d8cf3c1007086df31f87b34ae8e02573`.

## 2. Latest active execution checkpoint and ledger

**Current AI Org / Studio / Garage programme (27 November 2026):** recover from existing [programme issue #82](https://github.com/appsworld2027/parent-plus-ai-org/issues/82) and its latest verified checkpoint comments, then validate the current default branch tips, exact-head PR checks, reviews, and run receipts on GitHub. The issue is the ongoing programme record; older status text in its body is historical where contradicted by newer verified comments. Do not create a second programme ledger. The founder's latest scope excludes Parent Plus implementation until separately authorized.

The former reporting branch `codex/phase3a-execution` was not resolvable on GitHub during the 27 November audit. Its Phase 3A Parent Plus checkpoint below is retained as historical context only; an unavailable source never lifts its previously recorded hold. Recover against the live programme source for AI Org, Studio and Garage work; pause only actions that require the unavailable Parent Plus authority or evidence.


Retrieve both files from the existing AI Org reporting branch `codex/phase3a-execution`:

- `governance/phase3a-execution.json` — durable batch ledger. If it contains a current `continuation` pointer, that pointer and its `nextAction` supersede the last non-skipped batch's historical next action; otherwise use the last non-skipped batch.
- `governance/PHASE_3A_CHECKPOINT.md` — existing Development Command Centre, including the recorded Parent Plus pilot NO-GO/hold and MM restriction reminder.

Check the reporting branch's current tip first. Batch 3 records result commit `3a2d962cb3848fe6cb2fbdedda6a38cb812facae`; subsequent authorized continuation is recorded in the same ledger without rewriting batch history. The reporting branch is independent of the active draft branch. Do not initialize a replacement ledger, copy decision text into a new memory file, or treat a local uncommitted copy as durable.

## 3. Current PR and CI evidence

Only after reading the durable checkpoint, retrieve the active PR head, state, checks, reviews, and any newer commits. The AI Org draft is PR #68 on `codex/founder-charter-mcp-retirement`. Always query GitHub for live state instead of assuming a previously observed SHA or CI result is still current.

For the current AI Org / Studio / Garage programme, query open PRs and the latest #82 checkpoint rather than the historical draft #68. PR/CI evidence updates implementation status; it does not waive founder decisions, Parent Plus owner restrictions, release approvals, security gates, or the pilot hold.

## 4. Historical context last

Consult `ROADMAP-TODO.md`, `MILESTONES.md`, old progress notes, and earlier PRs only after the first three sources. Treat them as historical when their task state conflicts with the ledger or current PR/CI. A newer durable execution checkpoint wins for next action; current GitHub evidence wins for current PR/CI status; authoritative founder decisions and product owner instructions remain controlling for scope and permissions.

If the ledger, Command Centre, PR, or CI evidence is missing or stale, say which source could not be verified and stop dependent work. If current founder decisions or owner instructions conflict, preserve both records and pause only the affected action for resolution. Do not infer that an old roadmap item, pilot plan, merged PR, or passing check lifts a newer hold or grants owner/release authority.

## 5. Source-loading record

In the handover or Founder Dashboard, name the path, repository, branch/commit used for each important fact and mark the source as **automatically loaded** or **explicitly retrieved**. Repository files are not automatically loaded when the workspace starts without a checkout; use GitHub first, then clone if local inspection or edits are needed. Keep actual decisions in their existing owner/decision records.

Run `npm run ai:recovery:smoke` to validate this order from an empty temporary workspace. It retrieves the current draft instructions, reporting branch ledger and Command Centre, Parent Plus owner workflow, and current PR/check data; it fails if checkpoint data is missing, the dashboard disagrees with the current ledger continuation (or the latest ledger batch when no continuation exists), or fetched branch refs are stale. The smoke test is read-only and removes its temporary clones.
