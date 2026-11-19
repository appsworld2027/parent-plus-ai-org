# QA Workflow Headlines and Coverage

The multi-agent QA workflow is `.github/workflows/multi-agent-qa.yml`. It runs on schedule, manual dispatch, and product-change/product-fix repository events.

## Agent workflow headlines

1. **Feature & Journey QA** — happy, negative, boundary, edge and acceptance scenarios.
2. **API & Integration QA** — API contracts, dependency contracts and integration failures.
3. **Database QA** — schema, migrations, functions, triggers, isolation and data integrity.
4. **Browser & UI QA** — browser journeys, accessibility, responsive and usability checks.
5. **Security & Privacy QA** — authentication, authorization, tenant isolation, privacy and safety.
6. **Regression QA** — smoke, regression and previously fixed defect scenarios.
7. **Performance & Reliability QA** — performance, load, stress, concurrency, resilience and recovery.
8. **Independent Review QA** — evidence review, traceability and release-risk classification.

## Continuous update mechanism

Product repositories can dispatch `product-change` or `product-fix` events with `feature_id` and `test_id`. The workflow also runs every two hours and manually. Each run records a GitHub run ID as the execution Session ID and run attempt as the Response ID. A Codex-backed runtime can add its own IDs when available.

## Important limitation

These workflows execute the role checks and produce evidence artifacts. They do not create eight permanently running AI processes. A live Codex/Cezar runner is required for autonomous code reasoning and remediation; otherwise the role is reported as configured and the workflow evidence remains explicit.
