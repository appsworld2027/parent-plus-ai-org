# Coach Course Management — locked pilot contract (CRS-01)
 
Baseline: Parent Plus MM/development at 7100828dcf3c1007086df31f87b34ae8e02573. This is a real product candidate, not a separate reminder app. The pilot scope is the existing Coach journey and LRN-01 curriculum-version foundation. The founder asked for a Course feature; the proposed first slice treats a course as a coach-managed curriculum with stages and objectives, not marketplace discovery, payment, child enrollment, automatic mastery, or Parent publication.
 
## Product goal
An academy owner can prepare a structured course, review a draft, and create an immutable version before using it for teaching. The UI fits the existing Coach workspace and Aurora design; no new commercial journey or navigation overhaul.
 
## Authority and data boundary
- Evaluation-only candidate in an isolated copy of the actual app. No Parent Plus branch writes, live data, deployment, or SQL application.
- Use the existing authenticated academy/owner identity. The feature is available only when the explicit build-time flag EXPO_PUBLIC_COURSE_PILOT is "1" and a verified Coach academy/session exists. Otherwise no entry point and no course loading.
- Mock/local in-memory service only, scoped by owner and academy. Show "Course pilot — not synced" prominently. No fake live success, no Supabase calls for this feature, no real account/child data, no persistence of personal data. Do not add a test detection branch. The production-ready service and database activation are separate gates.
- Match private021's intended contract: trim names, 1–200 characters; 1–20 stages; 1–20 objectives per stage; max 200 objectives/course; unique stable IDs; explicit expected version + request ID, idempotent replay, immutable published snapshots. Do not change private021 or imply it is live.
- After a publish, editing creates a new draft from the current version; published history is never overwritten. Publishing in the pilot means a local immutable version only. No automatic learning achievement or student placement.
- Use explicit confirmation before publishing; disable repeated actions while saving. Preserve valid edits when validation fails; guard leaving dirty forms; avoid cross-workspace/owner leakage even if the academy ID is the same.
 
## Acceptance criteria (browser contract, frozen before build)
| ID | Behaviour |
|---|---|
| CRS-01-SC-001 | Current authenticated Coach sees a Courses button on Today. Enter opens heading Courses, the honest pilot label and an empty state "No courses yet" with Create course. Existing five tabs remain. |
| CRS-01-SC-002 | Create course form provides accessible labels Course title, Stage 1 title, Stage 1 objective 1; Save draft validates a blank title visibly ("Course title is required"), without discarding the other inputs or creating a course. |
| CRS-01-SC-003 | A valid draft can have multiple ordered stages and objectives. Add stage creates Stage 2 title and Stage 2 objective 1. Add objective to stage 1 creates Stage 1 objective 2. Save draft returns to list, showing title and Draft, and Edit course restores all fields. |
| CRS-01-SC-004 | Publish version requires a confirmation with button Confirm publish. A successful local publish shows Version 1; edit and publish a changed title creates Version 2. View history shows both Version 1 and Version 2 and their original titles, not overwritten. |
| CRS-01-SC-005 | Leaving a dirty course form via Today opens existing "Leave your unsaved changes?" confirmation; Keep editing preserves input; Discard and leave abandons it. |
| CRS-01-SC-006 | A draft saved in the authenticated pilot session remains when navigating Today → Courses, and no course/curriculum network request was sent. The user is not told the draft is synced. |
 
## Implementation constraints
Add src/courses/ components, typed model and in-memory repository, and only the minimal App.tsx navigation wiring. New tests under tests/course*.test.ts are allowed. Do not edit existing tests, fixtures, package/config, auth/session providers, DB files, production flags, Parent app, or workflows. New Course code should use current Typography, prototypeColors and accessible RN controls. Save draft returns to list; Edit course opens the selected item; View history shows ordered immutable versions. Use exact accessible names in the locked tests, but avoid test-specific branches.
 
## Additional independent review gates
- Data model: bounds, duplicate IDs, owner+academy partition, expected revision conflict, idempotency key reused with a changed payload rejected, no mutable version reference, no hidden persistence.
- UI: loading/empty/validation/error paths and dirty-state guard, no fake production sync, original Coach/Parent routes preserved, keyboard/mobile responsive. Unit tests must actually assert these rules; absence of evidence is not a PASS.
- Grade on fresh runner against all six locked browser cases, original browser regressions, TypeScript and unit suite. Record exact base and candidate hash, actual model/routes, retries, duration, and independently reviewed diff. This pilot cannot certify all 11 roles or authorize a live release by itself.
