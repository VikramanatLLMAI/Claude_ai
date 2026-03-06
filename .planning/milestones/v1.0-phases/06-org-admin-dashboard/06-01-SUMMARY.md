---
phase: 06-org-admin-dashboard
plan: 01
subsystem: api
tags: [prisma, org-admin, user-management, sidebar, audit-log]

requires:
  - phase: 03-chat-integration-and-core-rbac
    provides: "Auth middleware (requireOrgAdmin), audit service, admin sidebar component"
  - phase: 04-role-configuration-and-usage-limits
    provides: "Session service (forceLogoutUser), force-logout endpoint"
provides:
  - "Org user management service (list, suspend, activate, delete, changeRole, promote, updateName)"
  - "GET /api/org/[slug]/admin/users with search/role/status filters"
  - "PATCH/DELETE /api/org/[slug]/admin/users/[userId] for user mutations"
  - "Updated org admin sidebar with all Phase 6 navigation items enabled"
affects: [06-org-admin-dashboard]

tech-stack:
  added: []
  patterns:
    - "Discriminated union Zod schema for action-based PATCH dispatch"
    - "Status filter with 30-day inactivity threshold (active/inactive/suspended)"

key-files:
  created:
    - lib/services/org-user-service.ts
    - app/api/org/[slug]/admin/users/route.ts
    - app/api/org/[slug]/admin/users/[userId]/route.ts
  modified:
    - components/admin/admin-sidebar.tsx

key-decisions:
  - "Used raw prisma (not tenantDb) for org-user-service since OrgMember joins User which is not org-scoped"
  - "Inactive status defined as lastActiveAt older than 30 days; null lastActiveAt treated as active (new member)"
  - "Discriminated union Zod schema for PATCH action dispatch instead of separate endpoints"

patterns-established:
  - "Safety guards pattern: SAFE-01 (no self-action) and SAFE-02 (admin count check) reusable across user operations"

requirements-completed: [OUI-01, OUSR-02, OUSR-03, OUSR-04, OUSR-05, OUSR-06, OUSR-07, OUSR-08, OUSR-10, OUSR-11, OUSR-12]

duration: 3min
completed: 2026-03-05
---

# Phase 6 Plan 01: Org User Management Service & Sidebar Summary

**Org user CRUD service with 7 functions (list/suspend/activate/delete/changeRole/promote/updateName), two API route files, and sidebar updated with all Phase 6 nav items**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-05T04:11:59Z
- **Completed:** 2026-03-05T04:15:10Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Complete org user management service with SAFE-01/SAFE-02 safety guards across all destructive operations
- GET endpoint with search/role/status filters (including 30-day inactivity detection) plus optional roles dropdown data
- PATCH endpoint with Zod discriminated union for 5 action types, DELETE endpoint for member removal
- Org admin sidebar updated: Members/Invitations enabled, Usage replaced by Analytics, Audit Logs and Settings groups added

## Task Commits

Each task was committed atomically:

1. **Task 1: Org user management service and API endpoints** - `322ddaf` (feat)
2. **Task 2: Update org admin sidebar navigation** - `043bb80` (feat)

## Files Created/Modified
- `lib/services/org-user-service.ts` - 7 service functions with safety guards and audit logging
- `app/api/org/[slug]/admin/users/route.ts` - GET endpoint with search/role/status filters
- `app/api/org/[slug]/admin/users/[userId]/route.ts` - PATCH (action dispatch) and DELETE endpoints
- `components/admin/admin-sidebar.tsx` - All 5 nav groups with all items enabled

## Decisions Made
- Used raw prisma (not tenantDb) for org-user-service since OrgMember joins User which is not org-scoped
- Inactive status defined as lastActiveAt older than 30 days; null lastActiveAt treated as active (new member)
- Discriminated union Zod schema for PATCH action dispatch instead of separate endpoints per action

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Backend user management fully operational, ready for frontend Members page (Plan 02+)
- Sidebar navigation unblocks all Phase 6 pages (Members, Invitations, Analytics, Audit Logs, Settings)

---
*Phase: 06-org-admin-dashboard*
*Completed: 2026-03-05*
