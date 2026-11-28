# Exact Ultra artifact independent reviewer-only trial (never merge)

Mistral timed out after Ultra passed the unchanged gate 12/12. That attempt is
held, never retried. This experiment replays the exact prior artifact and raw
decision from run 46104313533, verifies identity, digest, receipt and recomputed
artifact/gate, and sends only one bounded reviewer call to a different model
family (DeepSeek V4 Pro through the same hosted NVIDIA developer trial).
No regeneration; no manual correction; no paid fallback; no actual product
or worker execution; no production qualification. Author and review hashes
must match. Reviewer checks material deficiencies, including lease fencing,
generation, dependency order and handover, not generic approval. If rejected,
record the failure without repeated inference or lowering the gate.
