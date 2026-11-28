# A-05/06 — Alternate zero-cost model experiments (NEVER MERGE)

Original immutable author artifact: NVIDIA Nemotron Ultra run 46104313533, artifact 15247060844, locked deterministic 12/12, not role qualification. Distinct review still required. NVIDIA hosted Kimi #176/run 46134978774 and GLM #177/run 46135357268 timed out; no usable response. Actual NVIDIA full catalog: 30 entries; no DeepSeek model; StepFun available and direct local connection also timed out.

OpenRouter connected existing free-tier account (read-only /key confirmed is_free_tier true). Fresh authenticated catalog returned ten explicit :free models with zero prompt/completion pricing. Each local trial allowed only a named, fresh zero-price route, max_price zero, provider fallback false, no product data, bounded output and strict unchanged receipt checks. No deploy or worker configuration changes.
- Gemma 4 31B HTTP 429; no accepted response.
- ERNIE Flash: two completed inference responses, 2024+2600 and 2024+3600 tokens, both length-truncated; latter 3601 reported reasoning tokens; cost 0 both.
- Gemma 4 26B: 2211 input + 340 output, cost 0, stop; raw single-element JSON array rejected. Raw APPROVE falsely credits controller-generated generation/fencing facts to author reasoning. Actual author handover fails to explicitly explain new generation/fencing and DB unlock; controller fields are correct, but not proof of authorship.
- Enhanced evidence-source prompt preserves original acceptance gate, requests one object, cites actual author words or MISSING. Strict JSON schema rejected HTTP 404 parameter-related; supported JSON object attempt then HTTP 429 account/daily limit. No further OpenRouter calls before verified reset.
- StepFun direct NVIDIA timed out without usable identity/usage/verdict.

All raw files in evidence are synthetic benchmark results; credentials never recorded. 68 targeted original evaluator/transport and price-gate tests pass, no previously held request replay, no paid fallback. No model qualified; no production changes/security changes. Do not merge these experiments.

## Evidence-provenance regression (qualification-only)

NVIDIA Gemma 3 12B returned 404 even though present in catalog; no identity/usage/verdict. The new provenance/gate.mjs requires a full criterion ledger with explicit AUTHOR versus CONTROLLER source and a verbatim quote (or MISSING), denies misplaced/fabricated quotes, duplicate/omitted criteria and approval with missing evidence. CHANGES with specific findings can be a good review. It does not establish semantic adequacy or qualification. Tests include the real Gemini/Gemma 26B raw false approval and exact original Ultra author plus projected controller data. Six provenance tests plus original locked group: 74/74. The original benchmark and production policy remain unchanged. No new model call after provider daily limit.

## Verified real two-model repair chain

Qwen free reviewer: CHANGES (missing fencing); Nemotron Ultra supervised author repair; Qwen CHANGES (blocked dependency); Ultra repair; Qwen CHANGES (unblocked does not mean completed); Ultra repair; Qwen APPROVE with exact attributed evidence and zero findings. All repaired artifacts independently recompile to 12/12; final artifact 6a62b995a588a5b17bfeb6f16d18250ab24253e2badc219ee1857dd948a02423. Hash-linked chain replay and tamper checks pass. Seven measured calls (four reviews, three repairs): 9,512 input + 3,506 output = 13,018 tokens, no paid route or fallback. The original author call and unsuccessful alternative trials are excluded from this total. Actual model output was not manually edited; ChatGPT orchestrated each step. This proves one synthetic repair cycle, not all roles, unattended execution or real product delivery. The structured future-plan gate passes deterministic tests; actual two NVIDIA attempts exhausted their budgets and are not counted as successful. Security remains deferred.
