# Founder Dashboard --- Canonical Reporting Standard

Version: 1.0 \| Scope: interactive and scheduled AI Org development reporting

## 1. Purpose and authority

Provide a concise, evidence-backed management dashboard directly in the founder's conversation. Use this dashboard only for substantive operating reviews, scheduled reports, milestone summaries, and readiness assessments. Routine answers, engineering milestones, technical explanations, and blockers use adaptive responses guided by the Parent Plus Founder Response Reference. Routine acknowledgements need not include the full dashboard. Respect authorized notification cadence. This standard governs reporting, not engineering permissions; platform rules, security boundaries, explicit founder decisions and product-specific owner restrictions remain in force.

Load this file before a substantive operating review, scheduled report, milestone summary, or readiness assessment. Resolve the current authorized revision from the repository. Use the latest durable checkpoint, execution ledger, task inventory and current PR/CI evidence. Do not rely on stale chat history. Do not duplicate this specification in other instruction files.

## 2. Presentation contract

Prefer native rich inline presentation where supported: a prominent title, founder attention count, 2×2 KPI cards, clear section boundaries, meaningful icons, compact status labels and expandable evidence. Use responsive layouts, accessible contrast and the client's theme. Temporary visualization files and safe supporting tools are permitted within existing authorization. Do not create or deploy a separate application merely to report progress.

The complete substantive report must be in the conversation. A link, HTML source, visualization reference or one-line summary alone is not sufficient. When rich delivery is unsupported or unconfirmed, emit the complete Markdown template below in the final response, even if a rich rendering was attempted. Do not claim that the founder can see a visual without confirmation. Do not repeatedly retry a failed rendering mechanism; record the limitation and continue authorized engineering work.

Keep the primary report readable in approximately two minutes. Put decisions and outcomes before implementation details. Use concise sentences and evidence links. Avoid wide tables containing paragraphs. Omit irrelevant detail, not mandatory sections.

## 3. Exact response template

Replace every placeholder with evidence-backed information. Use `Unavailable` for missing measurements, `None` only when absence is established, and `Not applicable` when genuinely irrelevant. Never output the placeholders literally in a live report.

------------------------------------------------------------------------

# \[Project\] --- Founder Dashboard

\[Milestone / sprint\] · \[Reporting timestamp and timezone\] · **\[RUNNING / PAUSED / BLOCKED / COMPLETE\]**

### Founder attention required

# \[Decision count\] decisions

\[If zero: No immediate founder decision required. State whether authorized work can proceed and whether it is actually running. Otherwise: question, recommended option, impact, urgency and required authorization for each decision.\]

### Executive KPIs

  Completed deliverables   Active tasks
  ------------------------ -------------------
  **\[count\]**            **\[count\]**
  **Outstanding tasks**    **Blocked tasks**
  **\[count\]**            **\[count\]**

**Delivery progress:** \[verified completed / total scope, percentage if calculable; otherwise Unavailable\]

### ✓ Completed outcomes

-   \[User-visible or operational outcome delivered since previous checkpoint --- verification and evidence link.\]

### ▶ Currently executing

-   \[Actual running task --- responsible agent, expected outcome, start time if known. If none verified, explicitly say so.\]

### ◷ Remaining work and blockers

-   \[Priority · task · dependency or blocker · next action.\]

### ◈ Quality and security

**Readiness:** \[GO / CONDITIONAL GO / NO-GO / Not assessed\]

-   Acceptance and regression results: \[actual results, scope, revision\].
-   Security and release gates: \[passed, pending, failed or unavailable\].
-   Independent review: \[status and evidence\].
-   Material defects: \[severity and impact\].

### Resource intelligence

  Metric                                 Actual / available value
  -------------------------------------- --------------------------------
  Model and reasoning level              \[value\]
  Uncached input tokens                  \[value\]
  Cached input / cache creation tokens   \[value\]
  Output / reasoning tokens              \[value; separate if exposed\]
  Subscription usage / reset             \[value\]
  Incremental expenditure                \[value and currency\]
  Execution duration                     \[value\]
  Unsuccessful retries                   \[value\]

**Efficiency:** \[evidence of useful work versus repeated reads, retries or rework; material improvement action if needed\].

### Session health

**Lifecycle action: \[CONTINUE / COMPACT / SWITCH / ESCALATE\]**

