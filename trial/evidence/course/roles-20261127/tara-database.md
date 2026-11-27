**DECISION**  
Implement the Course pilot by adding a new migration that creates `coach_private.courses`, `coach_private.course_stages` and `coach_private.course_objectives`. The migration will follow the pattern in `supabase/candidates/202611180021_learning_context.sql`: enable RLS, revoke public rights, and provide a reversible `DROP TABLE …` rollback. All data will be scoped by `workspace_id` (academy) and `membership_id` (owner) – the same tenant auth model used for learning‑curriculum tables. No production DB or real personal data will be touched.

**DELIVERABLE**  
- Migration file `migrations/2024xx_course_schema.sql` (create three tables, primary keys `uuid`, foreign keys to workspace/membership, `stable_id uuid NOT NULL UNIQUE`).  
- Row‑level‑security policies mirroring `coach_private.workspace_learning_actor` (allow only the owning `membership_id`).  
- In‑memory repository `src/courses/repo.ts` exposing `saveDraft`, `publishVersion`, `listVersions`, `loadDraft`.  
- TypeScript contracts in `src/courses/types.ts` matching the contract bounds (title 1‑200 chars, ≤20 stages, ≤20 objectives per stage, ≤200 objectives total).  
- Synthetic test suite `tests/course*.test.ts` asserting invariants, idempotent replay, and immutable version history.

**EVIDENCE**  
| Aspect | Verified by source | Unverified / Needs mapping |
|--------|-------------------|----------------------------|
| Tenant auth (workspace_id, membership_id) | Present in every `coach_private.*` table and in functions `workspace_learning_actor`, `workspace_learning_replay` | Course tables will reuse same columns – verification pending in migration PR. |
| Stable IDs & uniqueness | `uuid` primary keys, `request_id uuid` unique per (workspace, membership, request) in `learning_receipts` | Course tables must add `stable_id uuid UNIQUE`; not yet created. |
| Expected version & replay guard | Functions accept `expected integer` and reject mismatched payloads (e.g., `workspace_save_learning_plan`) | Course `publishVersion` will need analogous `expected` check – logic to be written. |
| Immutability of published snapshots | `learning_receipts` stores immutable JSON `result`; `workspace_publish_curriculum` creates new immutable version | Course version rows will be immutable by design, but test of non‑overwrite is pending. |
| Migration & rollback pattern | `execute format('alter table … enable row level security')` and `revoke all …` followed by `DROP TABLE` in rollback | Course migration will copy this pattern; rollback script must be reviewed. |
| Synthetic testability | Existing functions are pure and can be called with mock payloads | Course repo tests will simulate the same flow; no live Supabase calls. |

**RISKS**  
- **Schema drift**: Adding three new tables may conflict with future curriculum migrations if naming conventions diverge.  
- **RLS policy gaps**: If policies are not mirrored exactly, a draft could be read by another owner – must be validated in a security review.  
- **Idempotency key reuse**: The `request_id` column exists, but the Course repo must enforce the “same payload → same result, changed payload → reject” rule; missing this leads to silent overwrites.  
- **Rollback completeness**: Dropping tables removes data; any seed data added for synthetic tests must be regenerated on re‑apply.  
- **Unresolved blocker**: Precise definition of `stable_id` generation (e.g., `gen_random_uuid()`) and its exposure in the API is not yet documented.

**HANDOFF**  
- **Path**: `migrations/2024xx_course_schema.sql` (SQL), `src/courses/` (TS), `tests/course*.test.ts`.  
- **Invariants**: `workspace_id + membership_id` partition, `stable_id` unique, `request_id` primary key, `expected` version match, immutable version rows.  
- **Inputs**: `saveDraft(workspaceId, memberId, requestId, payload)`; `publishVersion(workspaceId, memberId, requestId, expectedVersion, payload)`.  
- **Outputs**: Draft record (mutable), Version record (immutable), list of versions ordered by `created_at`.  
- **Testable oracles**:  
  1. Duplicate `requestId` with identical payload returns same draft ID.  
  2. Duplicate `requestId` with changed payload returns error.  
  3. Publishing with wrong `expectedVersion` aborts.  
  4. History query returns all published versions unchanged after subsequent edits.  
- **Open items**: finalize RLS policy SQL, confirm stable‑ID column naming, add synthetic seed rows for CI, obtain security sign‑off before PR merge.
