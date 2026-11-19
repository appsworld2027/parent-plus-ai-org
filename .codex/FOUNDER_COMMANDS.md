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

The adapter records a conversation ID and preserves optional Codex Session/Response IDs. A dispatch result is not a completed task; the agent must poll the run, inspect evidence, and report the actual outcome.
