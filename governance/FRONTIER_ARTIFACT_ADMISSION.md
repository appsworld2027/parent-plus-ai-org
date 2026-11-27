# Frontier artifact qualification — admission precheck (E49/E60, #129)

## Purpose and boundary

The original 11 decision screens (including Sam v2) demonstrate structured answers, not
artifact-producing competence. This independent workstream adds the **deterministic
scoring and admission contract** for the full synthetic qualification specified by
#129 and the founder PRD v1.0. It intentionally does not touch draft Course pilot #130,
its source, provider credentials or test locks. No inference, live product writes,
or deployments are performed. The Course proving ground and the synthetic benchmark
are complementary—not interchangeable.

Files:
- `governance/FRONTIER_ARTIFACT_RUBRIC.json` — versioned eight criteria for each
  canonical role: correctness 40, edge cases 25, evidence 20, efficiency 15;
  three variants per role, per-run minimum **90 out of 100**, never 90 maximum; ten mandatory role gates and
  fifteen integrated gates with explicit accountable role mapping. The catalog describes public criteria, not hidden answers.
- `scripts/frontier-admission.mjs` — canonical digest, frozen plan, per-slot
  independent evidence precheck, weighted scoring, aggregate and integration gate.
- `tests/frontier-admission.test.mjs` — deterministic unit tests with synthetic
  receipt doubles. Organization quality CI runs this suite with no inference.

## Required trust boundary

`assessFrontierAdmission(input, {verifyReceipt})` accepts a frozen plan, selected
artifact-run bundles and integrated evidence. It calls a **trusted verification
adapter** with `{kind,receiptId,subjectHash}`. Canonical SHA-256 hashes cover the
complete JSON payload (key order normalized); receipts must independently authenticate
the exact payload, source and role. The validator does not infer real billing,
identity, reviewer independence, or test outcomes from candidate strings.

The caller must obtain receipt verification separately from the subject/model:
- Frozen plan: provenance from the authorized calibration/evaluator before runs;
  rubric hash, exact 40-hex source commit, 33 unique role+variant input/prompt
  hashes. Hidden test/reference data stays outside agent-readable and public repos.
- Agent execution: actual isolated artifact-producing model run, model/provider
  identity and genuinely free eligibility, route/tool safety, exact artifact bytes,
  frozen source, slot, prompt/fixture and complete attempt history. Authenticate
  receipt against scoped workflow identity and artifact integrity; not a self-written
  output or previous synthetic decision screen.
- Independent evaluation: distinct authorized evaluator identity and run/context,
  bound to exact execution digest; validate each criterion and hard gate against
  independently collected evidence hashes. For independent model evaluation, verify
  its free route and independence externally. Subjective criteria need independent
  expert calibration; if unavailable, do not certify frontier-grade quality.
- Integrated evaluation: all 33 selected role-run identities, exact artifact/source
  and independent receipts for all locked acceptance/regression, exact revision,
  all-role contributions, two real overlapping nonconflicting lanes, forced conflict
  serialization, interrupted task idempotency, quota recovery, Studio parity, Garage
  fresh-session recovery, failed smoke rollback, no public release, zero routine
  founder prompts, and preserved attempt history.

A verifier returning true merely because candidate JSON says "verified" is **invalid
integration**. An absent verifier, false response, exception, async result or tampered
payload never yields verified role eligibility. The tests use an isolated in-memory
receipt map only to test the gate; do not deploy that map builder as a verifier.

## Inputs and results

See the exported function JSDoc for JSON field names and types. Each of the 33
role+variant slots must occur exactly once; do not replace failed evidence by
discarding attempts. All attempts and retry/requalification outcomes must be
retained; the selected attempt references its verified history digest. New rubric,
prompt, fixture, revision or model changes require appropriately versioned plans and
re-evaluation. Gate accepts selected outcomes, not arbitrary per-role averages. The explicit catalog scoring policy is 90/100 at every one of the 33 role-variant slots; all 15 integrated gates must pass. No score may compensate for another slot's failure. The integrated gate owner mapping establishes accountability, not permission to self-certify. A role may use the same agent instance across repetitions or provider across roles, but each execution must have a unique run identity and scope-bound prompt/fixture. Independence from the subject and evidence authenticity are verified by the separate controller; a different string identity alone is insufficient.
Each criterion accepts a typed pass/fail/unknown/not-applicable verdict plus reason
and evidence digest. Only pass contributes the fixed points; there is no automatic
renormalization. Any non-pass mandatory gate blocks full qualification even at 100.

Status:
- `blocked`: wrong versions, identities, duplicates, schema, scope, score under 90,
  or mandatory gate failure.
- `incomplete`: missing role/integrated evidence or unverified receipt (includes no
  verifier). Nothing is upgraded to pass.
- `eligible-for-independent-review`: 33 individually eligible + integrated checks,
  all independent receipt verification; **not** a final expert qualification,
  production release approval, or claimed model equivalence.
- Always `productionReady:false` and `qualityEquivalence:"not-established"`.

## Next steps and ownership

This branch implements the admission precheck and regression tests, not the
33 actual role runs. Keep #130's Course real-product pilot distinct. Next #129
workstream: build isolated fictional reminder-board fixture/harness, calibrate the
rubric against independent references (secure test/oracle custody), implement and
audit a canonical receipt verifier, then generate actual free-route artifact and
independent evaluator receipts. Execute normal, edge, adversarial repetitions and
full integrated fault/recovery workflow. Preserve all failures. Project successful
verified results into Studio only after independent review; never treat unit-test
doubles as live evidence.

CI is deterministic and has no provider keys. Tests can run with
`node --test tests/frontier-admission.test.mjs`; the existing full organization
quality workflow additionally runs it. This does not activate a new agent workflow
or change runtime authority. 
