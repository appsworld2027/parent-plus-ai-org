DECISION
Approve Lane A execution for the Course pilot (CRS-01) strictly within the isolated evaluation copy. The feature is a coach-managed curriculum with stages and objectives, not a marketplace or enrollment system. All work is gated behind `EXPO_PUBLIC_COURSE_PILOT === "1"` and a verified Coach academy/session. No Dev dispatch occurs until the acceptance lock is confirmed and the shared file ownership map is finalized. The pilot uses a mock/local in-memory service only; no Supabase calls, no live data, and no persistence of personal data. The UI must fit the existing Coach workspace and Aurora design, preserving the five existing tabs.

DELIVERABLE
Lane A DAG consists of four sequential, independent issues, each ≤ 1 day of work and ≤ 300 changed lines.

1. **CRS-01-A1: Data Model & In-Memory Repository**
   - **Files:** `src/courses/model.ts`, `src/courses/repository.ts`
   - **Inputs:** Owner ID, Academy ID, Course Draft (title, stages, objectives).
   - **Outputs:** Typed `CourseDraft`, `PublishedVersion`, `Repository` interface.
   - **Invariants:** 1–200 char names; 1–20 stages; 1–20 objectives/stage; max 200 objectives/course; unique stable IDs; idempotent replay via request ID; immutable published snapshots.
   - **Oracle:** Unit tests assert bounds, duplicate ID rejection, owner+academy partitioning, and idempotency key reuse with changed payload rejection.

2. **CRS-01-A2: Course List & Create UI**
   - **Files:** `src/courses/CourseList.tsx`, `src/courses/CreateCourse.tsx`, `App.tsx` (minimal wiring)
   - **Inputs:** Authenticated Coach session, `EXPO_PUBLIC_COURSE_PILOT` flag.
   - **Outputs:** "Courses" button on Today; heading "Courses"; pilot label "Course pilot — not synced"; empty state "No courses yet" with "Create course" button.
   - **Invariants:** No entry point if flag is not "1" or session is not Coach. Existing five tabs remain intact.
   - **Oracle:** Browser test asserts visible elements and navigation behavior.

3. **CRS-01-A3: Draft Editing & Validation**
   - **Files:** `src/courses/EditCourse.tsx`
   - **Inputs:** Existing draft ID or new draft.
   - **Outputs:** Form with accessible labels "Course title", "Stage 1 title", "Stage 1 objective 1". Validation error "Course title is required" on blank title. "Add stage" and "Add objective" buttons.
   - **Invariants:** Valid draft saves to list showing title and "Draft". Edit restores all fields. Dirty state guard triggers "Leave your unsaved changes?" confirmation.
   - **Oracle:** Browser test asserts validation visibility, field preservation on error, and dirty-state guard behavior.

4. **CRS-01-A4: Publish & History**
   - **Files:** `src/courses/PublishCourse.tsx`, `src/courses/VersionHistory.tsx`
   - **Inputs:** Valid draft, confirmation dialog.
   - **Outputs:** "Confirm publish" button. Successful publish shows "Version 1". Edit and republish creates "Version 2". History shows both versions with original titles.
   - **Invariants:** Published history is never overwritten. Explicit confirmation required. Repeated actions disabled while saving.
   - **Oracle:** Browser test asserts version immutability and history ordering.

EVIDENCE
- **Source Hash:** `710082b2d8cf3c1007086df31f87b34ae8e02573`
- **App.tsx SHA256:** `55fbde651c74c392701da8574491a82a7b0bb705d6aaa977bc5cc5c7b38f39e8`
- **Acceptance Criteria:** CRS-01-SC-001 through CRS-01-SC-006 are frozen and mapped to the four issues above.
- **Test Files:** New tests under `tests/course*.test.ts` are allowed. Existing tests, fixtures, and configs are not editable.
- **Design Tokens:** Use `prototypeColors` and `prototypeWeight` from `src/ui/prototypeTheme`.
- **Navigation Wiring:** `App.tsx` line 40 defines `Screen` type; line 62 manages `screen` state. Minimal changes required to add "Courses" to the `Screen` union and tab array.

RISKS
- **Shared File Conflict:** `App.tsx` is a shared file. Lane A must not edit files owned by other open issues. The navigation wiring must be isolated to prevent conflicts with Lane B.
- **Dirty State Guard:** The existing `ConfirmDialog` in `App.tsx` (line 238) handles unsaved changes. Course forms must integrate with this mechanism without breaking existing behavior for "Post" and "Schedule" screens.
- **Idempotency:** The in-memory repository must correctly handle idempotent replay. Reusing a request ID with a changed payload must be rejected.
- **Scope Creep:** The pilot must not include marketplace discovery, payment, child enrollment, or automatic mastery. Any deviation requires founder approval.
- **Test Coverage:** Absence of evidence is not a PASS. Unit tests must actually assert the rules defined in the contract.

HANDOFF
- **Lane B Trigger:** Lane B begins only after Lane A issues are closed with evidence. Lane B focuses on independent review gates: data model bounds, UI loading/empty/validation/error paths, and dirty-state guard.
- **Review Gates:**
  1. Data model: bounds, duplicate IDs, owner+academy partition, expected revision conflict, idempotency key reuse rejection, no mutable version reference, no hidden persistence.
  2. UI: loading/empty/validation/error paths, dirty-state guard, no fake production sync, original Coach/Parent routes preserved, keyboard/mobile responsive.
- **Final Grade:** Fresh runner against all six locked browser cases, original browser regressions, TypeScript, and unit suite. Record exact base and candidate hash, actual model/routes, retries, duration, and independently reviewed diff.
- **Escalation:** If any Lane A issue becomes `ai:blocked` or fails 5 QA/review rounds, escalate to Arjun with options.
- **Completion:** Every Lane A issue in the Epic is closed with evidence. No live release is authorized by this pilot.
