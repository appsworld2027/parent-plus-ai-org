# A-02 — Canonical model-policy consumption by the worker

Status: deterministic stacked candidate; no provider calls or model qualification claimed.

Previously scripts/agent-router.mjs loaded the governance policy for allowed engines but duplicated the three configured model identifiers, override syntax and builder preference arrays in source. A policy edit could therefore differ from actual routing. Derive the model candidate order and reviewer seat from AUTONOMY_POLICY.json, validate that existing freeModels declarations agree with providerPolicy, reject unsupported paid/subscription or unqualified NVIDIA reviewer policy values, and preserve the observed provider-availability gate, synthetic evaluation restriction, distinct configured reviewer, approved Groq effort variants and pause behavior. The source policy itself and current model IDs are unchanged. A configured route is not evidence of free entitlement, availability, performance or independent review.

Evidence: expected red regression, then 35 router tests pass. A fictional changed builder ID flows through the same selector; unavailable Groq pauses ordinary builder/reviewer, evaluation-only NVIDIA remains gated, reviewer override cannot take builder ID, paid fallback policy rejected. 217 standard +21 frontier JavaScript tests, existing Python/schema/agent/policy checks all passed. No actual provider calls; concurrent pilot untouched.

Stacked integration-only on #173. Independent exact-head review and coordinated Studio authority view remain necessary; this is not a release or authorization to use new providers.
