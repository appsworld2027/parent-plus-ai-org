# Handover: AI Org safe trial and loop repair (2026-11-26)

Product: AppsWorld AI Org · Feature: safe build+review trial · Stage: repair, review says CHANGES
Responsible: Arjun (AI CPTO) · Repo: appsworld2027/parent-plus-ai-org (public)
Branch: claude/safe-trial-loop-repair (PR #80, open) · Code reviewed at a1199d4 · main: 6f60318 when last fetched
Status: synced to GitHub with this commit. Not yet verified by a fresh session.

## 1. Objective and background
Founder's goal: an AI Org (with Studio) whose agents build a whole feature (plan, build, test, fix, review, deploy) with no task-level approvals, ready for the founder to test in production.
Today's path: free models only, then a safe trial on a Parent Plus feature, then diagnosis, then "Repair the loop".
Founder's feature list and checkpoints: https://claude.ai/artifact/976HhEE9Tdi4H8eD5NLWoc (last checkpoint there predates the trial runs).

## 2. Approved decisions (founder, 2026-11-26)
- No task or sub-feature approvals; take the Recommended option and record it (AGENTS.md 1B).
- Free models only; no new paid service, credit or tool without explicit approval.
- NVIDIA free endpoints: supervised testing only, synthetic data and public code; not for building or shipping real features.
- Trial subject: Parent Plus `needs-you-fees-overdue`; output graded then set aside, never pushed, merged or shipped.
- After diagnosis: repair the loop (four fixes, independent review). No trial run and no spend without a new yes. Ask before merging PR #80.
- The earlier approval of up to 3 setup reruns is used up.

## 3. Completed, with evidence
- Merged: AI Org #75 and Studio #16 (free-only), AI Org #76 (trial), #77, #78, #79 (setup fixes; main 6f60318). Hourly resume paused.
- Run 45814222037: baseline passed (39 unit-test files; 16 of 18 new tests fail before build, 2 already pass). Nemotron build hit 3600 s (exit 124). Grade FAIL: 17/18; 8 previously passing browser tests failed or did not run; changed e2e/support/backend.ts and feesBackend.ts. Review verdict and final run status: Unknown (founder asked to stop checking).
- Earlier runs 45806782390, 45808221507, 45810142804 stopped before any build-model session (folder permissions and a closed working folder).

## 4. Diagnosis
1. Unattended work is off: only the free engine is allowed and no workflow sets SUPERVISED_SYNTHETIC_TRIAL (follows policy).
2. The trial used only builder and reviewer, one pass, no fix loop.
3. Builder was not told to run the older browser tests that grading requires.
4. Offline prompt also contained issue/PR instructions.
5. Logs gave totals only; the cloud session could not download artifacts.
6. No correct build is known to pass the grade.
Even a pass would not permit building real features on NVIDIA's free access. That is an open strategy decision.

## 5. Current state: PR #80 (not merged, not run on GitHub)
Adds failure names and reasons; one offline brief matching grading; BASH_*_TIMEOUT_MS (effect untested); scripts/safe-trial/build-loop.sh with at most 2 fix rounds.
Validation at a1199d4: `npm run ai:verify` 111 Node + 12 Python pass; local fix-loop rehearsal with stand-ins pass; PR checks quality and adapter pass.
Independent review (Rex, fresh context, same Claude family): **CHANGES**.

### Must fix
- M1: model-influenced text can still issue GitHub log commands. `clean()` blocks `::` but not `##[...]` (anywhere in a line). Also unfiltered: run-tests stderr in build-loop.sh; guard-failure text in build-loop.sh; collect.sh file list; verdict first line; `guard` command output (including the review job's apply step, present before #80, where a crafted file name may set step outputs; inferred, not run); reviewer text in the report job.
  Recommended: also neutralise `##[`; filter every one of those paths; send all run-tests output to a file in the judge folder; hide the collect.sh list; add tests.
### Should fix
- S1: worst case about 290 min plus setup exceeds the 180 min job limit: set 330; use `timeout -k 30` in run-tests.sh.
- S2: make the activity step `continue-on-error: true`; write grade.txt before building the failure summary.
- S3: include Playwright top-level `errors[]`; say when a report is empty or unreadable; record test exit codes.
- S4: keep each round's patch as `$out/round-N.patch`.
- S5: fix prompt is cut at 12,000 characters and can lose the type-check error: put it first or cap each section.

### Item 3, not done
Prove a correct build can pass: needs an environment that can run `npm ci` and Playwright for Parent Plus at aaea570c5ae8574fff818f67176f7ebf06645e15.
Locked trial spec: trial/controls/needs-you-fees-overdue.v2.spec.ts.txt, copied to e2e/acceptance/needs-you-fees-overdue.spec.ts.
Lead, unproven: e2e/acceptance/coach-needs-you.spec.ts uses `backend()`, which has no fee data (feesBackend.ts has it); a correct build may need the shared fixture changed.
Also: the contract at that commit says "Status: draft" and names e2e/acceptance/coach-needs-you-fees-overdue.spec.ts.
A reference build is evaluation material: never show it to the building model, never ship it, never push it to Parent Plus.

## 6. Constraints and traps
- No safety check may be weakened. Never print or commit secrets. No force-push. Do not delete what you did not create. Do not change UNATTENDED switches or add ai:* labels.
- Edit .github/workflows/** only for this approved work. Repos are public.
- Start a new workflow run from main; "Re-run jobs" reuses the old commit.
- Local rehearsals missed real-runner problems (open folders, root, world-writable system folders, inherited variables).
- model-trial.yml accepts any repo: do not point it at a real product.
- Accepted limits: a pass is only provisional (e2e/support and node_modules editable by model code); tool installs unpinned; reviewer suggests a dedicated NVIDIA trial key, revoked afterwards.
- Cloud session limits seen: no package installs, artifact download blocked, one workflow start refused until the founder approved.

## 7. Other open items
agent-worker.yml has unused paid steps and a stale header; stale wording in CLAUDE.md and role files; Studio: two UI errors with blocked chat, missing chat-bypass tests, stored CLI API-key sign-ins not blocked, Team screen scoring not aligned; founder-only feature switch and rollback not built; loop contract and release approvals remain; whether studio-garage should be private is unconfirmed; live UNATTENDED switches not checked. Other open PRs (ai-org #74, studio #15, #11) were not part of this work: leave them.

## 8. Resources
Session: long, compacted at least once; token and cost figures: Unknown. Recommendation: SWITCH.

## 9. Next actions and completion criteria
1. Fix M1 and S1-S5 on PR #80, tests first. Done: ai:verify and PR checks pass; independent reviewer says APPROVE.
2. Ask the founder before merging.
3. Item 3. Done: a correct build gets PROVISIONAL PASS under the same grading commands, or the exact test/fixture conflicts are shown with evidence and a recommended correction.
4. Ask the founder before any model trial run.
5. Then bring the strategy decision: how real features get built (free options permitted for production, or paid with approval), with one recommendation.

## 10. Memory updates
None saved outside this file.
