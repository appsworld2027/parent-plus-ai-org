# Delivery milestones

## Milestone 1 — Independent organization foundation

Status: complete, with live Codex execution dependent on an authenticated runtime.

Acceptance criteria:

- Private AppsWorld repository, isolated from Parent Plus product code.
- Reusable CPTO, PM, Database, Integration, Coding, and QA role profiles.
- Two delivery-team definitions and explicit ownership handoffs.
- Founder-conflict escalation that blocks only affected work.
- Pull-request quality workflow with read-only permissions.
- Synthetic end-to-end validation for delivery, governance, and usage limits.
- Auditable activity through Git history, pull requests, Actions, and the usage ledger.
- Actionable runtime diagnostics for missing authentication or writable storage.

Evidence:

- Merge commit `1fd268616dc040ba64a199c13de4e12040d14284`.
- GitHub Actions run `44290459150`.
- Local and hosted unit test suite.
- Synthetic conflict demo and usage-ledger tests.

The live CLI adapter reached Codex successfully after moving session storage to a
writable directory. Its saved ChatGPT credential had expired. A future authenticated
runtime can execute the same adapter without changing the organization repository.

## Milestone 2 — Controlled project onboarding

Goal: connect one approved project through a read-only discovery phase, produce its
specification and delivery backlog, and prove that project-specific instructions do
not leak into the reusable organization roles.

Entry condition: founders name the project and authorize read-only repository access.

## Milestone 3 — First production delivery

Goal: deliver one founder-approved product outcome through the complete organization
flow, including implementation specialists, independent QA, CI evidence, usage
reporting, and a human-controlled production release.
