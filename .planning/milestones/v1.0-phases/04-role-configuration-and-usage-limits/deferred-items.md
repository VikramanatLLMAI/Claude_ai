# Deferred Items - Phase 04

## Pre-existing TypeScript Errors (Out of Scope)

### tenantDb.artifact type error in artifacts route

**File:** `app/api/artifacts/[id]/route.ts` (line 15)

**Error:** `'tenantDb.artifact' is of type 'unknown'`

**Discovered during:** Plan 04-13 build verification

**Nature:** Pre-existing - confirmed exists on the `master` branch before any 04-13 changes via `git stash` + build test.

**Impact:** Prevents `npm run build` from passing TypeScript checks. Does NOT affect runtime behavior (Turbopack compilation succeeds).

**Root cause:** `tenantDb` returned from `requireOrgAuth` likely has a dynamic Prisma Client Extension type that TypeScript cannot narrow for `artifact` (not in TENANT_SCOPED_MODELS). The Artifact model may not be included in the tenant-scoped client.

**Suggested fix:** Either use raw `prisma` client for artifact routes (Artifact is user-scoped, not org-scoped) or add Artifact to the tenant client type definitions.
