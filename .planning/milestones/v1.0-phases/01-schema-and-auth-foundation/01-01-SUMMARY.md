---
phase: 01-schema-and-auth-foundation
plan: 01
subsystem: database
tags: [prisma, postgresql, multi-tenant, rbac, schema, seed, client-extensions]

# Dependency graph
requires: []
provides:
  - "17-model multi-tenant Prisma schema with RBAC (Organization, OrgMember, Role, etc.)"
  - "tenantPrisma(orgId) factory function for automatic org-scoped data isolation"
  - "TenantPrismaClient type alias for typed function parameters"
  - "Super Admin seed script with dev sample data (idempotent)"
  - "db:seed and db:reset npm scripts"
affects: [01-02, 01-03, 02-org-management, 03-prompt-system, 04-admin-panels, 05-chat-integration, 06-api-migration, 07-theming]

# Tech tracking
tech-stack:
  added: [prisma@7.4.1, "@prisma/client@7.4.1", "@prisma/adapter-pg@7.4.1"]
  patterns: [prisma-client-extensions-tenant-scoping, partial-unique-indexes, soft-delete-pattern]

key-files:
  created:
    - "lib/tenant.ts"
    - "prisma/seed.ts"
  modified:
    - "prisma/schema.prisma"
    - "lib/db.ts"
    - "package.json"
    - "package-lock.json"

key-decisions:
  - "Added dotenv/config import to seed.ts since standalone tsx execution does not auto-load .env"
  - "Kept User back-relations for Conversation, Artifact, McpConnection since FK relations require them in Prisma"
  - "Added User back-relations for AuditLog, UsageRecord, Invitation to satisfy Prisma relation requirements"

patterns-established:
  - "tenantPrisma(orgId): ALL org-scoped data access goes through tenant-scoped Prisma client"
  - "Raw prisma singleton: ONLY for User, Session, PasswordResetToken, Organization-level queries"
  - "Seed idempotency: check-before-create pattern for all seed data"
  - "Partial unique index: @@unique([slug], where: { deletedAt: null }) for soft-deleted orgs"

requirements-completed: [SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05, SCHEMA-06, AUTH-04, AUTH-05]

# Metrics
duration: 71min
completed: 2026-02-26
---

# Phase 1 Plan 01: Schema and Auth Foundation Summary

**17-model multi-tenant Prisma 7.4.1 schema with tenant-scoped Client Extension, partial unique indexes, and idempotent Super Admin seed script**

## Performance

- **Duration:** 71 min
- **Started:** 2026-02-26T12:30:45Z
- **Completed:** 2026-02-26T13:41:43Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments
- Complete schema rewrite from 7 single-user models to 17 multi-tenant models with RBAC
- Tenant-scoped Prisma Client Extension (`tenantPrisma(orgId)`) auto-injects organizationId into all org-scoped queries -- single enforcement point for data isolation
- Idempotent seed script creates Super Admin (env vars or interactive) + dev sample data (1 org, 3 roles, 2 users, 5 themes)
- Prisma upgraded to 7.4.1 with partialIndexes preview feature enabling partial unique index on Organization slug

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade Prisma and rewrite multi-tenant schema** - `4eacaef` (feat)
2. **Task 2: Create tenant-scoped Prisma Client Extension and update db.ts** - `0bc9490` (feat)
3. **Task 3: Create Super Admin seed script with dev sample data** - `11a6912` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Complete rewrite: 17 models with RBAC, org-scoping, soft delete, partial indexes
- `lib/tenant.ts` - Tenant-scoped Prisma Client Extension factory (tenantPrisma + TenantPrismaClient type)
- `lib/db.ts` - Added UNSCOPED usage warning comments
- `prisma/seed.ts` - Super Admin seed + dev sample data with idempotency
- `package.json` - Prisma 7.4.1 upgrade, db:reset and db:seed scripts
- `package-lock.json` - Dependency lock file updates

## Decisions Made
- Added `dotenv/config` import to seed.ts because standalone `npx tsx` execution does not auto-load .env files (prisma.config.ts handles this for Prisma CLI commands, but seed runs via tsx directly)
- Kept User back-relations for Conversation, Artifact, McpConnection even though plan said to remove them -- Prisma requires back-relations when FK relations exist on the child models
- Added User back-relations for AuditLog, UsageRecord, and Invitation (InvitedByUser named relation) to satisfy Prisma's bidirectional relation requirements

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added dotenv/config import to seed.ts**
- **Found during:** Task 3 (Seed script creation)
- **Issue:** Seed script failed with "SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string" because DATABASE_URL was not loaded from .env
- **Fix:** Added `import 'dotenv/config'` at top of seed.ts
- **Files modified:** prisma/seed.ts
- **Verification:** Seed runs successfully with correct database connection
- **Committed in:** 11a6912 (Task 3 commit)

**2. [Rule 3 - Blocking] Restored User back-relations for data models**
- **Found during:** Task 1 (Schema rewrite)
- **Issue:** Plan said to remove conversations, artifacts, mcpConnections relations from User, but Prisma requires back-relations when child models have FK references to User
- **Fix:** Kept all necessary back-relations on User model (conversations, artifacts, mcpConnections, auditLogs, usageRecords, invitationsSent)
- **Files modified:** prisma/schema.prisma
- **Verification:** `npx prisma db push` and `npx prisma generate` succeed without errors
- **Committed in:** 4eacaef (Task 1 commit)

**3. [Rule 3 - Blocking] Added Invitation back-relation on Role model**
- **Found during:** Task 1 (Schema rewrite)
- **Issue:** Invitation model has `role Role @relation(...)` but Role had no `invitations Invitation[]` back-relation
- **Fix:** Added `invitations Invitation[]` to Role model
- **Files modified:** prisma/schema.prisma
- **Verification:** `npx prisma db push` succeeds
- **Committed in:** 4eacaef (Task 1 commit)

**4. [Rule 3 - Blocking] Fixed .env DATABASE_URL to point to RDS**
- **Found during:** Task 3 (Seed script verification)
- **Issue:** .env file had RDS URL commented out and localhost URL active, causing connection failures
- **Fix:** Uncommented RDS URL and commented out localhost URL per user instruction
- **Files modified:** .env (not committed -- gitignored)
- **Verification:** Seed script connects and runs successfully

---

**Total deviations:** 4 auto-fixed (4 blocking issues)
**Impact on plan:** All auto-fixes were necessary for correctness. Prisma's bidirectional relation requirement and dotenv loading are standard patterns. No scope creep.

## Issues Encountered
- Prisma's AI safety gate required explicit user consent for `db push --force-reset` with environment variable -- resolved with user approval
- .env file had DATABASE_URL pointing to localhost instead of RDS -- corrected per user instructions

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Database schema fully deployed with all 17 models
- tenantPrisma(orgId) ready for use in auth middleware (Plan 01-02) and API route migration (Plan 01-03)
- Super Admin and dev sample data seeded for testing
- Ready for Plan 01-02: Auth middleware enrichment (requireOrgAuth, requireSuperAdmin)

---
## Self-Check: PASSED

- All 5 key files found on disk
- All 3 task commits verified in git log
- 17 generated Prisma model files confirmed

---
*Phase: 01-schema-and-auth-foundation*
*Completed: 2026-02-26*
