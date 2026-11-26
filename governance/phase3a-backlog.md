<details>
<summary>Development backlog and verification</summary>

| Task | State | Evidence or dependency |
| --- | --- | --- |
| Founder Operating Charter | Draft | [AI Org #68](https://github.com/appsworld2027/parent-plus-ai-org/pull/68) |
| Exact-commit contract lock | Locally verified | Local changed-head regression rejected a locked-test change. |
| AI Org workflow permissions | Partial | Central caller maps engine secrets explicitly. Resume permissions narrowed. Worker credential isolation still open. |
| Human review boundary | Locally verified | Feature staging uses the existing autonomous Rex gate. An optional release-level reviewer allowlist applies only to main releases. Founder release authorization remains in effect. AI verdict provenance remains open. |
| Required checks and branch protections | Partial | Controller requires GitHub Actions as the source of required check results. Workflow-specific binding and repository branch rules remain pending. |
| MCP retirement | Locally verified | GET and POST returned 410 on loopback. Authorized hosted preview pending. |
| Studio charter | CI passed | [Studio #9](https://github.com/appsworld2027/ai-org-studio/pull/9) |
| Studio dashboard | CI passed, partial | [Studio #10](https://github.com/appsworld2027/ai-org-studio/pull/10). Runtime telemetry and ownership views pending. |
| Conditional founder escalation | Pending | Distinguish delegated decisions from material or conflicting decisions. |
| Scoped permissions and credential isolation | Pending | Validate provider and job-level permissions. |
| Model allocation and resource controls | Partial | Scheduler caps the sprint at six triggers, with a preflight, one materially changed retry, and quota-stop instructions. Token metrics, model selection and worker-side budget enforcement remain open. |
| Retry, session lifecycle and cross-engine recovery | Partial | Outer-loop discovery and PR progression, explicit approvals, and the resume sweep now respect ai:blocked. Checkpoint recovery across engines and restarts remains open. |
| Multi-founder synchronization | Pending | Preserve owner restrictions, decisions and attribution. |
| Independent audit and pilot | Blocked | Needs independent verification and the required authorization. |

</details>


