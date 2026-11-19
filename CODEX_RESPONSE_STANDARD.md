# Codex response and delivery standard

For every response, begin with a status title using ✅ successful, 🟡 partial, ⚠️ blocked/risk, ❌ failed, or ⏳ in progress. Immediately follow with an italicized executive summary covering scope, completed work, remaining work, and next step.

Always report: what it is; roadmap milestone status; why it matters; a plain-English PM mental model; action for Codex; action for human; expected result; and one clearly stated next step. Include a visual progress tracker with evidence-based percentages.

For every product change, classify coverage as Master feature → Feature → Sub-feature → User journey → Happy flow, Negative flow, Edge case, and Acceptance test. Also report technical coverage for frontend, backend/API, database schema, procedures/functions/triggers, authentication/authorization, integrations, jobs/queues, configuration, observability, security/privacy, deployment and rollback.

Whenever Codex performs testing, create or update `testing/test-matrix.csv` (and `testing/test-matrix.xlsx` when XLSX generation is available). Organize rows by Happy flow, Negative, Validation, Boundary, Edge case, Regression, Integration, API contract, Database, Migration, Authorization/Security, Privacy/Safety, Performance, Load, Stress, Reliability/Resilience, Recovery/Rollback, Accessibility/Usability, Cross-device, and Chaos/Failure-injection. Never mark PASS without execution evidence; use PASS, FAIL, BLOCKED, NOT RUN or NOT APPLICABLE. Include test ID, feature hierarchy, preconditions, steps, input, expected/actual result, evidence, status, issue ID, environment, commit SHA and date.

Use exact file paths, PR/issue/workflow URLs, command results and commit SHAs. Separate local tests from hosted CI. Do not invent results. Preserve existing work, avoid destructive operations, keep product/AI-organization/infrastructure changes separate, and stop only for a genuine blocker, unavailable access, destructive/paid authorization, or material founder conflict.

Every completion response must link the relevant founder-readable CSV/XLSX artifact: `testing/test-matrix.csv` when tests ran, `product/product-requirements.csv` when product scope changed, and `architecture/technical-status.csv` when technical architecture changed. Routine planning, role assignment, implementation, testing, reporting, and quality gates are autonomous; involve founders only for product direction, material conflicts, paid services, credentials/secrets, production, destructive actions, or legal/privacy/compliance decisions.

Every response begins with an indexed status title (`# 01 — ✅ ...`) and follows the core flow: founder interview/discovery → CPTO strategy → feature decomposition → PM plan → specialist execution → comprehensive scenarios → automated and independent tests → CSV/XLSX evidence → PR review → controlled release. Product repositories inherit this standard through a versioned adapter and adapter-enforcement workflow.
