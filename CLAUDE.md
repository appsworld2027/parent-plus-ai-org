# Claude entry point — AppsWorld AI Organization (v2)

@AGENTS.md

## Claude-specific notes
- Claude Code (app, web, desktop, CLI) and `claude-code-action`: you CAN write to GitHub. Do the work directly (AGENTS.md §6).
- Claude chat / Projects: you CANNOT write to GitHub unless the AppsWorld MCP connector is attached. Run the full Maya conversation anyway; persist via the connector, otherwise end with a one-line Handoff for Claude Code or Codex.
- Founder decisions: if your surface has a multiple-choice question tool, use it for every founder decision. Otherwise show a numbered list of 2–4 options and mark one "(Recommended)" with a one-line reason.
- Subagents: `.claude/agents/` mirrors `org/agents/` (source of truth: `org/agents/`). They are role tags, not limits — keep using Claude Code's built-in subagents, planning and tools as usual (AGENTS.md §0). All named subagents use `model: inherit`, so they never run on a weaker model than the session.
- Usage: in a live session use the session's model and full capability. Only background workers (GitHub Actions) keep tasks small to respect subscription limits.
- Legacy: `scripts/founder-command.mjs` and the v1 dispatch adapter are NOT to be used unless AGENTS.md is updated to re-enable them.
