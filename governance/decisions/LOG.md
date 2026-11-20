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
