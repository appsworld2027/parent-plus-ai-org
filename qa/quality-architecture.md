# Master QA flow

```text
Product repository adapter
        ↓
Master Quality Lead
        ↓
Feature Registry → Scenario Registry → Traceability Matrix
        ↓                  ↓                  ↓
Feature QA · API QA · DB QA · UI QA · Security QA · Regression QA · Performance QA
        ↓
GitHub Actions execution
        ↓
Evidence and defect classification
        ↓
Repair loop and regression rerun
        ↓
Independent QA review
        ↓
Founder-readable Quality Report
        ↓
Release gate
```

GitHub Actions is the deterministic execution engine. AI agents design scenarios, interpret failures and prepare fixes; an agent definition alone is not evidence that an agent is running.

## Registry report semantics (Gemini audit A-09)
Run `node scripts/quality-report.mjs` from the product or core repository root. The report names the current repository rather than assuming a product brand. Template rows are excluded; duplicate IDs, missing requirements, empty registries, orphaned or mismatched traces, non-pass results and missing evidence require review. The supported recorded statuses are IMPLEMENTED for a feature, PASS/PASSED for a scenario, and APPROVED plus READY for a trace. These flags describe recorded metadata only.

`RECORDED_EVIDENCE` means the registry links and declared results are complete; it does **not** mean the evidence was independently verified. `releaseReadiness` remains UNVERIFIED because this reporter cannot inspect execution receipts, independent identities or exact commits. Actual release gates remain authoritative. Malformed CSV fails explicitly. The JSON contains all review reasons; the founder summary shows at most 20.
