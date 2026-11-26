# Handover — ai:qa — quinn-qa

## Understanding
- Goal: QA-verify issue #69 / PR #70 ("check README.md relative links resolve; fix only broken ones; docs-only PR, no merge") with executed evidence, not Dev's self-report.
- Constraints: do not touch .github/**, .ai-org/**, CODEOWNERS, or main; never merge; never print secrets; evidence rule — no "passed" without command output; ai:qa pass -> label ai:review, fail -> ai:fix.
- Known traps: agent self-reports are not evidence (only runs/commits are); an absolute path in an example command (e.g. /tmp/ai-org-usage.jsonl) is not a repo-relative link; must confirm the PR diff touches only README.md and that the PR is not merged.
- What I must not touch: the protected paths above, the main branch, secrets, other issues/PRs, and the .ai-org-handbook revision contents.
- Proof: run a link-existence command over every relative reference in README.md, run the repo checks (npm run ai:verify = the quality.yml gate), inspect PR #70 file list + merge state, then comment a QA table on #69 and move the label.

## Done
- Verified PR #70 (branch ai/69-readme-links-check, commit db051b2, base main): changedFiles=1 (README.md only, +4/-0), state CLOSED, mergedAt=null, mergeCommit=null -> opened and NOT merged.
- Link check on main and on the PR branch: every relative reference resolves -> OK for governance/FOUNDER_DASHBOARD.md, AUTOMATION.md, MILESTONES.md, demo/blocked.json, demo/brief.md, demo/status.json, demo/usage.jsonl, org.py, tests; the PR adds no new markdown link. (/tmp/ai-org-usage.jsonl is an absolute ledger arg in an example command, not a relative link.)
- Repo checks: `npm run ai:verify` exit 0 -> python `Ran 12 tests ... OK`; node --test `# tests 84 / # pass 84 / # fail 0`; validate-ai-org.mjs and sync-agents.mjs --check passed (&& chain); no FAIL/ERROR/Traceback in the 541-line log.
- Commented the QA report on issue #69 and moved the label ai:qa -> ai:review.
- Evidence: PR https://github.com/appsworld2027/parent-plus-ai-org/pull/70 (commit db051b2); issue https://github.com/appsworld2027/parent-plus-ai-org/issues/69; ai:verify exit 0.

## Decisions
- Verdict PASS -> label ai:review (not ai:fix). Options: (1) Pass — all ACs met and PR #70 adds only a benign docs note inside README.md (Recommended); (2) Fail to ai:fix and have Dev strip the note. Chose (1): the note is confined to the allowed file, adds no link, breaks nothing; failing would be churn. Recorded one line in governance/decisions/LOG.md.
- Treated /tmp/ai-org-usage.jsonl as out of scope (absolute path inside an example command, not a repo-relative link).

## Assumptions
- VERIFIED: PR #70 is the PR for issue #69 (Dev's comment on #69 links PR #70; PR body says "Closes #69") — confirmed via `gh pr view 70` / `gh issue view 69 --comments`.
- VERIFIED: no protected path in the diff — `gh pr view 70 --json files` returns only README.md.
- UNVERIFIED: whether the founder wants the "Link verification (issue #69)" note kept in README.md — not a founder decision, kept as harmless docs.

## Traps
- Do not count absolute paths in example commands (--ledger /tmp/...) as repo links.
- Do not trust Dev's comment as evidence; re-run the link check yourself.
- `gh pr view` has no "merged" JSON field; use mergedAt/mergeCommit to tell merged from closed-unmerged.

## Next must
- Rex (ai:review) reviews the README.md change against issue #69; Sam may act per loop rules only after confirming intent, because issue #69 says "do not merge".

## Next must not
- Do not merge PR #70 into main (issue #69: "do not merge"). Do not touch .github/**, .ai-org/**, CODEOWNERS, or main. Do not edit .ai-org-handbook/ as part of this issue.

## Open questions
- none (the "do not merge" instruction is explicit on issue #69; PR #70 is already closed-unmerged, which satisfies it)

## Memory proposals
- Lesson (evidence: this run, issue #69): when checking "relative links", separate repo-relative refs from absolute paths in example commands; only repo-relative refs must resolve to files. Also: use mergedAt/mergeCommit, not a "merged" field, to distinguish merged from closed-unmerged PRs.

## Session lifecycle
- CONTINUE. Single focused QA task; context small, no repeated failures, no model/environment change. Token/usage metrics are not reported by this runtime -> unavailable (stated, not invented).

## Persistence
- VERIFIED: this packet committed and pushed on branch refs/heads/ai/69-qa-handover at docs/product/_none_/handoffs/01-ai-qa-quinn-qa.md (commit PENDING-SHA); validated with `node .ai-org-handbook/scripts/handoff.mjs validate` -> "handover OK". QA comment posted on https://github.com/appsworld2027/parent-plus-ai-org/issues/69.

## Resources and next action
- Engine/model: nvidia_nim/mistralai/mistral-large-4-1t-a52b served free by NVIDIA NIM via Free Claude Code, as given by the runtime; token usage / subscription / cost not reported -> unavailable.
- Next action: Rex picks up issue #69 at ai:review and reviews PR #70 (README.md note) against the issue; no founder decision required.
