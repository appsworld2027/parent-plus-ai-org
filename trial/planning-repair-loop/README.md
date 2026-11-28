# Planning qualification repair loop (isolated trial)

Scope: supervised synthetic planning only. Never merge this stacked trial or treat a passing screen as role admission, production readiness, unattended operation, or authorization to modify a product.

## Verified evidence
- Kiran EDGE: separate actual four-review/three-repair chain, final 12/12, 13,018 measured tokens excluding the initial author and failed routes.
- Leela adversarial: actual repaired 14/14 and independent approval, replay verified with no inference. Preserved HTTP400, length failure and under-evidenced approval.
- Kiran normal: fresh one-command two-round loop, final 12/12, independent approval, 6,733 measured tokens across four calls. No mid-run prompt/code changes.
- Kiran adversarial: 12/12, selected indexed evidence R0/A3/A4/A6/C0, no findings; source/provenance, QA completion and current-base reconciliation screens passed; prior invalid attempts preserved.
- Free-only configuration: NVIDIA Nemotron Ultra author and Groq Qwen reviewer. No paid fallback. A concurrent AI agents workflow causes the reviewer to hold. Model availability is not guaranteed.

## Fresh case (new, unique evidence root)
```sh
AI_ORG_TRIAL_RECONCILE_GATE=1 AI_ORG_TRIAL_INDEXED_REVIEW_ALL=1 AI_ORG_TRIAL_INDEXED_REVIEW_V2=1 \
node trial/planning-repair-loop/run.mjs run leela-pjm-b edge path/to/new-evidence-root
```
Run only when authorized for this synthetic fixture, and do not compete with other agent workflows. Reuse a checkpoint with identical protocol flags; do not erase rejected receipts. A failure means explicit hold or block, never success. Max four rounds; local-only provenance checks reject invalid output. Actual execution via Chrome Cloud Shell; laptop-closed continuity has not been demonstrated.

## Offline verification
```sh
node --test trial/planning-repair-loop/*.test.mjs
```
The verifier copies accepted receipts into its own temporary directory, passes AI_ORG_TRIAL_REPLAY_ONLY=1 to disable inference, rebuilds checkpoint hashes and rejects tampering. Historical protocols remain reproducible. New gates and indexed selection are opt-in for the trial. Raw model selection is retained separately from exact source text resolved by the controller.

## Remaining gates
Complete the remaining two planning fixtures, then qualify all 33 locked cases across 11 roles and all 15 gates. Perform independent semantic review; the screens are necessary, not sufficient. Demonstrate real product idea-to-deployment, independent QA, recovery under interrupted execution, unified model policy, and laptop-closed execution. Security debt remains deferred per founder instruction.
