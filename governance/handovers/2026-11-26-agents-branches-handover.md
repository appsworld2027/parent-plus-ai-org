# AI Org — Session Checkpoint

Product: AppsWorld AI Org (ai-org, Studio, Garage) + Parent Plus
Feature ID: SAFE-AGENTS-01 (safe unattended agents) and BRANCH-CLEAN-01
Current stage: Cleanup DONE; supervised run DONE; Studio standards, agent roster and usage ledger merged; Parent Plus switch set by founder
Responsible agent: Sam (Release), with Quinn (independent QA)
Repository / branch / commit SHA: appsworld2027/parent-plus-ai-org main 6e3c520; ai-org-studio main e388feb; Parent-plus- main 46b625e; studio-garage main (unchanged)
Checkpoint status: Synced to GitHub (Verified only after a fresh session reads it back)

## 1. Current objective
(a) Delete the branches already contained in `main`. (b) Turn on unattended agents safely and prove them with one supervised, low-risk run.

## 2. Approved decisions
- Founder mandate (26 Nov 2026): founder does strategy and tests the deployed product only; AI owns everything else; zero incremental budget (ChatGPT Plus + Claude Pro only); escalate only for strategy, spend, irreversible risk.
- "Make agents safe, then turn them on" (Recommended option chosen). Merged to main after an independent re-review (round 1 BLOCK, round 2 PASS).
- Phase 3A hold lifted by the founder; Phase 3A branches integrated into main.
- Short founder dashboard in `standards/FOUNDER_RESPONSE.md` wins in conversation; `governance/FOUNDER_DASHBOARD.md` is the long-form scheduled-report template.
- MM/development has full AI development authority; release to main needs founder /approve; hosted/canonical DB, real family/child data, paid services need the founder.

## 3. Completed work (evidence)
- Safety: `vars.UNATTENDED_AGENTS == 'on'` gates agent-worker, agent-resume and the caller jobs in ai-agents.yml (ai-org and Parent-plus-). Codex also needs `UNATTENDED_CODEX == 'on'` and runs `--sandbox workspace-write` (bypass flag removed). `protected-paths.yml` blocks AI-authored PRs touching `.github/workflows/**`, `.ai-org/**`, CODEOWNERS; Parent-plus- calls it. `ai-loop.yml` is intentionally ungated (no model calls; main ships only on founder /approve).
- Merged to main: ai-org (founder-standards, phase3a-original, Phase 3A integration), Studio (studio-founder-charter, founder-dashboard, founder-standards, conflict in studio-rules.md resolved), Parent-plus- (founder-standards).
- Tests: ai-org 84/84 Node, 12/12 Python, validate-ai-org and sync-agents --check pass; Studio 49/49.

