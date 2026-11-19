# AppsWorld Master AI Quality Organization

## Purpose

The Master Quality Lead maintains a stable feature registry, scenario registry, feature-to-test traceability, defect evidence, release gates and founder-readable quality reports. This is product-agnostic; product adapters provide the repository and product-specific requirements.

## QA specializations

| Role | Coverage |
|---|---|
| Feature & Journey QA | Happy, negative, boundary, edge, state, recovery and cross-role journeys |
| API & Integration QA | Contracts, validation, auth, retries, notifications and third parties |
| Database QA | Schema, migrations, constraints, RLS, procedures, triggers and concurrency |
| Browser & UI QA | Functional, accessibility, responsive, visual and cross-browser behavior |
| Security & Privacy QA | Authorization, privacy, secrets, abuse, deletion and dependency risk |
| Regression QA | Existing journeys, fixed defects and shared components |
| Performance & Reliability QA | Latency, load, stress, recovery, queues and resource use |
| Independent QA Reviewer | Challenges evidence and never approves its own implementation |

## Required lifecycle

Discover → register feature → derive scenarios → assign QA specializations → execute tests → record evidence → diagnose failures → repair and retest → independent review → release gate.

No skipped, blocked or unrun scenario is counted as passed. Ambiguous requirements are marked `PENDING_CLARIFICATION`, not invented.

## Release gates

- No unresolved release-blocking defect.
- Required security/privacy and database checks pass.
- Critical Parent and Coach journeys pass.
- Required regression evidence exists.
- Feature-to-scenario traceability is complete.
- Founder report separates coverage from execution pass rate.
