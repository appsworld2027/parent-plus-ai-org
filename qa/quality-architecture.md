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
