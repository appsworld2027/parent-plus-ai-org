DECISION
Design the Course pilot as a native extension of the existing Coach workspace, strictly adhering to the `EXPO_PUBLIC_COURSE_PILOT` flag and the locked CRS-01 contract. The feature is a local, in-memory curriculum builder with immutable versioning, not a live-synced product. We will reuse the existing `PrototypeFrame`, `prototypeColors`, and `ConfirmDialog` patterns to ensure visual and behavioral consistency with the current app. The design prioritizes mobile-first interaction, explicit state visibility (draft vs. published), and strict data isolation per owner/academy. No new navigation tabs are added; "Courses" is a button on the "Today" screen.

DELIVERABLE
**File:** `docs/product/course-pilot/DESIGN.md`

**1. Entry Point (Today Screen)**
*   **Component:** `Button` (Primary style)
*   **Label:** "Courses"
*   **Visibility:** Only if `EXPO_PUBLIC_COURSE_PILOT === "1"` AND authenticated Coach session exists.
*   **Action:** Navigates to `CoursesList` screen.

**2. Courses List Screen**
*   **Header:** "Courses"
*   **Pilot Banner:** `View` with `Text` "Course pilot — not synced" (Warning color, small font).
*   **Empty State:**
    *   **Icon:** `PrototypeIcon` (glyph: 'book' or similar existing asset)
    *   **Text:** "No courses yet"
    *   **Action:** `Button` "Create course"
*   **List Item (Course Card):**
    *   **Title:** Course Title (Trimmed)
    *   **Status Badge:** "Draft" (Neutral) or "Version N" (Success)
    *   **Action:** Tap to open `CourseEditor`.

**3. Course Editor Screen**
*   **Header:** "Edit Course" or "Create Course"
*   **Form Fields:**
    *   `TextInput` "Course title" (Label: "Course title")
    *   **Stages Section:**
        *   Dynamic list of `StageCard` components.
        *   Each `StageCard` contains:
            *   `TextInput` "Stage N title"
            *   Dynamic list of `ObjectiveInput` components.
            *   `Button` "Add objective"
        *   `Button` "Add stage"
*   **Validation States:**
    *   **Error:** `Text` "Course title is required" (Error color) below title field if blank on save.
    *   **Preservation:** All other inputs remain populated on validation failure.
*   **Actions:**
    *   `Button` "Save draft" (Primary)
    *   `Button` "Publish version" (Secondary, only if valid draft exists)
    *   `Button` "View history" (Tertiary, only if versions exist)

**4. Publish Confirmation Modal**
*   **Component:** `ConfirmDialog` (Reused from App.tsx pattern)
*   **Title:** "Publish version?"
*   **Message:** "This creates an immutable Version N. You can edit later to create a new version."
*   **Buttons:** "Confirm publish" (Primary), "Cancel" (Secondary)

**5. History Screen**
*   **Header:** "Version History"
*   **List:** Ordered list of immutable versions.
    *   **Item:** "Version N" + Original Title + Timestamp.
    *   **State:** Read-only. No edit buttons.

**6. Dirty Navigation Guard**
*   **Trigger:** Attempting to leave `CourseEditor` with unsaved changes.
*   **Component:** `ConfirmDialog`
*   **Title:** "Leave your unsaved changes?"
*   **Message:** "Your changes have not been saved. Keep editing or discard this form before leaving."
*   **Buttons:** "Discard and leave" (Destructive), "Keep editing" (Secondary)

EVIDENCE
*   **Source:** `App.tsx` (sha256: `55fbde651c74c392701da8574491a82a7b0bb705d6aaa977bc5cc5c7b38f39e8`)
    *   Line 40: `type Screen = 'Today' | 'Schedule' | 'Post' | 'Students' | 'Fees' | 'Support';` — Confirms existing tab structure.
    *   Line 238: `ConfirmDialog` usage with "Leave your unsaved changes?" — Confirms existing dirty-state guard pattern.
    *   Line 26: `import { prototypeColors as c, prototypeWeight } from './src/ui/prototypeTheme';` — Confirms design system usage.
*   **Contract:** CRS-01-SC-001 to CRS-01-SC-006.
    *   SC-001: "Courses button on Today... empty state 'No courses yet'".
    *   SC-002: "Save draft validates a blank title visibly ('Course title is required')".
    *   SC-004: "Publish version requires a confirmation... View history shows both Version 1 and Version 2".
    *   SC-005: "Leaving a dirty course form via Today opens existing 'Leave your unsaved changes?' confirmation".
*   **Constraints:** "Mock/local in-memory service only... Show 'Course pilot — not synced' prominently."

RISKS
1.  **Scope Creep:** Developers may attempt to add live sync or Supabase calls. **Mitigation:** Explicitly state in DESIGN.md that all data is in-memory and local. No network requests for course data.
2.  **State Leakage:** Cross-owner/academy data leakage. **Mitigation:** In-memory repository must be strictly scoped by `ownerId` and `academyId`. Design assumes the service layer enforces this; UI does not handle multi-tenant logic.
3.  **Immutable Versioning Confusion:** Users may expect to edit published versions. **Mitigation:** Clear copy in Publish Confirmation and History screen ("immutable", "new version").
4.  **Dirty State Complexity:** Managing dirty state across nested stages/objectives. **Mitigation:** Use a single `isDirty` flag in the editor, set to `true` on any input change, reset on save/publish/discard.
5.  **Accessibility:** Dynamic lists (stages/objectives) may break screen reader flow. **Mitigation:** Use `accessibilityLabel` for each dynamic input (e.g., "Stage 1 title", "Stage 1 objective 1").

HANDOFF
*   **To:** Arjun (Engineering)
*   **Action:** Implement `src/courses/` components and in-memory repository.
*   **Key Files to Create:**
    *   `src/courses/CoursesList.tsx`
    *   `src/courses/CourseEditor.tsx`
    *   `src/courses/CourseHistory.tsx`
    *   `src/courses/courseRepository.ts` (In-memory, scoped by owner/academy)
    *   `src/courses/courseTypes.ts` (Typed model)
*   **Key Files to Modify:**
    *   `App.tsx`: Add "Courses" button to Today screen, add `Courses` to `Screen` type, wire navigation.
*   **Testable Oracles:**
    *   `tests/course-list.test.ts`: Assert "No courses yet" visible when empty.
    *   `tests/course-editor.test.ts`: Assert "Course title is required" visible on blank save.
    *   `tests/course-publish.test.ts`: Assert "Version 1" visible after publish, "Version 2" after edit+publish.
    *   `tests/course-dirty.test.ts`: Assert "Leave your unsaved changes?" visible on navigation attempt with dirty state.
*   **Unresolved Blockers:** None. Contract is locked. Design is ready for implementation.
