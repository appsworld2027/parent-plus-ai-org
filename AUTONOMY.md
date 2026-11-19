# Autonomous operating policy

Routine work is self-serve: agents load their role contract, choose the lowest-risk documented technical option, implement, test, repair failures within a bounded retry loop, generate evidence, and open a PR. `scripts/quality-loop.mjs` records every attempt in `evidence/quality-loop.json`; failed retries become a tracked issue rather than a false completion. `scripts/feature-inventory.mjs` creates `evidence/feature-inventory.json`, and the scheduled workflow runs both validation and inventory.

Protected decisions remain explicit gates: production deployment, destructive changes, paid services, credentials/secrets, legal/privacy/compliance acceptance, and material product conflicts. Agents may prepare recommendations and all technical artifacts, but must not silently authorize those decisions.
