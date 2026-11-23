# Decision Log (append-only)

One line per decision. Format: date · decision · options considered · recommended · decided by.

- 2026-11-20 · Rewrite AI Org as v2 on branch `ankit/ai-org-v2`, keep v1 files as legacy · rewrite / patch v1 · rewrite · Ankit
- 2026-11-20 · Unrestricted agent autonomy until 2027-01-20, risks logged in SECURITY_DEBT.md · least-privilege / unrestricted · least-privilege (Claude) → unrestricted chosen · Ankit
- 2026-11-20 · Run agents on existing $20 Claude Pro and ChatGPT Plus subscriptions, no API spend · API keys / subscriptions · subscriptions · Ankit
- 2026-11-20 · Founder surfaces: Claude Code, Codex, Claude chat, ChatGPT (app, web, desktop) · single tool / all · all · Ankit
- 2026-11-20 · Named team of 11 agents defined once in org/agents/, generated for Claude and Codex · per-tool copies / single source · single source · Ankit
- 2026-11-20 · Maya chooses her PM method per problem and stage; no fixed question format · fixed template / adaptive · adaptive · Ankit
- 2026-11-20 · Every agent works to top-team standard and gives one Recommended option per decision · — · — · Ankit
- 2026-11-20 · Keep AI Org roles product-agnostic (enforced by tests/test_org.py) · — · keep · agent (Claude)
- 2026-11-20 · Native first: AI Org never slows or downgrades Claude Code / Codex; hand-off rules apply to background mode only; named subagents use model: inherit · ceremony everywhere / native-first · native-first · Ankit
- 2026-11-20 · Free engine: Claude Code via Free Claude Code on NVIDIA NIM (builder Nemotron 3 Ultra, reviewer Mistral Large 4); paid engines preferred when present · buy Claude Pro / free engine · free engine (smoke run 44765168916: 3/3 models pass tool use) · Ankit
- 2026-11-20 · Worker hardening after first free-engine loop (PR #34): truthful model identity (no Claude co-author trailer), stream-json logs as artifacts, ai-org:failed marker (no auto-retry), --body-file comments, evidence links · — · — · agent (Claude)
- 2026-11-21 · Quality system (AGENTS §7A): founder-approved Feature Contract, tests before code by Quinn, stacked contract→build PRs, contract-lock check (locked `tests/acceptance/`, no skip/only), Demo Pack PR template; reusable workflow gets PR data via env only, actions v5 · trust the agent / enforced quality system · enforced quality system (ai:verify exit 0, 22/22 node tests, commit b8976ff) · Ankit
- 2026-11-23 · Retire 11 v1 workflows (autonomous-quality, master-quality-report, multi-agent-qa, parent-plus-inventory, route-inventory-issue, daily-report, founder-intake, ai-pm-discovery, approve-decision, product-planning, route-approved-plan) and their run history; Parent Plus main requires PRs; loop relabels ready contracts; Demo Pack decisions go through the AI chat · keep / retire · retire (GitHub_Actions_Audit.xlsx) · Ankit
- 2026-11-23 · Agent time budget: worker pre-installs product dependencies + Playwright before the agent starts; ai:tests runs on the builder model with a focused brief (write → push → run once → PR) · longer timeout / paid model / focused brief · focused brief + pre-install (Quinn timed out on #42 after 52 tool calls, mostly reading) · Ankit
