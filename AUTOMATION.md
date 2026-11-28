# Automated AI organization operations

## Mental model

Founder or GitHub event → AI Org GitHub Actions orchestration → isolated worktree
→ named role agent through FCC on the approved Groq free builder and distinct Groq free reviewer → deterministic checks
→ independent QA on a different model family → pull request and verified release gate.

## Installation

Requirements: Node 22+, Python 3.11+, Git, GitHub Actions access and an approved Groq free-tier key. The authoritative route and exact model identifiers are defined in `governance/AUTONOMY_POLICY.json`; NVIDIA NIM is restricted to supervised synthetic evaluation, not ordinary build or review work. Unattended agents use no subscription login, paid inference API or paid fallback. A missing route or exhausted quota pauses work.

```bash
npm ci --ignore-scripts --no-audit --no-fund
npm run ai:verify
```

The free-model adapter is pinned to `free-claude-code==6.19.56` in the reusable
agent worker. Superpowers is installed as 15 vendored
repository-local skills under `.ai/skills/superpowers`; its exact upstream version,
commit and MIT license are under `third_party/superpowers`.

## Safe proof of concept

```bash
npm run ai:pilot
```

This uses Cezar's mock agent, creates an isolated worktree, runs the one-team
workflow, executes both quality gates and records mock usage without model spend.

## Legacy mock cockpit (dry-run only)

```bash
npm run ai:cockpit
```

The cockpit binds to loopback by default. Do not expose it publicly: Cezar has no
built-in authentication. For remote use, place it behind an authenticated HTTPS
reverse proxy and approve that infrastructure separately.

The Cezar templates retain historical runner names for mock fixtures. Do not enable them or import them into a live cockpit: `ai:automations:import` is disabled until a verified free-only adapter is available. GitHub Actions owns live dispatch and recovery.

## Historical Cezar dry-run workflows

- `one-team-delivery`: PM → Database → Integration → TDD Coding → checks → QA → gate.
- `two-team-delivery`: CPTO dispatches at most two PM teams and requires cross-team QA.
- `pr-independent-qa`: checks a new PR head without modifying or merging it. Its
  gate recognizes the Parent Plus pilot test, then a project's `npm run check`,
  then `npm run ai:verify`, and fails closed when none exists.
- `daily-founder-report`: reports delivery, decisions, quality, usage and missing data.

## Historical portable automations (disabled)

- Daily founder report at 09:00 in the cockpit timezone.
- Independent QA for future newly opened pull requests, polling every five minutes.

The PR automation excludes `skip-ai-qa`, rejects fork heads, works in an isolated
worktree and never merges. Existing PRs are not launched when it is enabled because
Cezar establishes a current-time baseline.

## Cost and autonomy boundaries

- Start with `one-team-delivery`; use `two-team-delivery` only for separable modules.
- Two-team dispatch is capped at two PM child tasks by organization policy.
- Cezar reports tokens/cost exposed by the runner; missing data remains explicit.
- No automatic merge, production deployment, purchase, credential change or
  destructive migration is permitted.
- Material founder conflicts block only affected work and go to Ankit and Manu.
