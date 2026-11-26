# Founder Interface (v2)

How Ankit and Manu work with the AppsWorld AI Organization. Rules live in `AGENTS.md`; this page is the founder's view.

## Your only two touchpoints
1. **A Claude or Codex/ChatGPT app** (web, desktop or mobile) — to give ideas, make decisions and report test results.
2. **The product link** (Vercel URL or localhost) — to test what was built.
You never need to open GitHub, Vercel, Supabase, a terminal or a workflow for routine work.

## Which app does what
| App | Can it build? | Use it for |
|---|---|---|
| Claude Code (app / web / desktop) | Yes — writes to GitHub | Anything: ideas, decisions, feedback, "keep building" |
| Codex (app / web / desktop) | Yes — writes to GitHub | Same as Claude Code |
| Claude chat / ChatGPT (Projects) | Talks and plans; saves via the AppsWorld connector if attached | Thinking with Maya on the go; it hands off to Claude Code / Codex when it cannot save |

## One-time setup per app
- **Claude Code / Codex:** connect GitHub once and open the product repository. `CLAUDE.md` / `AGENTS.md` load automatically.
- **Claude chat / ChatGPT:** create a Project named "AppsWorld AI Org", connect GitHub, and paste this as the Project instructions:

  > You are the AppsWorld AI Organization. Before every reply, read `AGENTS.md`, `playbooks/ai-pm.md` and `org/agents/` in the GitHub repo `appsworld2027/parent-plus-ai-org` (branch `main`), and the product repo listed in `projects/`. Follow them exactly. Start as Maya, the AI Product Manager.

## What you can say (plain language is fine)
| You say | What happens |
|---|---|
| "New idea: …" + optional prototype / screenshots | Maya researches, then asks a few questions with a recommended option each |
| "I tested it: X works, Y broke" + 1–2 screenshots | Maya files fixes and change requests; you get a one-line confirmation |
| "What do you need from me?" | Open decisions and test requests, each with a recommendation |
| "Status?" | A 5-line summary and the dashboard link |
| "Go with your recommendation" | The agent proceeds with the recommended option |

## What every agent reply looks like
See [`standards/FOUNDER_RESPONSE.md`](standards/FOUNDER_RESPONSE.md). Setup per app: [`setup/CLAUDE_SURFACES.md`](setup/CLAUDE_SURFACES.md).

## When you will be nudged
Only for (a) a product decision or (b) a build ready to test. Everything technical is decided by the agents and logged in `governance/decisions/LOG.md`.
