# Tara synthetic migration behavior checkpoint

This is a supplemental, deterministic behavior screen for the existing frozen
synthetic board role cases. It is not a full 100-point agent rubric, a production
database certification, or a trusted receipt producer.

## Candidate interface (include verbatim in the assigned role task)

The isolated database initially contains schema `pilot`, an existing
`pilot.reminders(tenant_id text, id text, title text, version integer DEFAULT 1)`
table with composite primary key (tenant_id,id), and two synthetic rows with the
same ID under different tenants. The migration executes exactly once as
non-superuser `pilot_owner`. The client is a separate unprivileged login
`pilot_client`. In this **synthetic fixture only**, a controller sets the session
tenant via `current_setting('pilot.tenant',true)`; this is not identity/auth
suitable for production. Empty/missing tenant must deny reads and writes.

Preserve and protect the table with RLS. Grant the client only the privileges
needed for reads and the five-parameter
`pilot.save_reminder(tenant text,id text,title text,expected_version integer,request_id text) RETURNS jsonb`.
Implement the frozen synthetic-board-v1 result shape exactly:
success `{"ok":true,"record":{"id":"...","title":"...","version":1}}`,
failure `{"ok":false,"code":"invalid|stale|conflict"}` with exact code.
Trim titles; reject blank or >80 characters and invalid expected version.
Replay identical successful tenant/request payloads using the original result,
even after later edits. Reject changed payload reuse; allow equal IDs and request
keys across tenants. Prevent stale writes and competing transaction races.
Use plain SQL only (no psql backslash commands); no external data or services.
Deliver the canonical three role artifacts (migration.sql, invariants.test.sql,
recovery.md). Only migration.sql is evaluated here.

## Evidence

Controller-owned bootstrap and SQL checks run in an ephemeral PostgreSQL
container selected by digest with no network, credentials, host DB, production
data or writable bind mounts. Candidate logs cannot supply locked pass markers.
Four destructive controls plus a concurrent unsafe control must fail. The
14 checks cover legacy preservation, tenant read/write isolation, missing
tenant, create/trim, replay, conflict, optimistic updates, original replay,
bounds, tenant-scoped idempotency, direct cross-tenant mutation and concurrent
replay / conflicting update.

Remaining: separately assess candidate-authored assertions, rollback/forward
rehearsal, full rubric, model identity and trusted producer provenance. No
claim of production RLS security, migration rollback or successful Tara agent
execution follows from this local reference suite.
