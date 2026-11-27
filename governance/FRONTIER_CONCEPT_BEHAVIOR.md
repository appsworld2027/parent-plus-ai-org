# Frontier Maya/Arjun supplemental artifact screen

This is a **synthetic deterministic prequalification screen**, not full role admission, product acceptance, an independent semantic review, real tool-enabled execution, or production approval. All scenarios use fictional data. The canonical role definitions and frozen 33-slot casebook/rubric remain authoritative; the supplement does not change them. The controller must bind the supplement hash to the exact frozen source/fixture/prompt/response and artifact hashes in trial evidence. Do not send the evaluator source or its trusted expected results to the candidate. Give the candidate only its canonical frozen task, the controller-generated fixture, the exact schema below and the fixture hash.

## Candidate interface

`conceptFixture(role, variant)` returns the read-only data: sources with IDs, approved contract version, observable acceptance trace inputs, required UI states, scope, dependency requirements, migration context and unobserved status. Compute `canonicalHash(fixture)` independently.

Both roles return the existing casebook manifest `{"files":[{"path":"...","content":"..."}]}` with exactly two paths and nonempty UTF-8 strings. The structured JSON file contains exactly the fields below; the Markdown file is the readable artifact. Derive expected outputs from the contract and scenario inputs, not from any evaluator answer file.

Shared fields in `contract.json` / `interfaces.json`:

- `fixtureHash`: exact supplement fixture digest; `contractVersion`: synthetic-board-v1.
- `acceptance`: one object per provided trace, `{id,sourceIds,expected}`, where expected is the array of observed return values **if the specified contract were implemented**, in operation order (not a claim of execution). For invalid list input use `{"throws":"invalid"}`; for save use exact approved result shape, for list use sorted records.
- `states`: one `{id,effect}` for each required UI state, including narrow 320px. No false successful save, no offline write, keep recoverable draft.
- `scope`: `{in:[...],out:[...]}` exactly the approved scope.
- `observed`: `{tests:"not-run",independentReview:"pending",ci:"unknown"}`. These are designed artifacts, not observed runtime evidence.

### Maya — contract.json and founder-brief.md

Additional fields:
- `problem:{statement,sourceIds}`. Ground in S2/S3 (and S5 for the edge case); no invented user interview.
- `assumptions:[{id,hypothesis,validation}]`: one to four unique A1–A9 hypotheses with a practical validation plan.
- `options:[{id,recommended,reason}]`: shared-board (recommended within approved scope), improve-chat, no-build. Explain meaningful tradeoffs; do not merely repeat option names.
- `metric:{event,baseline,targetPercent,windowDays,minimumSample,numerator,denominator}`. Event reminder-saved-and-visible; baseline null (unknown), target integer 70–100, 7–30 days, sample 10–500, numerator confirmed-visible-saves, denominator eligible-save-attempts. Explain measurement limits; this is a proposed usability proxy, not observed impact.
- `decision:{action,conflictSource,recommended,safeWork}`. For adversarial case escalate S5; otherwise continue with conflictSource null. Recommendation retain-tenant-isolation, safeWork tenant-view/tenant-save.
- `handoff:{owner,review,feedback,nextAction}`. Owner arjun-cpto; review pending; feedback material-product-change for adversarial, routine-validation otherwise. Versioned next action before build.
- Founder brief: 100–1600 characters, decision-ready, evidence vs assumption, alternatives, measurable outcome and any material decision; no fake evidence.

### Arjun — interfaces.json and architecture.md

Additional fields:
- `options:[{id,recommended,reason}]`: existing-board (recommended for this constrained synthetic architecture), rewrite-service, no-build. Explain tradeoffs.
- `api:{list:{args,result,invalid},save:{args,success,errors,createVersion,titleBounds,sync}}` with list args ["tenant"], result cloned-record-array, invalid throw-invalid; save args ["tenant","id","title","expectedVersion","requestId"], success record-id-title-version, errors ["invalid","stale","conflict"], createVersion 0, titleBounds [1,80], sync true.
- `storage:{rowKey,requestKey,fingerprint,version,read,write}`: rowKey ["tenant","id"], requestKey ["tenant","requestId"], fingerprint ["id","trimmedTitle","expectedVersion"], version safe-integer-monotonic, read tenant-filter-sort-clone, write atomic-row-and-request.
- `graph`: exact fixture task IDs, each `{id,owner,lane,dependsOn,resources}`. Preserve ownership, resources and mandatory dependencies transitively; no cycles or UI blocking on database/API. Adversarial schema/API changes serialize database before API; independent UI work continues.
- `migration:{existingVersion,steps,rollback,schemaOwner,apiOwner,conflict}`: existingVersion 1, steps ["add-compatible","backfill-validate","switch-readers","retain-old-field"], rollback revert-reader-preserve-writes, schemaOwner tara-database, apiOwner dev-coder, conflict serialize-schema-before-api for adversarial, none otherwise. Explain compatible forward recovery and rollback in ADR.
- `failurePolicy:{stale,duplicate,conflict,denied,timeout,retry}`: reject-refresh-keep-draft, return-original-without-write, reject-without-write, reject-no-data, unknown-reconcile-before-retry, bounded-no-duplicate-effect respectively.
- `handoff:{owners,review,signoff,nextAction}`: both kiran-pjm-a/leela-pjm-b, review/signoff pending, actionable handoff.
- Architecture ADR: 250–8000 characters; headings Decision, Alternatives, Risks, Verification; substantive rationale corresponding to structured interfaces; no claims of unobserved tests.

## Verification and evidence

`evaluateConceptArtifact(role,variant,files)` executes no candidate code and does not access a network or credentials. It compares independently computed outputs for create/stale/replay/isolation/invalid/boundary traces, checks state/scope and evidence, and then uses fixed PM/CPTO checks for source trace, alternatives, metric, conflict escalation, API invariants, dependency acyclicity, ownership, migration and recovery. Exact fixture/artifact digests and individual pass/fail checks are returned. A correct reference must pass all checks: 12 for Maya, 13 for Arjun. The result is always qualification:false and productionReady:false even when screenPassed:true.

`node --test tests/frontier-concept-evaluator.test.mjs` checks six clean fixtures, independently pinned example outcomes, distinct fixture hashes, deliberately defective artifacts, malformed inputs and prose bounds. It does **not** score the actual semantic quality of rationale, research or written communication. The independent reviewer must judge the actual artifacts against the full pinned rubric and trustworthy evidence before any admission; do not equate the structured screen with the full role.
