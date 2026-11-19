# Founder command adapter

Codex or Claude should use `node scripts/founder-command.mjs` as the backend bridge. The founder does not run this command directly; the project agent invokes it when the connected GitHub tool is available and reports the result in the conversation.

Examples:

```text
discover --idea="Make Parent Plus invitations simpler"
decision --idea_id=IDEA-...
approve --idea_id=IDEA-... --decision=approve
plan --idea_id=IDEA-...
route --idea_id=IDEA-... --product_repo=appsworld2027/Parent-plus-
test --feature_id=PP-... --test_id=PP-T-...
status
```

The adapter records a conversation ID and preserves optional Codex Session/Response IDs. By default it now waits (with a bounded timeout) for the dispatched workflow, polls its GitHub run, and returns JSON containing the run ID, URL, conclusion, job-level blockers and evidence link. Use `--wait=false` for fire-and-forget or `--timeoutMs=300000` for a longer bounded wait. A timeout is reported as `pending`, never as success.

Example response contract:

```json
{"status":"completed","runId":123,"conclusion":"success","url":"https://github.com/.../actions/runs/123","blockers":[],"evidence":{"workflowRun":"https://github.com/.../actions/runs/123"}}
```

The Codex/Claude conversation remains the founder interface: the agent invokes this adapter, waits for the backend result, reads generated evidence, and summarizes the outcome without redirecting the founder to a workflow form.

## Callable conversation tool

This repository includes an MCP stdio server in `scripts/founder-mcp-server.mjs` and a Claude-compatible `.mcp.json`. When the connected Codex/Claude runtime loads repository MCP servers, call `appsworld_founder_flow` with a natural founder request mapped to `action=discover`. The tool delegates to the same audited adapter and returns the workflow evidence in the conversation. If the tool is not listed by the runtime, the session has not loaded the repository MCP configuration and must report that limitation rather than claiming agent execution.
