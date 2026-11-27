DECISION
Approve Lane B verification and recovery DAG for CRS-01. Lane B is restricted to read-only verification, test planning, and conflict serialization. No source modifications, command execution, or test runs are authorized. The DAG focuses on validating the locked contract against the pinned source `710082b2d8cf3c1007086df31f87b34ae8e02573`, ensuring non-overlap with Lane A, and defining stop/go criteria based on static evidence.

DELIVERABLE
1. **Verification DAG**:
   - **Node 1 (Static Audit)**: Verify `src/courses/` existence and structure. Confirm `App.tsx` navigation wiring matches `Screen` type extension (currently `'Today' | 'Schedule' | 'Post' | 'Students' | 'Fees' | 'Support'`).
   - **Node 2 (Contract Check)**: Validate `EXPO_PUBLIC_COURSE_PILOT` flag logic. Ensure no Supabase calls in course service. Confirm in-memory repository scope by owner/academy.
   - **Node 3 (Test Planning)**: Define test oracles for `tests/course*.test.ts`. Map AC-001 to AC-006 to specific test cases.
   - **Node 4 (Conflict Serialization)**: Establish file lock rules. Lane B may only read `src/courses/` and `tests/course*.test.ts`. Lane A owns `App.tsx` modifications.
   - **Node 5 (Stop/Go)**: Go if static audit passes and test plan covers all ACs. Stop if source hash mismatch or missing flag guard.

2. **Test/Input Hashes**:
   - **Base Hash**: `710082b2d8cf3c1007086df31f87b34ae8e02573`
   - **App.tsx SHA256**: `55fbde651c74c392701da8574491a82a7b0bb705d6aaa977bc5cc5c7b38f39e8`
   - **Test Inputs**: Mock course objects with valid/invalid titles (0, 1, 200, 201 chars), stages (0, 1, 20, 21), objectives (0, 1, 20, 21).
   - **Oracles**:
     - AC-001: `Courses` button visible only if `EXPO_PUBLIC_COURSE_PILOT === "1"`.
     - AC-002: Blank title triggers `"Course title is required"`, no course created.
     - AC-003: Add stage/objective updates state correctly.
     - AC-004: Publish creates immutable version. Edit creates new draft.
     - AC-005: Dirty form triggers `"Leave your unsaved changes?"`.
     - AC-006: No network requests for course data.

3. **Non-Overlap**:
   - Lane A: `App.tsx`, `src/ui/`, `src/auth/`.
   - Lane B: `src/courses/`, `tests/course*.test.ts`.
   - Conflict Rule: Lane B cannot modify `App.tsx`. If `App.tsx` changes, Lane B must re-verify navigation wiring.

EVIDENCE
- **Source Pin**: `710082b2d8cf3c1007086df31f87b34ae8e02573`
- **App.tsx Excerpt**: Confirms `Screen` type does not include `'Courses'`. Navigation logic at lines 40-42 shows existing tabs. Dirty state guard at lines 238-240 uses `ConfirmDialog`.
- **Contract**: `CRS-01` requires `EXPO_PUBLIC_COURSE_PILOT` flag. No live DB. In-memory only.
- **Missing Evidence**: `src/courses/` directory not present in provided excerpts. `tests/course*.test.ts` not provided.
- **Hash Verification**: `App.tsx` SHA256 matches provided evidence.

RISKS
1. **Missing Source**: `src/courses/` not provided. Cannot verify implementation details.
2. **Navigation Gap**: `App.tsx` does not include `'Courses'` in `Screen` type. Lane A must add this. Lane B cannot proceed until Lane A commits.
3. **Test Absence**: No test files provided. Cannot verify test coverage.
4. **Flag Logic**: `EXPO_PUBLIC_COURSE_PILOT` not visible in `App.tsx` excerpt. Must verify in full source.
5. **Conflict**: If Lane A modifies `App.tsx` after Lane B starts, Lane B must re-verify.

HANDOFF
1. **Lane A**: Add `'Courses'` to `Screen` type in `App.tsx`. Implement navigation wiring. Ensure `EXPO_PUBLIC_COURSE_PILOT` check.
2. **Lane B**: Once Lane A commits, verify `src/courses/` structure. Write tests for AC-001 to AC-006.
3. **Arjun**: Approve Lane A changes. Monitor for conflicts.
4. **Stop Condition**: If `App.tsx` hash changes, Lane B must re-verify. If `src/courses/` missing, stop and escalate.
5. **Go Condition**: Lane A commits `App.tsx` changes. Lane B verifies `src/courses/` and tests. All ACs covered.
