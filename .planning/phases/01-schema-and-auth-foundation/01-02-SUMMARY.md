---
phase: 01-schema-and-auth-foundation
plan: 02
subsystem: auth
tags: [multi-tenant, rbac, auth-middleware, org-scoping, tenant-isolation, prisma-client-extensions]

# Dependency graph
requires:
  - "01-01: 17-model multi-tenant Prisma schema with tenantPrisma(orgId) factory"
provides:
  - "requireOrgAuth(req) middleware returning enriched OrgAuthContext (user + org + role + permissions + tenantDb)"
  - "requireSuperAdmin(req) middleware for platform-level routes"
  - "requireOrgAdmin(req) convenience wrapper for org admin routes"
  - "resolveOrgSlug(req) for URL-based org context resolution (path in dev, subdomain in prod)"
  - "ensureMinimumSuperAdmins() safety check for Super Admin deletion"
  - "All 19 API routes migrated to multi-tenant auth pattern with tenantDb data isolation"
  - "auth/register disabled (invite-only for Phase 2)"
  - "auth/me enriched with org context and role info"
  - "lib/storage.ts documented as unscoped-only with all tenant functions @deprecated"
affects: [01-03, 02-org-management, 03-prompt-system, 04-admin-panels, 05-chat-integration, 06-api-migration]

# Tech tracking
tech-stack:
  added: []
  patterns: [requireOrgAuth-tenantDb-pattern, org-slug-resolution, super-admin-isolation, deprecated-storage-functions]

key-files:
  created:
    - "lib/resolve-org.ts"
  modified:
    - "lib/auth-middleware.ts"
    - "lib/storage.ts"
    - "app/api/auth/login/route.ts"
    - "app/api/auth/register/route.ts"
    - "app/api/auth/me/route.ts"
    - "app/api/chat/route.ts"
    - "app/api/conversations/route.ts"
    - "app/api/conversations/[id]/route.ts"
    - "app/api/conversations/[id]/title/route.ts"
    - "app/api/conversations/[id]/messages/route.ts"
    - "app/api/artifacts/route.ts"
    - "app/api/artifacts/[id]/route.ts"
    - "app/api/mcp/connections/route.ts"
    - "app/api/mcp/connections/[id]/route.ts"
    - "app/api/mcp/connections/[id]/discover/route.ts"
    - "app/api/mcp/connections/[id]/test/route.ts"
    - "app/api/messages/feedback/route.ts"
    - "app/api/user/settings/route.ts"
    - "app/api/user/anthropic/route.ts"
    - "app/api/user/anthropic/test/route.ts"
    - "app/api/files/[fileId]/route.ts"
    - "app/api/files/[fileId]/download/route.ts"

key-decisions:
  - "Migrated user/anthropic API key routes from User.anthropicApiKeyEncrypted (removed in schema rewrite) to PlatformApiKey model via tenantDb"
  - "user/settings uses avatarBase64 field (matching new schema) instead of old avatarUrl"
  - "Kept storage.ts functions with @deprecated annotations rather than deleting them to avoid breaking any remaining imports"
  - "auth/me uses requireAuth (not requireOrgAuth) so it works for both Super Admins and org users"

patterns-established:
  - "requireOrgAuth + tenantDb: ALL org-scoped API routes destructure { user, tenantDb } from requireOrgAuth() and use tenantDb for all data access"
  - "Auth-only routes (me, logout, change-password) use requireAuth; org-scoped routes use requireOrgAuth"
  - "resolveOrgSlug: path-based in dev (/org/:slug/...), subdomain-based in prod ({slug}.llmatscale.ai)"
  - "Super Admin isolation: requireOrgAuth returns 403 for Super Admins accessing org routes (AUTH-06)"
  - "Route handlers own authorization: no proxy/middleware auth, all checks at handler level (AUTH-07)"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-06, AUTH-07, SAFE-03, SAFE-06, ROUTE-04, ROUTE-05]

# Metrics
duration: 11min
completed: 2026-02-26
---

# Phase 1 Plan 02: Auth Middleware and API Route Migration Summary

**Enriched auth middleware (requireOrgAuth/requireSuperAdmin) with tenant-scoped data isolation across all 19 API routes via tenantPrisma Client Extensions**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-26T13:45:45Z
- **Completed:** 2026-02-26T13:56:46Z
- **Tasks:** 2
- **Files modified:** 23

## Accomplishments
- Built enriched auth middleware with requireOrgAuth() that validates session + org membership + role and returns pre-built tenant-scoped Prisma client in a single flow
- Created org context resolver (resolveOrgSlug) supporting dual-mode routing: path-based in dev, subdomain-based in prod
- Migrated all 19 org-scoped API routes from old requireAuth + global prisma to requireOrgAuth + tenantDb pattern, guaranteeing data isolation between organizations
- Disabled direct registration (invite-only for Phase 2) and enriched auth/me with org context

