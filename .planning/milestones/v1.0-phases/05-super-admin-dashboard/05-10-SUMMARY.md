---
phase: 05-super-admin-dashboard
plan: 10
subsystem: api
tags: [prisma, super-admin, delete, fk-constraint, bug-fix]

# Dependency graph
requires:
  - phase: 05-super-admin-dashboard
    provides: Super Admin CRUD service and API routes
provides:
  - Working DELETE /api/super-admin/super-admins/:id endpoint
  - FK-safe Super Admin deletion with audit trail preservation
affects: [05-super-admin-dashboard]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "FK cleanup pattern: nullify audit logs + reassign invitations before user delete"

key-files:
  created: []
  modified:
    - lib/services/super-admin-service.ts
    - app/api/super-admin/super-admins/[id]/route.ts

key-decisions:
  - "Reassign invitations to actor (deleting SA) rather than deleting them -- preserves invitation history"
  - "Nullify AuditLog.userId for deleted users -- audit trail preserved with null indicating deleted user"
  - "Added P2003 Prisma error handler as safety net in DELETE route (409 instead of 500)"

patterns-established:
  - "FK cleanup before user deletion: handle all non-cascading relations in transaction"

requirements-completed: [SUI-01, SUI-02, SUI-03]

# Metrics
duration: 1min
completed: 2026-03-05
---

# Phase 5 Plan 10: Fix Super Admin Delete 500 Error Summary

**Fixed FK constraint violation in Super Admin delete by handling Invitation.invitedBy (no onDelete cascade) and AuditLog references before user deletion**

## Performance

- **Duration:** 1 min
- **Started:** 2026-03-05T01:37:02Z
- **Completed:** 2026-03-05T01:38:11Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Fixed DELETE /api/super-admin/super-admins/:id returning 500 Internal Server Error
- Root cause: Invitation.invitedBy relation has no onDelete cascade -- Prisma throws P2003 FK constraint error
- Added nullification of AuditLog.userId and reassignment of Invitation.invitedById within the transaction
- Added Prisma P2003 error handler in route as safety net (returns 409 instead of 500)

## Task Commits

Each task was committed atomically:

1. **Task 1: Debug and fix Super Admin delete 500 error** - `9271621` (fix)

**Plan metadata:** [pending] (docs: complete plan)

## Files Created/Modified
- `lib/services/super-admin-service.ts` - Added FK cleanup (audit logs, invitations) before user.delete() in transaction
- `app/api/super-admin/super-admins/[id]/route.ts` - Added Prisma P2003 error handler for 409 response

## Decisions Made
- Reassign invitations to the actor (SA performing the delete) rather than deleting them, preserving invitation history
- Nullify AuditLog.userId for deleted users to preserve immutable audit trail (SAFE-07)
- Added P2003 Prisma constraint error handler as a defensive safety net in the DELETE route

## Deviations from Plan

None - plan executed exactly as written. The diagnosis in the plan correctly identified FK constraint violation as the most likely cause.

## Issues Encountered
None - the root cause matched the plan's diagnosis (Invitation.invitedBy has no onDelete cascade).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Super Admin delete endpoint fully functional
- All safety guards (SAFE-01 self-delete, SAFE-06 last SA) remain enforced
- Ready for remaining Phase 5 plans

---
*Phase: 05-super-admin-dashboard*
*Completed: 2026-03-05*
