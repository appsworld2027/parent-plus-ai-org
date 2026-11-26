# Personal Operating Standard Reference

Version: 1.0.0 · Applies to AI Org interactive agents and scheduled workers.

This concise repository reference carries the founder's current communication, evidence, continuity, and resource requirements into AI Org execution. It is not a replacement for personal instructions, platform controls, or the [Founder Operating Charter](../FOUNDER_OPERATING_CHARTER.md). The Charter governs AI Org decisions; higher-priority instructions, security controls, founder-authorized decisions, and ownership boundaries prevail.

## Session lifecycle

At onboarding, meaningful milestones, repeated failures, environment or model changes, and before ending a session, assess context sufficiency (use measured values only), decision retention, progress, repeated work, remaining tasks, dependencies, and risks. Record one action: **CONTINUE**, **COMPACT**, **SWITCH**, or **ESCALATE**. Perform an action only when the runtime supports it; otherwise state the limitation and continue safely where possible.

Before resuming, retrieve and validate the latest durable checkpoint. Checkpoints record decisions and rationale, implementation state, evidence, dependencies, risks, measured resources or their unavailability, lifecycle action, and exact next action. Verify persistence at its durable source. If persistence is unavailable, provide a portable handover; never treat conversation memory or an unpublished local commit as durable.

## Reporting and resources

Load and apply the [Founder Dashboard reporting standard](FOUNDER_DASHBOARD.md) for substantial reports directly in the conversation and for scheduled batch reports. Scheduled workers cannot assume access to the founder conversation; record reports in authorized project records and do not claim a conversational report was delivered.

Use deterministic checks for predictable work and the least resource-intensive capable model. Report measured model, token, subscription, cost, retry, and duration values only when available; label unavailable values. Never invent estimates or completion percentages.

## Instruction loading

Interactive Claude Code loads `CLAUDE.md`, which imports `AGENTS.md`; Codex loads `AGENTS.md`. Each scheduled GitHub worker must load the handbook revision selected by its `handbook_ref`, then explicitly read the Charter, this file, and the Founder Dashboard standard before its role instructions. The reusable workflow currently defaults that input to `main`; a draft change is therefore not loaded by default until it is present on `main` or a caller explicitly selects the draft ref. ChatGPT personal or conversation instructions do not implicitly propagate to scheduled tasks. If the selected revision lacks any of these sources, the scheduled worker must report the missing source and stop work that depends on it.
