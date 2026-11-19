# Approved-plan issue routing

`route-approved-plan.yml` converts an approved product plan into PM and specialist issues.

It always creates an auditable bundle under `orchestration/issue-bundles/`. It creates remote Parent Plus issues only when the optional `PARENT_PLUS_TOKEN` secret is present with issue-write permission.

This preserves a truthful state: a generated bundle is not reported as remote assignment unless GitHub confirms issue creation.
