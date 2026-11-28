# A-15 — Multi-product portability checkpoint (2026-11-28 IST)

Master audit: AI Org issue #82; prior checkpoint comment 7236338389. Base: 6a6693ab41daaabe4d5138591bf9860c568c7010.

## Decision
Options: (1) fix shared cross-product prompt and independently test isolation now; (2) change every contract path consumer in one patch; (3) defer all work.
Recommended and selected: (1). A coordinated path migration needs its own review because the contract lock and workflow quality gates must stay consistent. No weakening of a gate.

## Evidence and result
- Restored interactive Chrome integration to the dedicated AI Org Cloud Shell with a harmless command marker. Used an isolated worktree; no Course pilot changes.
- Existing shared agent router incorrectly told unrelated product agents to use a Parent Plus founder-response reference. The new failing regression reproduced it (7 passed, 1 failed). Changed the reference to .ai-org-handbook/standards/FOUNDER_RESPONSE.md, already the canonical all-product standard.
- Two independent synthetic roots with identical feature slugs each load only their own handover context; both isolation directions asserted. 42/42 focused router/onboarding tests passed after repair.
- npm run ai:verify completed with exit 0; 184/184 Node tests passed plus Python, schema and agent synchronization checks. Initial two test-file import failures were due to missing yaml@2.9.1 in the new worktree. Restored the exact local cached package after SHA-512 matched package-lock.json; no network download or lifecycle script.
- No LLM calls, paid routes, auto-merge, deployment, security settings, credentials, security remediation, or changes to active Course work. Independent review and hosted CI on exact head remain necessary.

## Remaining A-15 work
The onboarding pack reads product.docsFolder while agent-router, loop, worker workflow and contract-lock assume docs/product. Do not advertise custom-folder end-to-end support yet. Inventory contract, acceptance, handoff and grading path consumers; define one canonical normalized product path contract; migrate coordinated consumers and the existing gate together without weakening enforcement. Test default compatibility, alternate synthetic product root end-to-end, path and gate invariants, and both products' independent feature records. Keep deliberately product-specific pilot/recovery scripts separate from core runtime; do not generalize their authorization gates. A-15 remains partial.

## Handover
Continue via Chrome Cloud Shell; recover latest issue #82 checkpoint and this branch. Review the exact candidate independently, run hosted CI, reconcile #165/#38 and existing role proposals without duplicating them. Qualified free model availability and independent reviewer remain open; do not rerun the previous author or uncertain held requests. Security debt deferred by founder. Full rollout NO-GO.
Context sufficient, utilization metric unavailable; checkpoint is this commit. Session action CONTINUE for the next bounded remediation.