## Task Commits

Each task was committed atomically:

1. **Task 1: Create org context resolver and enriched auth middleware** - `1da2ba0` (feat)
2. **Task 2: Migrate all API routes to multi-tenant auth pattern** - `161ec20` (feat)

## Files Created/Modified
- `lib/resolve-org.ts` - New: resolveOrgSlug() and isSuperAdminContext() for URL-based org context resolution
- `lib/auth-middleware.ts` - Extended: OrgAuthContext, SuperAdminContext types; requireOrgAuth(), requireSuperAdmin(), requireOrgAdmin(), ensureMinimumSuperAdmins()
- `lib/storage.ts` - Documented as unscoped-only; all tenant-scoped functions marked @deprecated
- `app/api/auth/login/route.ts` - Stores organizationId, userAgent, ipAddress in session; returns org context
- `app/api/auth/register/route.ts` - Disabled: returns 403 "invite-only"
- `app/api/auth/me/route.ts` - Enriched with org name, slug, role info when org context available
- `app/api/chat/route.ts` - Uses requireOrgAuth + tenantDb for message persistence
- `app/api/conversations/route.ts` - Uses requireOrgAuth + tenantDb for list/create
- `app/api/conversations/[id]/route.ts` - Uses requireOrgAuth + tenantDb for get/update/delete
- `app/api/conversations/[id]/title/route.ts` - Uses requireOrgAuth + tenantDb for title generation
- `app/api/conversations/[id]/messages/route.ts` - Uses requireOrgAuth + tenantDb for message CRUD
- `app/api/artifacts/route.ts` - Uses requireOrgAuth + tenantDb
- `app/api/artifacts/[id]/route.ts` - Uses requireOrgAuth + tenantDb
- `app/api/mcp/connections/route.ts` - Uses requireOrgAuth + tenantDb
- `app/api/mcp/connections/[id]/route.ts` - Uses requireOrgAuth + tenantDb
- `app/api/mcp/connections/[id]/discover/route.ts` - Uses requireOrgAuth + tenantDb
- `app/api/mcp/connections/[id]/test/route.ts` - Uses requireOrgAuth + tenantDb
- `app/api/messages/feedback/route.ts` - Uses requireOrgAuth + tenantDb
- `app/api/user/settings/route.ts` - Uses requireOrgAuth; updated to use avatarBase64
- `app/api/user/anthropic/route.ts` - Uses requireOrgAuth + tenantDb; migrated to PlatformApiKey model
- `app/api/user/anthropic/test/route.ts` - Uses requireOrgAuth
- `app/api/files/[fileId]/route.ts` - Uses requireOrgAuth
- `app/api/files/[fileId]/download/route.ts` - Uses requireOrgAuth

## Decisions Made
- **Migrated API key storage:** User.anthropicApiKeyEncrypted field was removed in the schema rewrite (Plan 01). Migrated user/anthropic routes to use PlatformApiKey model (org-scoped) via tenantDb instead.
- **Fixed avatarUrl references:** Schema now uses avatarBase64 instead of old avatarUrl. Updated user/settings route to use the correct field name.
- **Kept storage.ts functions:** Added @deprecated JSDoc annotations rather than deleting functions, to avoid breaking any imports during migration. Functions remain functional but clearly marked for tenantDb replacement.
- **auth/me uses requireAuth:** This endpoint must work for both Super Admins (no org context) and org users, so it uses the basic requireAuth and optionally enriches with org info.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed references to removed User model fields**
- **Found during:** Task 2 (API route migration)
- **Issue:** auth/me referenced user.avatarUrl, user.anthropicApiKeyEncrypted, and user.emailVerified which no longer exist in the rewritten schema (Plan 01 changed to avatarBase64, removed anthropicApiKeyEncrypted from User, removed emailVerified)
- **Fix:** Updated auth/me to use avatarBase64; migrated user/anthropic to use PlatformApiKey model; removed emailVerified reference
- **Files modified:** app/api/auth/me/route.ts, app/api/user/anthropic/route.ts, app/api/user/settings/route.ts
- **Verification:** No lint errors; field references match schema
- **Committed in:** 161ec20 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Auto-fix was necessary to align code with the schema rewritten in Plan 01. No scope creep.

## Issues Encountered
None -- all migrations were straightforward.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All API routes enforcing multi-tenant auth with data isolation
- requireOrgAuth/requireSuperAdmin patterns ready for new routes in Plan 01-03 (proxy.ts, org-scoped pages)
- Tenant-scoped data access pattern established and verified
- Ready for Plan 01-03: Routing and Frontend Integration

---
## Self-Check: PASSED

- All 23 key files found on disk
- Both task commits (1da2ba0, 161ec20) verified in git log

---
*Phase: 01-schema-and-auth-foundation*
*Completed: 2026-02-26*
