# Parent Plus controlled onboarding

Status: read-only discovery complete on 18 November 2026.

Source repository: `appsworld2027/Parent-plus-`, default branch `main`.
No source files, repository settings, credentials, databases, deployments, or
production services were changed during onboarding.

## Product outcome

Preserve and complete the primary Coach-to-Parent loop:

Coach creates a class and enrols a student → Parent establishes an explicitly
approved child connection → Coach records attendance and reviews a
child-specific update → Parent sees only the permitted result.

The next implementation outcome must be selected from the product repository's
current roadmap. This onboarding package does not choose or authorize a product
change.

## System map

| Area | Current system | Boundary that must remain true |
| --- | --- | --- |
| Client | Expo 58, React Native 0.88, React 19, web and Android exports | Preserve native destination patterns; prototypes are reference material |
| Coach | Academy, batch, student, class, attendance, feedback and consented media | Academy authority never exposes private family data |
| Aurora Parent | Separate parent route and private family workspace | Family ownership is independent of academy roles |
| Identity | Shared Supabase Auth credentials | A login is an account, not proof of guardian authority |
| Data | Destination Supabase project; public migrations 001–014 installed | Candidate/private migrations are not live migrations |
| Authorization | RLS plus invitations, approval and emerging workspace kernel | Client role flags and IDs never create authority |
| Quality | TypeScript, Vitest, Playwright, PostgreSQL transaction tests, exports | Claims require exact-code and environment evidence |
| Delivery | Vercel web deployment and later native packaging | Provider and production actions remain separately controlled |

## Current risks

1. Guardian, academy and family data can be exposed if roles are unioned across
   workspaces or contact matching is treated as authorization.
2. Private candidate migrations can be mistaken for installed production state.
3. A passing fixture can be mistaken for real Supabase, provider, device or
   production acceptance.
4. Stale requests, drafts, uploads and queued publications can cross workspace
   boundaries unless current authority is rechecked.
5. Media access depends on every identified subject's current permission and
   purpose, including withdrawal behavior.
6. Learning-context text is untrusted and is not automatically anonymized.

## Discovery acceptance criteria

- Repository and governing instructions were read without mutation.
- Coach, Parent, Auth, data, authorization, quality and delivery boundaries are
  represented in the system map.
- Privacy, migration-state, environment-evidence and stale-authority risks are
  explicit.
- Reusable organization roles contain no Parent Plus stack or product policy.
- Implementation work remains blocked until a product outcome is selected,
  while discovery and backlog preparation are complete.

## Delivery backlog and ownership

| Order | Owner | Deliverable | Dependency |
| --- | --- | --- | --- |
| 1 | CPTO | Select one measurable roadmap outcome and freeze acceptance criteria | Founder product direction |
| 2 | PM A | Map affected flows, files, release boundaries and evidence | CPTO specification |
| 3 | Database specialist | Validate schema authority, migration state, RLS and rollback | PM map |
| 4 | Integration specialist | Validate Supabase/provider contracts, retry and failure behavior | PM map |
| 5 | Coding specialist | Implement the smallest destination-native slice | Database and integration contracts |
| 6 | QA specialist | Independently test permissions, failure, recovery and exact commit | Candidate commit |
| 7 | PM A | Assemble CI, usage and release evidence | Specialist evidence |

Team B remains available for independent risk analysis or a second non-overlapping
slice. It must not edit the same paths concurrently.

## Usage budget

- Discovery and unattended implementation use only approved free-tier model providers.
- No Codex, ChatGPT Work, paid API, subscription login or paid fallback is permitted.
- Current routing preference: NVIDIA NIM free endpoint for builder work, Groq free-tier builder fallback and independent review.
- Free-tier quota exhaustion pauses work; resume only after quota recovery or an approved free fallback.
- Incremental paid spend: zero.
- Required record: attempts, available token counts, missing measurements,
  candidate commit and CI run.

## Evidence sources

- Product `AGENTS.md`, `README.md`, `PROGRESS.md`, `PRD.md`.
- Consolidated product roadmap and Parent requirements.
- Parent module, developer guide, multi-workspace foundation and validation.
- Organization issue #3 and the pull request that adds this package.
