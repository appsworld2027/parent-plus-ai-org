# 0001 — Native orchestration first

- Date: 2026-11-18
- Status: superseded by decision 0002
- Classification: routine organization implementation
- Owner: AI CPTO
- Decision: use Codex native role delegation, repository-owned agent profiles,
  Python standard-library controls, GitHub Issues, pull requests, and Actions.
- Alternatives: GitHub Spec Kit, Superpowers, and Cezar.
- Rationale: the selected stack is already available, project-independent, auditable,
  and adds no subscription or runtime dependency. Spec Kit conventions can be added
  when a product needs specification generation. Superpowers and Cezar remain
  optional until native orchestration demonstrates a concrete capability gap.
- Impact: no software installation, purchase, production credential, or Parent Plus
  product change.
- Evidence: organization configuration, role profiles, pilot, tests, and pull-request
  workflow in this repository.
