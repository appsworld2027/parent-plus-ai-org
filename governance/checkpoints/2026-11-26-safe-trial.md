# Handover: safe build + review trial (2026-11-26)

Status: saved in this branch. Not verified by a fresh session.

## Objective
Founder asked for a safe trial on a Parent Plus feature, then a diagnosis, then chose "Repair the loop". No trial run and no spend without a new founder yes.

## Evidence so far
- Merged: AI Org PRs #76-#79 (trial and three setup fixes).
- Run 45814222037: baseline passed; Nemotron build timed out at 3600 s; grade FAIL, 17/18, 8 older browser tests failed or did not run; changed e2e/support/backend.ts and feesBackend.ts. Review result: not checked (founder asked to stop checking).
- Run artifacts cannot be downloaded from the cloud session (network policy). Do not work around it.

## This change
1. Failed test names and reasons are printed and added to the report.
2. One offline builder brief; its finishing commands match grading. Longer command time limit for the builder.
4. Build machine self-check with at most two fix rounds; official grade unchanged on a clean machine.

## Not done: 3. prove a correct build can pass
No correct build of this feature is known, and the cloud session could not install product packages, so none can be tested here.
Lead (unproven): e2e/acceptance/coach-needs-you.spec.ts uses `backend()` (e2e/support/backend.ts), which has no fee data; fee data is intercepted in feesBackend.ts. A build that loads fees on Today probably needs the shared backend to answer for the older tests.
Also: the contract at the base commit says "Status: draft" and names a different locked-spec filename.

## Unknown
Why the 8 older tests failed in run 45814222037. Whether the command time limit affected that build.

## Constraints
Free models only; NVIDIA testing only; code never shipped; no safety check weakened; merge only after independent review and the founder's go-ahead for this change.

## Next
Independent review of this change; ask the founder before merge and before any run. Then item 3.
