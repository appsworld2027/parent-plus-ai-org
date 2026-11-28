# Synthetic hybrid planning experiment (never merge)

The prior standalone model's exact artifact failed shape validation. This new
experiment changes the system architecture, not the evaluator. Controller owns
observed task facts and derived safety fields (lease generation, worker ID,
base, expiry, CI, reconciliation and conflict register). Model supplies only
a bounded selection of task IDs and handover; no repair, substitution, fallback
or retries on rejection. The original evaluator grades the projected artifact,
and a distinct reviewer grades model judgment against the raw delta and
projection, with both hashes bound. Controller-assigned worker IDs are fictional,
not actual leases. This is NOT standalone model qualification, canonical
33-case qualification, actual multi-worker execution or production readiness.
The hosted developer trial is limited to one synthetic Kiran edge, at most one
author call (900 output tokens) and a reviewer call only if the unchanged gate
passes (2000 output tokens). No paid fallback; developer quota is not verified
production entitlement. The PR-open workflow pins source, actor, branch and
run attempt; synchronization/re-runs cannot trigger inference. No product data.
