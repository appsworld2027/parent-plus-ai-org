**DECISION**  
Implement the **Course pilot** feature on the isolated `710082b2d8cf3c1007086df31f87b34ae8e02573` codebase. The feature will be gated by the build‑time flag `EXPO_PUBLIC_COURSE_PILOT="1"` and will only be reachable from the existing **Today** tab. All data will be stored in an in‑memory repository scoped to the authenticated coach’s `ownerId` + `academyId`. No persistence, Supabase calls, or production flags will be touched. The UI will follow the existing Aurora design system (Typography, `prototypeColors`, RN controls).  

**DELIVERABLE**  

| Path | Purpose | Invariant |
|------|---------|-----------|
| `src/courses/models.ts` | TypeScript interfaces: `Course`, `Stage`, `Objective`, `CourseVersion`. Enforce 1‑200 char titles, ≤20 stages, ≤20 objectives per stage, ≤200 objectives total, stable UUIDs. | All fields validated on save; IDs immutable. |
| `src/courses/repository.ts` | In‑memory singleton `CourseRepo` with methods `saveDraft`, `publish`, `getDrafts`, `getHistory`, `load(id)`. Scoped by `ownerId` + `academyId`. | No cross‑owner leakage; drafts persist only for session lifetime. |
| `src/courses/components/CourseList.tsx` | Lists drafts and published versions; shows “No courses yet” empty state; button “Create course”. | Shows only courses belonging to current session. |
| `src/courses/components/CourseForm.tsx` | Form for title, stages, objectives; validation messages per contract (e.g., “Course title is required”). Handles dirty‑state flag `formDirty`. | Validation does not discard other inputs; `formBusy` disables duplicate actions. |
| `src/courses/components/PublishDialog.tsx` | Confirmation modal with “Confirm publish”. On success increments version number and stores immutable snapshot. | Published snapshots never overwritten. |
| `src/courses/components/HistoryView.tsx` | Displays ordered immutable versions with titles. | Version order preserved. |
| `src/courses/index.tsx` | Exported entry point for navigation. | Export default component. |
| **App.tsx** (modify) | Add navigation entry: `if (process.env.EXPO_PUBLIC_COURSE_PILOT === "1") tabs.push({ name: 'Courses', glyph: 'book' })`. Add case in screen switch to render `<CourseRoot />`. | Entry appears only when flag true and auth present. |
| `tests/courseList.test.ts` | Unit test for empty state, draft creation, version list. | Assertions match contract IDs CRS‑01‑SC‑001‑006. |
| `tests/courseForm.test.ts` | Validation, dirty‑state guard, publish flow. | Assertions match CRS‑01‑SC‑002‑005. |
| `tests/coursePublish.test.ts` | Immutable version creation, history view. | Assertions match CRS‑01‑SC‑004. |

All new files live under `src/courses/`. No existing files are edited except the **App.tsx** navigation snippet (line 41‑44). No new package scripts or config changes are required.

**EVIDENCE**  

- Contract table (CRS‑01‑SC‑001 … CRS‑01‑SC‑006) defines required behaviours.  
- `App.tsx` excerpt (lines 40‑44, 58‑60, 237‑240) shows existing tab navigation and dirty‑state dialog logic that we will reuse.  
- Flag gating requirement is explicitly stated in the contract (“EXPO_PUBLIC_COURSE_PILOT is ‘1’”).  
- Data‑model constraints are taken from “private021” description in the contract.  
- All paths referenced above exist in the repository tree; SHA‑256 of `App.tsx` is `55fbde65…`.  

**RISKS**  

| Risk | Impact | Mitigation |
|------|--------|------------|
| Dirty‑state dialog conflict with new Courses screen navigation | Users may lose unsaved edits or see duplicate dialogs | Reuse existing `pendingNavigation` logic; ensure `setFormDirty` is called only from `CourseForm`. |
| In‑memory repo leakage across owners if `ownerId`/`academyId` not correctly captured | Data privacy breach in pilot | Strictly bind repo instance to `useAuth()` values; unit test for cross‑owner isolation. |
| Flag mis‑configuration causing feature exposure in production | Unintended UI in live app | Add runtime guard `if (!auth || !auth.academy) return null;` before rendering Courses tab. |
| Test flakiness due to async state updates in RN components | False failures in CI | Use `act` wrappers and deterministic mock timers in tests. |
| Missing accessibility labels (screen‑reader) | Non‑compliant UI | Follow existing component patterns; include `accessibilityLabel` props as per `Typography` usage. |
| Acceptance lock not approved | Feature cannot be merged | Document lock status in PR description; do not merge until lock cleared. |

**HANDOFF**  

- **Branch**: `ai/contract-crs-01` (created from `main`).  
- **PR Title**: `feat(course‑pilot): add Courses UI and in‑memory backend (CRS‑01)`.  
- **Review Checklist**:  
  1. Verify flag gating (`EXPO_PUBLIC_COURSE_PILOT`).  
  2. Run all unit tests; ensure six locked contract cases pass.  
  3. Confirm no modifications to existing tests, DB schemas, or production flags.  
  4. Manual QA: navigate Today → Courses, create draft, validate errors, publish, view history, test dirty‑state navigation.  
- **Owner**: Arjun (product lead).  
- **Open Issues**:  
  - `ai:fix` #? – pending clarification on exact UUID generation library (node‑crypto vs. uuid).  
  - `ai:plan` – schedule integration test with the existing `diagnostics` flow (potential race with `formBusy`).  

All deliverables are ready for implementation without further code changes to existing modules.
