# AppsWorld orchestration foundation

The registry and event log are the first durable control-plane records for the AI organization.

- `agent-registry.json` lists the 11 roles and their model tier. It is generated from `org/agents/`; it does not report live status.
- `task-events.jsonl` is an append-only activity history.
- `founder-intake.yml` converts one founder idea into a durable Discovery task.
- `scripts/intake-idea.mjs` creates an Idea ID, Feature ID, Task ID, open discovery questions, assigned roles, and optional Session/Response IDs.

The workflow records the work; it does not claim a live Codex agent is running unless a runner supplies an execution record.
