# A-15 follow-up — Shared product contract directory

Status: deterministic integrated candidate, not deployed.

Problem: the initial A-15 portability fix removed Parent Plus-specific role instructions, but onboarding already honored product.docsFolder while router, controller, worker and lock checker used docs/product. An alternate product directory therefore produced inconsistent agent assignments, feature hydration, acceptance grading and handover checks.

Decision: use one product-docs resolver, default docs/product. Explicit product.docsFolder values may be nested beneath docs/ (simple repository-relative components); memory remains separate. Reject unsupported or malformed values instead of silently diverging. Configuration is read from the current product's manifest; the contract-lock CLI resolves the same setting from its base revision rather than the candidate checkout. Default backlog uses the configured docs root unless expressly overridden. The worker records the resolved root from the route step and uses it in feature worktree, gate and handover paths. The agent prompt and onboarding state the configured root. Shared playbook examples and the deliberately fixed synthetic safe-trial fixture still use the default structure. Locked acceptance paths, skip checks, drift checks, memory rules and release gates remain unchanged.

Evidence: two regressions failed before implementation (alternate prompt/assignment and contract lock); six new A-15 tests now cover prompt/controller, lock and locked drift, configuration, temporary real Git base-revision checker, alternate onboarding isolation, and workflow wiring plus shell syntax. Existing default path tests remain unchanged. Additional hosted verification and independent exact-head review are required. Two-product live execution remains unproven. No product files, provider calls, security settings or shared quota were touched.

Candidate is stacked on integration-only PR #168, not a direct production merge. Keep integration duplicate as a test candidate; preserve independent PR review gates and port the delta to the accepted production baseline only after reviews.
