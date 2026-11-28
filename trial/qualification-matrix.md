# AI Org — live qualification evidence matrix
Date: 28 Nov 2026. Master remediation issue: #82. Trial PR: #178 (NEVER MERGE).
Scope: supervised synthetic qualification evidence only; not full role admission, real product delivery, unattended runtime, or release certification. No paid fallback or security remediation.

## Case ledger

| Role | Normal | Edge | Adversarial |
|---|---|---|---|
| Kiran project manager | Q-001 PASS 12/12 | Q-002 PASS 12/12 | Q-003 PASS 12/12 |
| Leela project manager | Q-004 PASS 14/14 (alternate reviewer) | Q-005 PASS 14/14 | Q-006 PASS 14/14 |
| Maya AI PM | Q-007 IN PROGRESS (NIM truncation, Groq 429; split trial) | Q-008 PENDING | Q-009 PENDING |
| Arjun CPTO | Q-010 PENDING | Q-011 PENDING | Q-012 PENDING |
| Iris design | Q-013 PENDING | Q-014 PENDING | Q-015 PENDING |
| Dev coder | Q-016 PENDING | Q-017 PENDING | Q-018 PENDING |
| Tara database | Q-019 PENDING | Q-020 PENDING | Q-021 PENDING |
| Ravi integration | Q-022 PENDING | Q-023 PENDING | Q-024 PENDING |
| Quinn QA | Q-025 PENDING | Q-026 PENDING | Q-027 PENDING |
| Rex reviewer | Q-028 PENDING | Q-029 PENDING | Q-030 PENDING |
| Sam release | Q-031 PENDING | Q-032 PENDING | Q-033 PENDING |

PASS in this ledger means an actual model-authored synthetic artifact passed the locked automated screen and an independently selected review after manual semantic inspection, possibly following supervised remediation. It does not mean a fresh one-command run passed without interventions. The 27 uncompleted cases require actual model evidence and independent review; not all are covered by the concept/planning harness. No production certification.

## Exact evidence
Relative to trial/openrouter-exact-review:
- Q-001: evidence/kiran-normal-loop-20261128; 2 rounds, 6,733 tokens.
- Q-002: chain/verify.mjs; actual 4 reviews and 3 repairs; 13,018 tokens excluding initial author and failed routes.
- Q-003: evidence/kiran-adversarial-indexed-v2-20261128; actual indexed independent review after provenance and reconciliation defects.
- Q-004: evidence/leela-normal-indexed-20261128 plus evidence/leela-normal-gptoss-v2-20261128; original loop exhausted budget, alternate model reviewed exact final artifact; 1,662 alternate-review tokens. Earlier resource concern corrected by exact locked fixture and empty conflict register.
- Q-005: evidence/leela-edge-indexed-20261128; first-pass single round, 4,096 tokens.
- Q-006: evidence/leela-adversarial-offline-replay-20261128; actual independent review and repair reverified without inference.
- Q-007: evidence/maya-normal-concept-20261128, evidence/maya-normal-concept-gptoss-20261128; next trial/concept-role-loop/split-maya.mjs.

## Operating rules
Use role-appropriate free model routes. Reject rate limits, unknown identities, truncated outputs, unsupported claims, wrong source attribution, contradictory approvals, failed acceptance screens; preserve raw receipts and never synthesize a replacement result. Stop or hold if parallel AI agents occupy reviewer capacity. Use offline accepted receipt replay before paying for more inference. Explicitly separate automated screen, independent model review, semantic inspection, role admission, unattended proof and real deployment.

## Outstanding acceptance gates
Complete Q-007–Q-033 and all 15 organization admission gates; integrate a single agent/configuration policy, enforce stage-appropriate Superpowers, validate real product documents, actual independent QA, browser verification and deployment, memory recovery and interruption/laptop-closed execution. Keep security debt separately deferred.
