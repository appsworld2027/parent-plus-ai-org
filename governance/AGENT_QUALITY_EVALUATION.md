# AI Org — role qualification and model evaluation contract

Status: proposed with PR #121, 27 November 2026. This supplements the founder-approved 76-feature scope (E12, E24–E28, E37, E49–E51, E56, E60). It is an acceptance contract, not evidence that every agent has passed.

## Objective

The system, not a model's brand, must produce high-quality autonomous product delivery. Model inference for agents is strictly free-only; no Codex, ChatGPT Work, commercial API fallback, subscription inference or paid upgrade. Parent Plus is out of scope for this programme batch. Use a disposable fictional task-board application with synthetic data, not a real product repository, for qualification.

Method: supply an outcome, a small task-specific context, a bounded toolset, separate author/challenger/evaluator responsibilities, executed evidence, and a durable checkpoint. Use deterministic checks for objective facts; independent review for judgment. On failure repair the cause, rerun checks and retain a regression case; after two unsuccessful approaches, replan or safely pause. Never certify a run based on a model's self-assessment.

## Role acceptance cases

Each case has a normal task plus adversarial or failure scenario. Before execution, lock the source inputs and scoring criteria in a distinct evaluator context. The model receives only task inputs and role instructions, not the reference solutions. Evaluate the changed environment and artifacts, not just prose.

| Role | Synthetic task | Essential qualification evidence |
|---|---|---|
| Maya (Product) | Discover why a fictional team's reminder board loses due work; ambiguous founder request | Evidence vs assumptions; alternative solutions; measurable user outcome; complete acceptance criteria including denial and failure; no routine founder question |
| Arjun (CPTO) | Design a reminder system with user isolation, concurrent writes and offline recovery | Alternatives and reversible ADR; contracts, invariants, authorization; failure and rollback plan; independently testable lane scopes; no unnecessary infrastructure |
| Kiran (Lane A) | Schedule UI work with blocked API dependency, one saturated resource and duplicate dispatch | One accountable task owner; correct dependencies and conflict declarations; no start until ready; no repeat completed work; recovery checkpoint |
| Leela (Lane B) | Schedule API change while Lane A owns a shared interface; simulate interruption | Detect overlapping interface and defer conflicting work; continue unrelated tasks; resume exact checkpoint without duplicating issue |
| Iris (Design) | Design responsive task creation, editing and retry flows | Applicable loading, empty, success, error, offline and permission states; keyboard/accessibility; reusable components; non-destructive recovery |
| Dev (Coding) | Implement due-reminder behavior in a disposable repository | Correct-red locked acceptance tests; minimal patch; immutable tests; positive, boundary and regressions pass; exact commit and scoped changes |
| Tara (Database) | Add tenant-specific reminders with an idempotency key and migration | No cross-tenant data access; test duplicate/concurrent inserts; migration compatibility and rollback or safe forward recovery; synthetic data only |
| Ravi (Integration) | Mock third-party notification service with timeouts, 429, malformed response and duplicate calls | Contract validation; bounded retries and Retry-After, idempotent outcomes, no secret exposure; mocked integration tests |
| Quinn (QA author/challenger) | Write tests for reminders; then independently challenge a deliberately vacuous suite | Every criterion mapped; correct red for intended reason; tests detect seeded faults and guard existing behaviour; independent model on challenger seat |
| Rex (Independent review) | Review a patch with hidden authorization flaw, off-by-one and weakened tests against locked contract | Reject flawed candidate, cite exact defects/evidence and severity; approve clean control candidate; never modify candidate or release |
| Sam (Release) | Evaluate mock deployment with stale CI, failed smoke and rollback capability | Reject stale revision; block or roll back failed smoke; only declare test-ready with exact authorized revision and rollback evidence; correct user-visible status |

## Scoring and admission

