# 0002 — Adopt Cezar and Superpowers

- Date: 2026-11-18
- Status: accepted
- Classification: routine organization implementation
- Owner: AI CPTO
- Decision: use Cezar `0.20.0` as the repository-pinned orchestration runtime
  and Superpowers `7.0.2` as the repository-local engineering skills library.
- Rationale: the independent native pilot established the safety baseline. Cezar
  now supplies isolated worktrees, workflow execution, retries, task visibility,
  scheduled/event automations and reported usage. Superpowers supplies planning,
  TDD, debugging, review and verification methods. Both are MIT-licensed and use
  the existing Codex/GitHub access without a new paid service.
- Supply-chain control: exact versions are recorded in `package-lock.json` and
  `third_party/superpowers/manifest.json`; vendored skills are reviewed by Git.
- Safety boundary: no automatic merge, no production credentials, no Parent Plus
  product changes, no fork-head execution, bounded dispatch, and deterministic CI.
- Evidence: `npm run ai:verify`, `npm run ai:pilot`, Cezar automation preview/list,
  and the pull request and hosted Actions run that publish this decision.
