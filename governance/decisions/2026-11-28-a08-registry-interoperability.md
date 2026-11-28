# A-08/A-09 follow-up — Actual registered product evidence and registry interoperability

Status: deterministic candidate; independent review pending. No live product modifications.

Direct audit source: appsworld2027/Parent-plus- main 1d9f8b68d86227f55facb418afe27f76a50d83e7. Exact files:
- ai-workspace/qa/feature-registry.csv
- ai-workspace/qa/scenario-registry.csv
- ai-workspace/qa/traceability.csv

Observed schemas differ from AI Org's canonical qa/* templates; the reporter previously failed ENOENT instead of inspecting the existing registries. Introduce explicitly named canonical and workspace-v1 schemas, auto-select a single layout or require --registry-profile when ambiguous, reject incomplete/mixed sets, strict parse both. Map actual declared values and never infer missing acceptance criteria, actual outcomes/timestamps, independent review or release gate status from a source/test file reference. Output schema/profile/paths and explicit limitations. No change to release authorization.

Read-only exact-source run (files copied to isolated Cloud Shell fixture; output not written to product):
- 10 registered features (4 IMPLEMENTED_WITH_TESTS, 4 IMPLEMENTED_LOCAL_ONLY, 1 NOT_IMPLEMENTED_OR_UNVERIFIED, 1 PENDING_REVIEW).
- 10 scenarios (9 NOT_RUN; 1 declared PASS).
- 6 traceability rows (3 PARTIAL, 2 OPEN, 1 declared PASS).
- 0 recorded passes satisfying AI Org's evidence fields, 32 review reasons, qualityStatus NEEDS_REVIEW and releaseReadiness UNVERIFIED. This is a report of available registry metadata, not proof that tests never executed.
- Full Product PRD exists at PRD.md in that exact revision; it contains no Course text found by scan. Original Course source PRD remains unavailable; isolated Org #130 CRS-01 pilot contract is not a substitute. Do not modify concurrent Course pilot or invent approval.

Evidence: one expected red regression (missing qa/feature-registry.csv); two added regressions including workspace claimed PASS not counted, ambiguous/incomplete rejection, explicit profile selection. Original canonical reporter tests pass. All checks deterministic, no model calls or security changes. Candidate stacked on audit/gemini-product-path-20261128 (#171) for integration testing only. Product quality acceptance requires real source PRD, validated complete journeys, real test receipts and independent exact-head review.