## 4. Current implementation state
- Update 2026-11-26 (later): all 24 stale branches deleted by the founder and verified (only main + protected branches remain). `UNATTENDED_AGENTS` is on for ai-org (proven by run 45779408013). Codex is off (step skipped). Supervised run: issue #69 (`ai:build`) -> free engine -> PR #70 (README.md +4/-0, not merged, main 22a535f unchanged, no protected paths). Parent-plus- switch not set.
- Stale branches still on the remote (all fully inside main, safe to delete): ai-org: 12 `ankit/*` (agent-resume, agent-router, agent-worker, ai-org-v2, dashboard, fcc-smoke, free-engine, native-first, nim-probe, qa-charter, quality-system, worker-hardening), `codex/phase3a-execution`, `codex/founder-charter-mcp-retirement`, `codex/recovery/846a1138-110c-4b5e-956c-00681efd680a`, `codex/recovery/adb41dc1-7f4c-42a8-b14e-c19812ebdba1`, `codex/recovery/e5715701-9d7d-4bf8-a346-51a326bf1ac4`, `codex/recovery/phase3a-original`, `integration/phase3a`, `claude/founder-standards`. Studio: `codex/studio-founder-charter`, `codex/founder-dashboard`, `claude/founder-standards`. Parent-plus-: `claude/founder-standards`.
- Do NOT delete: `main`; Parent-plus- `MM/development`, `AM/consolidated` (AM's), `ai/contract-needs-you-fees-overdue` and `ai/memory-needs-you-fees-overdue-signoff` (in flight, awaiting founder /approve), `build-status` (bot).
- Before deleting each branch re-check `git merge-base --is-ancestor origin/<b> origin/main`; a Codex session may have pushed since.

## 5. Quality evidence
See section 3. NOT verified: a live agent run, a sandboxed Codex run on a ChatGPT-subscription login, branch protection on main in any repo, that `vars` resolve from the caller repo in reusable workflows (documented GitHub behaviour, untested here).

## 6. Constraints and known traps
- The previous session could push and merge but its git proxy refused every `git push --delete` and its `gh` token was invalid. Run `gh auth status` first; if invalid, do not retry blindly.
- A bracket error once made label-triggered agents bypass the switch; after any edit to `if:` conditions, balance-check parentheses (YAML parse does not catch it).
- Agents never edit the switches or protected paths. Never print secrets. No paid services. Public repos.
- Two agent pairs of files must stay in sync: run `node scripts/sync-agents.mjs` after editing `org/agents/*.md`; `instruction-contract.test.mjs` pins exact phrases in AGENTS.md.

## 7. Open decisions
- Founder: confirm the first supervised agent run (suggest one low-risk ai-org issue) and then leave `UNATTENDED_AGENTS=on`. Founder may need to set the variable or give a session GitHub access (https://claude.ai/connect-github).

## 8. Resource consumption
Model: Sonnet 5.5 session plus one reviewer subagent (~110k subagent tokens, measured). Subscription use, spend: Unknown. Incremental spend: none.

## 9. Next action (updated: steps 1-3 done)
Remaining: dispose of PR #70 (close; the added line is low value); decide enabling Parent-plus- and `UNATTENDED_CODEX` separately. Note: cloud sessions CAN create issues and read Actions; they CANNOT delete branches or read/set Actions variables via the proxy. Founder works only in cloud Claude Code, never a local machine.

### Original steps
1. `gh auth status`; if it works, delete the branches listed in section 4 (re-verify each is contained in main first), in ai-org, ai-org-studio, Parent-plus-.
2. Set Actions variable `UNATTENDED_AGENTS=on` on ONE repo (ai-org) only, `gh variable set UNATTENDED_AGENTS --body on --repo appsworld2027/parent-plus-ai-org` (leave Codex off).
3. Label one low-risk issue `ai:*`, watch the run, confirm: it ran sandboxed, opened a PR, did not merge to main, did not touch protected paths. Report evidence. If anything fails, set the variable off and report.
4. Only then enable Parent Plus (Parent-plus-) and, separately, decide `UNATTENDED_CODEX`.

## 10. Memory updates
Founder mandate and the decisions in section 2 apply to all products. Append one line to `governance/decisions/LOG.md` for the switch design.

## 11. Update 2026-11-26 (end of day)
- Standing founder rule: take every Recommended option on non-product decisions and report afterwards; ask only for product decisions, spend, and irreversible or privacy risk.
- Merged to main: ai-org PR #71 (handover/LOG), #72 (Maya PRODUCT_THINKING report, evaluation/readiness templates, dashboard on every work reply); Studio PR #12 (product-thinking + response rules + usage ledger), #13 (Agents view with tool/model), #14 (11-agent roster, tests and deployment per feature, hides no-op hourly runs).
- Founder set `UNATTENDED_AGENTS=on` on Parent-plus- (not verified from here: Actions variables are unreadable through the cloud proxy). Codex stays off.
- Awaiting founder: `/approve` of contract `ai/contract-needs-you-fees-overdue` (product gate) so the loop can build, test, review and deploy a preview.
- Not verified: Studio changes on a live machine; token counts for GitHub Actions runs (tool shown, tokens Unknown); Parent-plus- run logs (repo attached read-only).
- Cloud-session limits: can create issues, PRs, merges and read runs; cannot delete branches or read/set Actions variables.
- Founder works only from cloud Claude Code and Cloud Shell; never suggest a local machine.
