
# A-09 — Evidence-based quality reporting checkpoint (28 November 2026 IST)

## Decision
Recommended: preserve all release gates and fix the reader-facing quality report, rather than treating registry metadata as execution proof. Alternatives: retain first-row READY inference (rejected), or implement a separate artifact receipt verifier (later after reviewer qualification).

## Reproduced defects and remediation
- Legacy reporter returned READY for empty registries or when the first feature was not pending, ignoring unresolved later rows. It also counted template rows, mishandled multiline CSV, and hardcoded Parent Plus in the shared report.
- Eight synthetic regressions initially failed. Implemented field-aware parsing, references/duplicate validation, non-template counts, explicit recorded pass evidence, and quality states NEEDS_REVIEW or RECORDED_EVIDENCE. Release readiness always stays UNVERIFIED; a CSV cannot independently verify receipts, commits or reviewers.
- Actual checked-in feature template had 16 fields under 15 headers. A ninth regression failed against that row; corrected the template alignment and verified all nine pass.
- Generated actual template report: zero real features, scenarios or trace links, three excluded template rows, zero recorded passes, NEEDS_REVIEW; release UNVERIFIED.
- Registered regressions in npm run ai:verify. Full local suite exit 0: 191/191 JavaScript tests plus Python and organizational validation/synchronization. No model inference or paid usage; restored dependency reused from the isolated A-15 worktree. Existing security settings/gates and Parent Plus Course branch unchanged.
- PR #166 A-15 exact 3e348079702aec896e255470744b6f8182936446 hosted quality and adapter checks passed (runs 46126538101 and 46126538090), but independent reviewer still unavailable.

## Remaining
A-09 remains partial: registry completeness is not a verified product quality outcome. Require exact artifact-linked independent review and real acceptance execution; no safety or security-gate bypass. This candidate and #165 both edit package.json verification script; reconcile their test commands in a combined candidate rather than dropping either. A-03/04 reviewer/free entitlement is unresolved; do not replay prior timed-out requests or consume concurrent Course quota. Use only approved free models and Chrome; no production merge/deployment until the existing review and release gates are met. Security debt remains deferred. Full rollout NO-GO.
