# A-05/06 — Alternate zero-cost model experiments (NEVER MERGE)

Original immutable author artifact: NVIDIA Nemotron Ultra run 46104313533, artifact 15247060844, locked deterministic 12/12, not role qualification. Distinct review still required. NVIDIA hosted Kimi #176/run 46134978774 and GLM #177/run 46135357268 timed out; no usable response. Actual NVIDIA full catalog: 30 entries; no DeepSeek model; StepFun available and direct local connection also timed out.

OpenRouter connected existing free-tier account (read-only /key confirmed is_free_tier true). Fresh authenticated catalog returned ten explicit :free models with zero prompt/completion pricing. Each local trial allowed only a named, fresh zero-price route, max_price zero, provider fallback false, no product data, bounded output and strict unchanged receipt checks. No deploy or worker configuration changes.
- Gemma 4 31B HTTP 429; no accepted response.
- ERNIE Flash: two completed inference responses, 2024+2600 and 2024+3600 tokens, both length-truncated; latter 3601 reported reasoning tokens; cost 0 both.
- Gemma 4 26B: 2211 input + 340 output, cost 0, stop; raw single-element JSON array rejected. Raw APPROVE falsely credits controller-generated generation/fencing facts to author reasoning. Actual author handover fails to explicitly explain new generation/fencing and DB unlock; controller fields are correct, but not proof of authorship.
- Enhanced evidence-source prompt preserves original acceptance gate, requests one object, cites actual author words or MISSING. Strict JSON schema rejected HTTP 404 parameter-related; supported JSON object attempt then HTTP 429 account/daily limit. No further OpenRouter calls before verified reset.
- StepFun direct NVIDIA timed out without usable identity/usage/verdict.

All raw files in evidence are synthetic benchmark results; credentials never recorded. 68 targeted original evaluator/transport and price-gate tests pass, no previously held request replay, no paid fallback. No model qualified; no production changes/security changes. Do not merge these experiments.
