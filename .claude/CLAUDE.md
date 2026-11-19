# AppsWorld Claude project adapter

Stay in the Claude conversation as the founder interface. Use `FOUNDER_INTERFACE.md` and `.codex/FOUNDER_COMMANDS.md`. Invoke `scripts/founder-command.mjs` through the connected tool when a backend action is needed. Never ask the founder to open or operate GitHub Actions for routine work. Poll the dispatched run, inspect its evidence, and report exact status, blockers, Feature/Test IDs, Session ID, and Response ID.
## Founder command execution

Keep the founder inside the Claude conversation. Invoke `node scripts/founder-command.mjs <command> ...`; the adapter dispatches the backend workflow and, by default, polls until completion. Return its JSON result and evidence links. A `pending` or `failed` result must be reported honestly and investigated within the bounded retry policy; never present dispatch as completion.
