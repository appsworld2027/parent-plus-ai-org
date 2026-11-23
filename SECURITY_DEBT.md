# Security & Reliability Debt Register

Founder decision (2026-11-20): agents get unrestricted access for speed. Risks are accepted and logged here instead of blocking work.
**Review date: 2027-01-20.** On that date: make repos private, protect `main`, rotate every token below, and remove access agents no longer need.

## Accepted security risks
| # | Risk | Why accepted | Fix at review |
|---|---|---|---|
| S1 | AI Org and product repos are public | Free features, simpler setup | Make both repos private |
| S2 | Remote MCP server (`api/mcp.js` on Vercel) has no authentication and can dispatch workflows; anyone who finds the URL can trigger runs and burn subscription quota | Keeps chat surfaces able to save work | Add a shared-secret or OAuth check, or remove dispatch tools |
| S3 | v1 dispatch workflows interpolate `${{ inputs.* }}` directly into shell commands (shell injection) | v1 workflows are legacy | Pass inputs via `env:` and quote them, or delete v1 workflows |
| S4 | `main` is unprotected; agents merge their own PRs with auto-merge | Founder wants no approval gates | Branch protection with required checks |
| S5 | Agents may deploy production and set repository secrets | Founder wants no approval gates | Restrict production deploy and secret management to a release workflow |
| S6 | Claude subscription OAuth token (`CLAUDE_CODE_OAUTH_TOKEN`, ~1 year) tied to the founder's personal plan | Zero-budget requirement | Rotate; consider a dedicated account |
| S7 | ChatGPT login file (`auth.json`) stored as a secret for the Codex worker; OpenAI advises against this on public repos; refresh write-back needs a token with secrets write access | Zero-budget requirement | Make repos private or switch to an API key |
| S8 | Personal email `spngmm@gmail.com` visible in public commit history | Already published | Use GitHub noreply emails (done for new commits from 2026-11-20) |
| S9 | Historic commits authored by the shared identity "Anuman" — unclear which founder made them | Historic | `Requested-by:` trailers and per-founder identities (in place from 2026-11-20) |
| S10 | Free engine sends prompts and repo content to NVIDIA NIM (free tier: evaluation/prototyping terms) through Free Claude Code, a third-party AGPL proxy installed unpinned from PyPI on every run | Zero-budget requirement; repos are public anyway | Pin the FCC version; move to a paid engine or a self-hosted model |
| S11 | Product repos call the reusable `contract-lock.yml` at `@main`: a bad change to AI Org `main` reaches every product at once | No release process yet; fastest to iterate | Pin callers to a version tag or commit SHA |

**2026-11-23 update:** the 11 v1 workflows were retired (Actions audit). This removes S3 (shell injection), R1–R4, and the
workflows S2's remote MCP could dispatch (`api/mcp.js` itself is still deployed — remove or protect it at review). S4 is
partly fixed: Parent Plus `main` now accepts changes only through pull requests (no force-push, no deletion).

## Known v1 reliability defects (from the 2026-11-19 audit)
| # | Defect | Fix |
|---|---|---|
| R1 | `daily-report.yml`: stray `+` hidden by `tee` → reports green when it failed | Fix the script and use `set -o pipefail` |
| R2 | `multi-agent-qa.yml` hardcodes "completed" and only checks that files exist | Replace with Quinn's real test run |
| R3 | "AI PM" brief/plan workflows are fixed templates with no model call | Superseded by Maya (v2) running in Claude Code / Codex |
| R4 | approve / plan / route workflows have never run | Superseded by the v2 label-driven workers |
| R5 | Legacy `.codex/agents/{pm,cpto,coding,database,integration,qa}.toml` coexist with v2 agents because `org.py` loads them | Retire `org.py`, then remove the legacy files |
| R6 | `contract-lock` cannot detect weakened assertions or lowered coverage thresholds | Rex checks this in review; later add an assertion-count / coverage diff check |
