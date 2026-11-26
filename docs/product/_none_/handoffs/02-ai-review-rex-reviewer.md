# Handover — ai-review — rex-reviewer

## Understanding
- Goal: independently review issue #69 / PR #70 ("check README.md relative links resolve; fix only broken ones; docs-only PR, no merge") against the issue text and catch what QA's tests miss.
- Constraints: do not touch .github/**, .ai-org/**, CODEOWNERS, or main; never merge PR #70; never print secrets; evidence rule — no "passed" without command output; approve -> `**Verdict: APPROVE**` + remove `ai:review`, changes -> `ai:fix` with line comments.
- Known traps: agent self-reports are not evidence (only runs/commits are); a two-dot diff vs a newer local main shows main's own later commits — use the merge-base three-dot diff for the PR's real scope; an absolute path in an example command (/tmp/ai-org-usage.jsonl) is not a repo-relative link.
- What I must not touch: the protected paths above, the main branch, secrets, other issues/PRs, the .ai-org-handbook revision contents, and locked tests (none here — docs-only PR).
- Proof: three-dot diff vs merge-base, my own link-existence command over every relative reference in the PR's README.md, `npm run ai:verify` executed in a clean worktree at the PR head commit, PR file list + merge state via `gh pr view`, then a verdict comment on #69 and the label move.

## Done
- Reviewed PR #70 (branch `ai/69-readme-links-check`, head `db051b2d4146bc106fa8a03a010688dad6ac47db`, base `main`, merge-base `22a535f`): `git diff origin/main...origin/ai/69-readme-links-check --stat` -> **1 file, README.md +4/-0** only; `gh pr view 70 --json files` agrees. No protected path touched (`.github/**`, `.ai-org/**`, `CODEOWNERS` absent from the diff).
- PR state: CLOSED, `mergedAt=null`, `mergeCommit=null` -> opened and **NOT merged**, satisfying issue #69's "do not merge". Head unchanged since Quinn's QA (`db051b2...` still `headRefOid`).
- Link check executed by me on the PR head (worktree at db051b2): every repo-relative reference in README.md exists — `AUTOMATION.md`, `MILESTONES.md`, `governance/FOUNDER_DASHBOARD.md` (the only markdown link), `demo/blocked.json`, `demo/brief.md`, `demo/status.json`, `demo/usage.jsonl`, `org.py`, `tests` -> **9/9 OK, 0 broken**. The PR's added lines contain no new markdown link (`grep -c ']('` on added lines = 0). `/tmp/ai-org-usage.jsonl` is an absolute ledger arg inside an example command, not a repo-relative link — out of scope.
- Repo checks executed by me in the clean worktree at the PR head: `npm run ai:verify` -> **exit 0**; python `Ran 12 tests ... OK`; `node --test` `# tests 84 / # pass 84 / # fail 0`; `validate-ai-org.mjs` and `sync-agents.mjs --check` passed via the `&&` chain; no FAIL/ERROR/Traceback in the 541-line log (`/tmp/rex-aiverify.log`).
- Content check of the +4 lines: a plain markdown note ("Link verification (issue #69): All relative links in this README resolve to existing files as of 2026-11-26.") — readable, no secrets, no input handling, no code.
- Verdict posted on issue #69 starting `[Rex — Code Reviewer]` with `**Verdict: APPROVE**`; label moved `ai:review` -> `ai:release` (loop-controller stage, no agent seat; Sam/loop handles disposal — issue says do not merge, and the PR is already closed-unmerged).
- Evidence: PR https://github.com/appsworld2027/parent-plus-ai-org/pull/70 (head db051b2d4146bc106fa8a03a010688dad6ac47db, closed-unmerged); issue https://github.com/appsworld2027/parent-plus-ai-org/issues/69; `npm run ai:verify` exit 0 on the PR head; this packet validated with `node .ai-org-handbook/scripts/handoff.mjs validate`.

## Decisions
- Verdict APPROVE (not ai:fix). Options: (1) **APPROVE** — all issue constraints verified: docs-only change confined to README.md, no broken links existed so nothing needed fixing, protected paths untouched, PR opened and not merged, repo checks green on the PR head (**Recommended**: every requirement of issue #69 is met with executed evidence; failing would be churn); (2) CHANGES -> `ai:fix` to strip the verification note — only if the note is judged scope creep; it is an edit to the one file the issue allows, so rejected.
- Label target `ai:release` after approval: `ai:release` is in `NO_AGENT` in `scripts/agent-router.mjs` (loop-controller stage), matching the lifecycle Quinn -> Rex -> Sam; recorded here because the role file only says "remove ai:review".
- No PR-post verdict marker: `.ai-org/manifest.json` does not exist in this repo, so `loop.aiVerdictReviewerIds` is undefined (loop.mjs `manifest()` returns `{}`); the conditional "post `<!-- ai-org:reviewed-commit SHA -->` on the PR" therefore does not apply — the verdict lives on issue #69.

## Assumptions
- VERIFIED: PR #70 is the build for issue #69 (PR body "Closes #69"; Dev's comment on #69 links PR #70) — `gh pr view 70`, `gh issue view 69 --comments`.
- VERIFIED: the PR's real scope is README.md only — merge-base three-dot diff + `gh pr view 70 --json files`.
- VERIFIED: no `.ai-org/manifest.json` in the worktree/repo — `find` + loop.mjs `existsSync(".ai-org/manifest.json")` logic.
- UNVERIFIED: whether the founder prefers the verification note kept or stripped — not a founder decision (docs-only, in-scope); PR is already closed-unmerged either way, so disposal (merge vs keep closed) remains with Sam/founder per the "do not merge" instruction.

## Traps
- Two-dot `git diff main <branch>` against a newer local main shows main's later commits as reverse changes — always use `git diff origin/main...<branch>` (merge-base) for PR scope.
- Do not trust Dev's or Quinn's comments as evidence; re-run the link check and the checks yourself (done).
- `gh pr view` has no "merged" field — use `mergedAt`/`mergeCommit` to distinguish closed-unmerged from merged.
- Absolute paths inside example commands (e.g. `--ledger /tmp/ai-org-usage.jsonl`) are not repo-relative links.
- No CI checks are reported on the docs-only branch (`gh pr checks 70` -> none); local `npm run ai:verify` on the PR head is the evidence.

## Next must
- Sam / loop controller (stage `ai:release`) disposes of PR #70: it is closed-unmerged and issue #69 says "do not merge", so the expected action is to leave it closed (or merge only if the founder explicitly overrides "do not merge"); then close issue #69 with the evidence chain.

## Next must not
- Do not merge PR #70 into main (issue #69: "do not merge"). Do not touch .github/**, .ai-org/**, CODEOWNERS, or main. Do not edit .ai-org-handbook/ as part of this issue. Do not contact the founder except via ai:founder-decision / ai:founder-test issues.

## Open questions
- none

## Memory proposals
- Lesson (evidence: this run, issue #69 / PR #70): when reviewing a PR's scope, use the merge-base three-dot diff (`git diff origin/main...<branch>`), not a two-dot diff against a newer local main — the two-dot diff folds in main's own later commits and overstates the PR.
- Lesson (evidence: this run): on docs-only PRs no CI checks run on the branch (`gh pr checks` reports none); run the repo's verify suite in a worktree at the PR head and quote exit code + result lines as the evidence.

## Session lifecycle
- CONTINUE. Single focused review task; no repeated failures, no model/environment change. Token/usage/subscription metrics are not reported by this runtime -> unavailable (stated, not invented).

## Persistence
- VERIFIED: this packet committed and pushed on branch `refs/heads/ai/69-review-handover` at `docs/product/_none_/handoffs/02-ai-review-rex-reviewer.md`, validated with `node .ai-org-handbook/scripts/handoff.mjs validate` -> "handover OK". Review comment posted on https://github.com/appsworld2027/parent-plus-ai-org/issues/69. Branch intentionally NOT merged (main only accepts reviewed PRs; issue forbids touching main).

## Resources and next action
- Engine/model: nvidia_nim/mistralai/mistral-large-4-1t-a52b, served free by NVIDIA NIM through Free Claude Code, as given by the runtime; token usage / subscription / cost / duration not reported by this runtime -> unavailable.
- Next action: `ai:release` stage on issue #69 — Sam/loop controller disposes of PR #70 (keep closed-unmerged per "do not merge") and closes #69; no founder decision required.
