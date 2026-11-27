# DECISION
Implement the **Course Pilot** as a self‑contained, in‑memory feature gated by the build‑time flag `EXPO_PUBLIC_COURSE_PILOT="1"` and the existing `useAuth()` session. Add a **Courses** tab to `App.tsx`, wire navigation, and create a minimal domain model with immutable version snapshots. All state lives only on the client device; no Supabase or production DB calls are introduced. The feature will be delivered as new source files under `src/courses/` and a small edit to `src/App.tsx`. The acceptance lock remains **unapproved**; the ADR records the pending challenger.

# DELIVERABLE
| Path | Purpose | Invariant |
|------|---------|-----------|
| `src/courses/models.ts` | TypeScript interfaces: `Course`, `Stage`, `Objective`, `CourseVersion`. Enforces: title 1‑200 chars, ≤20 stages, ≤20 objectives per stage, ≤200 objectives total, stable UUIDs, owner+academy partition. | All IDs are UUID v4; version numbers monotonic per course. |
| `src/courses/repository.ts` | In‑memory singleton `CourseRepo` with methods `saveDraft`, `publish`, `list`, `get(id)`, `history(id)`. Guarantees idempotent `publish(requestId, payload)` – same `requestId` with changed payload → reject. | Drafts never persisted beyond session; published versions immutable. |
| `src/courses/screens/CourseList.tsx` | Shows “Courses” button on **Today** tab, empty state, list of drafts/versions. Uses `useAuth()` to obtain `ownerId`/`academyId`. | Visible only when flag true and auth present. |
| `src/courses/screens/CourseForm.tsx` | Accessible form with labelled inputs, validation, dirty‑state tracking (`setFormDirty`). Calls `repo.saveDraft`. | Validation errors do not clear other fields. |
| `src/courses/screens/PublishConfirm.tsx` | Modal `ConfirmDialog` (re‑uses existing component) for publish confirmation. Calls `repo.publish`. | Publish creates new immutable `CourseVersion`. |
| `src/App.tsx` (mod) | Add `{ name: 'Courses', glyph: 'book' }` to `tabs` array (line 41‑42). Insert navigation case `if (screen === 'Courses') <CourseList …/>`. Guard with `process.env.EXPO_PUBLIC_COURSE_PILOT === "1"` and `auth.session?.coach?.academyId`. | Navigation respects existing `pendingNavigation` dialog (lines 237‑240). |
| `docs/adr/2024-10-course-pilot.md` | This ADR (the current file). | – |
| `tests/course*.test.ts` | Unit tests for repository idempotency, validation, version immutability, dirty‑state guard. | Tests reference exported types; no reliance on external DB. |

# EVIDENCE
- **App.tsx navigation scaffold** (excerpt lines 40‑44, 58‑60, 237‑240) shows existing tab array and pending‑navigation dialog, confirming where to insert the new tab and reuse the guard logic.  
- **Auth usage** (line 61) demonstrates `useAuth()` is already available for owner/academy extraction.  
- **Domain constraints** are derived from the contract description (“trim names 1–200 chars; 1–20 stages; … unique stable IDs”) and the private021 spec referenced in the contract.  
- **In‑memory approach** satisfies the pilot rule “no Supabase calls, no persistence of personal data”.  

# RISKS
| Risk | Impact | Mitigation |
|------|--------|------------|
| **Data loss** – drafts exist only in RAM; closing the app discards them. | Users may think data is saved. | UI label “Course pilot — not synced” (per contract) and explicit “Leave your unsaved changes?” dialog already present. |
| **Flag misuse** – flag could be enabled in production inadvertently. | Feature exposed to live users. | Add compile‑time check and CI lint rule that `EXPO_PUBLIC_COURSE_PILOT` must be `"1"` only in `pilot` build config. |
| **Concurrency** – multiple edits in same session could race. | Overwrites of draft state. | Repository serialises calls via internal `setState` queue; publish is idempotent by `requestId`. |
| **Future DB migration** – later move to Supabase may break invariants. | Version history mismatch. | Document schema mapping in `docs/architecture/course-db-migration.md`; expose `toDTO()` converters. |
| **Unresolved challenger** – acceptance lock not approved. | Feature cannot be released. | ADR explicitly notes pending lock; handoff includes “reviewer sign‑off” step. |

# HANDOFF
- **Iris (Design)** – Provide mockups for `CourseList`, `CourseForm`, and `PublishConfirm` respecting Aurora prototype colors (`prototypeColors` from `src/ui/prototypeTheme`).  
- **Tara (DB)** – When the pilot graduates, translate `Course`, `Stage`, `Objective`, `CourseVersion` to tables in `coach_private.learning_curriculum_versions` etc.; ensure row‑level security matches existing patterns.  
- **Quinn (Testing)** – Extend the test suite with integration tests that render `App` with the flag on, navigate to Courses, and assert the six locked browser cases. Verify the dirty‑state dialog (lines 237‑240) still functions.  
- **Kiran (Auth)** – Confirm that `useAuth()` provides `ownerId` and `academyId` fields used for scoping; add unit test stubs if needed.  
- **Rex (Release Ops)** – Add the feature flag to the pilot build config, ensure it is disabled in all production bundles, and document the rollback procedure (remove tab entry, delete `src/courses/` folder).  

*All artifacts are ready for checkout; no source files have been altered yet.*
