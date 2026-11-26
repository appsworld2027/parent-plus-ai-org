# Personal Operating Standard Reference

Version: 1.0.0 · Applies to AI Org interactive agents and scheduled workers.

This concise repository reference carries the founder's current communication, evidence, continuity, and resource requirements into AI Org execution. It is not a replacement for personal instructions, platform controls, or the [Founder Operating Charter](../FOUNDER_OPERATING_CHARTER.md). The Charter governs AI Org decisions; higher-priority instructions, security controls, founder-authorized decisions, and ownership boundaries prevail.

## Session lifecycle

At onboarding, meaningful milestones, repeated failures, environment or model changes, and before ending a session, assess context sufficiency (use measured values only), decision retention, progress, repeated work, remaining tasks, dependencies, and risks. Record one action: **CONTINUE**, **COMPACT**, **SWITCH**, or **ESCALATE**. Perform an action only when the runtime supports it; otherwise state the limitation and continue safely where possible.

Before resuming, retrieve and validate the latest durable checkpoint. Checkpoints record decisions and rationale, implementation state, evidence, dependencies, risks, measured resources or their unavailability, lifecycle action, and exact next action. Verify persistence at its durable source. If persistence is unavailable, provide a portable handover; never treat conversation memory or an unpublished local commit as durable.

## Reporting and resources

Substantial interactive progress reports include a concise Founder Dashboard directly in the conversation: completed and verified outcomes, active/blocked/remaining work, founder decisions, quality and security, resources, session health, readiness, and next action. External dashboards and links are supporting evidence. Use a rich conversational presentation only when the surface actually supports it; otherwise use compact Markdown. Scheduled workers cannot assume access to the founder conversation: they record evidence in the authorized issue, pull request, ledger, or dashboard and do not claim a conversational report was delivered.

Use deterministic checks for predictable work and the least resource-intensive capable model. Report measured model, token, subscription, cost, retry, and duration values only when available; label unavailable values. Never invent estimates or completion percentages.

## Instruction loading

Interactive Claude Code loads `CLAUDE.md`, which imports `AGENTS.md`; Codex loads `AGENTS.md`. Each scheduled GitHub worker must load the handbook revision selected by its `handbook_ref`, then explicitly read the Charter and this file before its role instructions. The reusable workflow currently defaults that input to `main`; a draft change is therefore not loaded by default until it is present on `main` or a caller explicitly selects the draft ref. ChatGPT personal or conversation instructions do not implicitly propagate to scheduled tasks. If the selected revision lacks this file or the Charter, the scheduled worker must report the missing source and stop work that depends on it.