-   Context sufficiency and measured utilization: \[assessment; metric if available\].
-   Decision retention and knowledge continuity: \[assessment\].
-   Execution quality and remaining risks: \[assessment\].
-   Checkpoint: \[local / published / remotely verified; revision and link\].
-   Recovery readiness: \[verified / unverified, evidence\].

### Execution schedule

-   Last batch: \[actual start/end, outcome and run ID\].
-   Current worker: \[verified active / no active worker verified\].
-   Next scheduled run: \[confirmed timestamp and timezone / disabled / unavailable\].
-   Remaining scheduled triggers: \[count / unavailable\].
-   Stop or pause reason: \[reason / not applicable\].

### Ready for founder testing

\[Verified feature, accessible preview, what to test and expected result; or explicitly state that nothing is ready. Do not imply production readiness.\]

### Next action

\[Exact next eligible task, owner, expected outcome and dependencies. State whether founder intervention is required. Do not promise background execution without verified scheduling or an active worker.\]

### Supporting evidence

\[Concise links to task inventory, PRs, exact commits, CI runs, acceptance evidence, checkpoint and decision records. Use expandable detail where supported.\]

------------------------------------------------------------------------

## 4. Metric and evidence definitions

-   Completed: deliverables meeting their defined acceptance criteria with evidence at the relevant revision. Draft implementation and released functionality are distinct states.
-   Active: tasks with a verified executing worker or operation at reporting time; planned or scheduled work is not active.
-   Outstanding: all unfinished tasks within the defined scope, including active and blocked tasks. Blocked: subset of outstanding tasks unable to proceed due to an identified dependency. Do not add these overlapping counts together.
-   Progress: completed deliverables divided by total deliverables in the same verified inventory, using consistent units. Do not mix task counts with deliverable counts or invent a denominator. State scope and reporting period.
-   Decisions: unresolved consequential decisions actually requiring founder intervention, not routine engineering choices.
-   Tests: distinguish locally reported results, independently inspected CI, skipped jobs, report-only checks and actual acceptance evidence. Do not equate green CI with production readiness.
-   Resources: report actual telemetry only; separate estimates and API-equivalent costs from actual expenditure. No new paid service does not establish zero cost. Never infer token counts or subscription use from model name or elapsed time.
-   Evidence labels: Verified = directly inspected evidence; Reported = another agent's claim; Estimated = calculation with stated assumptions; Unavailable = no reliable evidence. Label material claims accordingly.

## 5. Session lifecycle and continuity

Assess context sufficiency, decision retention, execution quality, repeated work, remaining dependencies and risks at onboarding, milestones, repeated failures, environment/model changes and before substantial session termination.

CONTINUE when effective. COMPACT only when supported, preserving essential decisions and evidence. SWITCH when context or reasoning becomes unreliable, after creating a recoverable checkpoint. ESCALATE for consequential decisions, authorization, material uncertainty or repeated failures. Do not claim to have compacted or switched unless actually supported and performed.

Persist objectives, constraints, decisions and rationale, progress, exact revisions, evidence, unresolved issues and next actions using the existing authorized checkpoint and ledger. Verify remote persistence before claiming success. If unavailable, provide a portable handover and identify the limitation. Fresh sessions must retrieve and validate the latest checkpoint before substantial execution.

## 6. Scheduled execution

Use the same reporting facts and template for scheduled batches. Persist actual batch outcomes even when routine notifications are suppressed. Consolidate reports according to the authorized schedule. Alert separately only for genuine founder intervention. Respect locks, retry budgets, authorization, quota signals and stop conditions. Never infer that a scheduler trigger completed from its configured schedule alone.

## 7. Pre-send acceptance check

Before every substantial report, verify that all template sections are present, numbers reconcile with their scope, claims are supported, unknowns are explicit, current activity is truthful, critical restrictions are retained, the checkpoint status is accurate, the next action is actionable, and the complete report is visible as text if rich delivery is uncertain. Correct omissions before sending. Record any remaining limitations or independent decisions.

## 8. Adoption

Store this file at `governance/FOUNDER_DASHBOARD.md` in the authorized AI Org repository revision. Reference it from applicable `AGENTS.md`, Founder Operating Charter and worker prompt assembly. Explicitly load it in scheduled tasks and fresh workspaces where automatic repository instruction loading is not established. Preserve product-specific ownership rules. Validate one interactive and one scheduled report against this specification before claiming adoption. This file alone does not configure any client, scheduler or agent.
