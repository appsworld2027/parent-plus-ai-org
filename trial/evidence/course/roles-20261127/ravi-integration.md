DECISION
Implement a local, in-memory Course repository scoped by `owner_id` and `academy_id` to satisfy CRS-01-SC-001 through CRS-01-SC-006. The service will strictly enforce the `EXPO_PUBLIC_COURSE_PILOT === "1"` gate and verified Coach session. No network calls, Supabase interactions, or persistent storage will occur. The implementation will mirror the idempotency and versioning semantics of `supabase/candidates/202611180021_learning_context.sql` (specifically `workspace_publish_curriculum` and `learning_receipts`) using local state only.

DELIVERABLE
1.  **`src/courses/types.ts`**: Define `CourseDraft`, `CourseVersion`, and `CourseReceipt`. Enforce bounds: title 1–200 chars, 1–20 stages, 1–20 objectives/stage, max 200 objectives/course.
2.  **`src/courses/repository.ts`**: In-memory store keyed by `${ownerId}:${academyId}`.
    *   `saveDraft(draft, requestId)`: Validates bounds. Returns `draftId`.
    *   `publishVersion(draftId, expectedVersion, requestId)`: Checks `requestId` against `receipts`. If `requestId` exists with different payload hash, reject (idempotency violation). If valid, create immutable `CourseVersion` snapshot.
    *   `getHistory(courseId)`: Returns ordered immutable versions.
3.  **`src/courses/CourseList.tsx` & `CourseForm.tsx`**: React Native components using `prototypeColors` and `Typography`.
    *   Form includes accessible labels: "Course title", "Stage 1 title", "Stage 1 objective 1".
    *   Validation: Blank title triggers "Course title is required" without clearing other inputs.
    *   Dirty state: Exposes `isDirty` and `onDirtyChange` to `App.tsx`.
4.  **`App.tsx` Wiring**: Add `'Courses'` to `Screen` type. Add tab entry. Wire `formBusy` and `formDirty` states to the existing `ConfirmDialog` logic (lines 238–240) to handle "Leave your unsaved changes?".
5.  **`tests/course.repository.test.ts`**: Unit tests for bounds, idempotency, and version immutability.

EVIDENCE
*   **Source Pin**: `710082b2d8cf3c1007086df31f87b34ae8e02573`.
*   **SQL Semantics**: `supabase/candidates/202611180021_learning_context.sql` defines `learning_receipts` with `primary key(workspace_id,membership_id,request_id)` and `payload_hash`. The local repository will replicate this: `Map<requestId, { payloadHash, result }>`.
*   **UI Integration**: `App.tsx` line 40 defines `Screen` type. Line 238 shows existing `ConfirmDialog` for dirty states. The Course form will hook into `setFormDirty` and `setFormBusy` (lines 73–74).
*   **Constraints**: No edits to existing tests, fixtures, or `package.json`. New code isolated in `src/courses/`.

RISKS
*   **Idempotency Mismatch**: Local hash calculation must match SQL `payload_hash` logic if future sync occurs. Mitigation: Use canonical JSON serialization for hashing.
*   **State Leakage**: In-memory store must strictly partition by `ownerId:academyId`. Risk of cross-workspace leakage if keys are malformed. Mitigation: Unit tests for partition isolation.
*   **Dirty State Race**: Rapid navigation during save. Mitigation: `formBusy` flag disables navigation triggers in `App.tsx`.
*   **Unknown**: Exact `payload_hash` algorithm in SQL is not fully visible in excerpt. Assumed SHA-256 of canonical JSON.

HANDOFF
*   **Status**: Implementation-ready design. Acceptance lock **NOT approved**.
*   **Blockers**: None for local implementation. Future transport requires SQL `payload_hash` algorithm confirmation.
*   **Next Steps**:
    1.  Create `src/courses/` directory.
    2.  Implement `repository.ts` with in-memory `Map`.
    3.  Implement `CourseForm.tsx` with validation and dirty state callbacks.
    4.  Update `App.tsx` `Screen` type and tab array.
    5.  Write `tests/course.repository.test.ts` covering CRS-01-SC-002 (validation) and CRS-01-SC-004 (versioning).
*   **Verification**: Run `npx jest tests/course.repository.test.ts` (mocked, no live calls). Verify `EXPO_PUBLIC_COURSE_PILOT` gate prevents entry when unset.
