# One new model-family experiment; never merge

Same frozen hybrid compiler, case and gate as #158, which rejected Lightning
for selecting three tasks when the budget and capacity were two. No repair
or retry of #158. New author: Nemotron 3 Ultra (2600 output tokens).
Distinct reviewer: Mistral Large 4 (3200 output tokens), only after exact
deterministic gate. Both must exist in the actual hosted model catalog
before either request. Ultra uses the previously accepted medium-reasoning
route; Mistral uses documented high reasoning and raw prompted JSON with
strict validation, because its API reference does not list response_format.
NVIDIA developer-trial synthetic-only; no production provider-policy change,
no paid fallback, no product data, no claim of actual lease execution or
standalone model qualification. PR-open-only, first attempt.