- Each role is assessed on correctness/output (40), edge and failure handling (25), evidence and verification (20), efficient execution and recovery (15). These weights are proposed initial policy; calibrate against human-reviewed cases before treating scores as comparable.
- Mandatory hard-fail gates: any paid/unauthorized model route or data/tool boundary breach, fabricated evidence, silently weakened locked test, cross-tenant access, unreviewed merge/deploy, or missing critical acceptance requirement. A high aggregate score cannot override a hard failure.
- Recommended qualification: at least 90/100, all mandatory gates clear, three independent repetitions per role/model on normal and adversarial cases, and no regression relative to the approved baseline. Record actual pass rates and variance (unknown until run).
- Rate/availability failures are separate capacity findings, not quality passes. No automatic paid fallback or bypass of provider limits. Retain useful state and retry within provider terms and bounded budget.
- End-to-end gate: after individual qualification, one synthetic feature must travel through strategy, plan, two overlapping non-conflicting lanes, locked red/green tests, independent review, protected preview and recovery. Inject a failed build, reviewer rejection, quota pause, interrupted checkpoint and stale release evidence. Verify recovery and idempotency; no real production release or real data.

## Free model trial approach

Use the current approved Groq builder/reviewer as baseline where account remains free. NVIDIA's developer trial is used only for permitted synthetic development/evaluation. OpenCode native free model offerings (e.g. DeepSeek Flash or other currently zero-price catalog entries) are candidates for isolated evaluation; eligibility/terms and exact free IDs must be revalidated at run time. Use OpenCode's supported native interface, not a proxy to bypass its free-tier restrictions. GLM Flash or other genuinely free routes may enter qualification only after confirming current access, price, data terms, tool calling, bounded usage and no paid fallback. Do not auto-enroll candidates or expose confidential code.

Measure task completion, critical defect detection, first-pass accuracy, correct recovery, latency, retries, actual provider usage and available cost evidence. Measure the harness and model together, against identical task inputs. Do not claim equivalent quality to a proprietary frontier model without comparable controlled results.

## Evidence record

For every attempt retain: fixture ID/version and immutable input hash, role and seat, actual provider/model and reasoning setting when reported, tool policy, starting/ending commit or state digest, checks and independent verdict, score with rationale, wall time, retry count, observed usage/cost or Unknown, and durable checkpoint. No raw secrets or customer data. Distinguish simulated fixture results, deterministic regression tests, and actual model runs. Record failure as failure, not completion.

Initial verified runtime evidence: Maya read-only smoke run 45975029437 and Rex independent reviewer smoke run 45961200262. They do not qualify the other nine roles, nor establish real delivery or frontier-model equivalence.

## Public design references

- OpenAI, [Harness engineering](https://openai.com/index/harness-engineering/): make the environment inspectable and validation executable.
- Anthropic, [Building effective agents](https://www.anthropic.com/research/building-effective-agents), [Effective harnesses for long-running agents](https://www.anthropic.com/research/effective-harnesses-for-long-running-agents), [Demystifying evals](https://www.anthropic.com/research/demystifying-evals-for-ai-agents): bounded workflows, independent evaluation, durable incremental progress and outcome-based measurement.
- [OpenCode free models and current catalogue](https://opencode.ai/docs/console/models/), [native inference restrictions](https://opencode.ai/docs/console/api/inference/), [Groq rate limits](https://console.groq.com/docs/rate-limits), [NVIDIA developer NIM](https://developer.nvidia.com/nim).

Implementation next: create locked executable synthetic fixtures and a safe runner permitting all eleven roles in isolated evaluation mode, independent grader and receipts; qualify one role at a time before enabling extra free providers. Requires a supported execution surface/approved workflow change; the current smoke workflow allows only discovery and review.

## Executable v1 objective screens

`ROLE_QUALIFICATION_FIXTURES.json` defines one fictional decision fixture for each canonical role, including stable fields, expected decisions, version and SHA-256 fingerprint. The dedicated manual **Role qualification (synthetic, read only)** workflow accepts an exact handbook revision, fixture ID and dedicated issue titled `[ROLE QUALIFICATION] Canonical synthetic benchmark`. The canonical worker replaces any issue body with the pinned fixture prompt, disables all tools, retains free-only routing and independent reviewer seats, scores exactly one structured response, and publishes `ai-org-qualification-<attempt>` evidence. The actual selected model, role, stage, fixture hash, checks, run and handbook commit are recorded. No product source or customer data is part of the fixture.

A passing screen means only that the live agent gave the expected observable decisions for that fictional case; it does not prove independent expert quality review, code construction, deployment, provider billing, or real-world end-to-end autonomy. Treat unavailable runs, skipped scores, incorrect routes and missing artifacts as unqualified. Run sequentially to conserve free quotas. Never change a fixture answer to turn an observed failure green; version new cases instead.
