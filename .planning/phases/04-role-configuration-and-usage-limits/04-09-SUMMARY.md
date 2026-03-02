---
phase: 04-role-configuration-and-usage-limits
plan: 09
subsystem: auth, ui
tags: [password-policy, sessions, auth-middleware, force-password-change]

# Dependency graph
requires:
  - phase: 04-04
    provides: "Password policy service, force-password-change page, auth middleware forcePasswordChange guard"
  - phase: 04-05
    provides: "Session service with isCurrent flag, sessions tab in settings modal"
provides:
  - "Non-admin password policy read endpoint accessible to force-password-change users"
  - "Session lastUsedAt tracking on every authenticated request"
  - "Current session visual highlighting in sessions tab"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fire-and-forget session lastUsedAt update via non-awaited prisma call"
    - "Non-admin read-only endpoint for data needed by restricted users"

key-files:
  created:
    - "app/api/org/[slug]/password-policy/route.ts"
  modified:
    - "lib/auth-middleware.ts"
    - "app/org/[slug]/force-password-change/page.tsx"
    - "components/settings-modal.tsx"

key-decisions:
  - "Created separate non-admin /password-policy endpoint instead of whitelisting admin endpoint (non-admin users would still fail requireOrgAdmin)"
  - "Added /password-policy to forcePasswordChange exempt paths so force-change users can fetch policy"
  - "Session lastUsedAt updated in both requireOrgAuth and requireAuth for comprehensive coverage"
  - "validateSession now returns sessionId for downstream session tracking"

patterns-established:
  - "Non-admin read endpoints for data accessible to restricted/force-change users"

requirements-completed: [OPWD-01, OPWD-02, OPWD-04, USES-01, USES-02]

# Metrics
duration: 7min
completed: 2026-03-02
---

# Phase 4 Plan 09: Force-Password-Change Policy Fix & Session Tracking Summary

**Non-admin password policy endpoint for force-change users, session lastUsedAt tracking, and current session highlighting in sessions tab**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-02T10:43:55Z
- **Completed:** 2026-03-02T10:50:55Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Force-password-change page now fetches and displays full org password policy (all complexity requirements, not just defaults)
- Session lastUsedAt updated on every authenticated request via fire-and-forget update in auth middleware
- Current session visually highlighted with green border/background, shows "Active now", sorted first in list
- Current session cannot be revoked (badge shown instead of Revoke button, already implemented)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix force-password-change page policy fetch with non-admin endpoint and lastUsedAt tracking** - `13100d6` (fix)
2. **Task 2: Fix sessions tab: current session highlighting and revoke guard** - `b658af9` (fix)

## Files Created/Modified
- `app/api/org/[slug]/password-policy/route.ts` - New non-admin password policy read endpoint using requireOrgAuth
- `lib/auth-middleware.ts` - Added /password-policy to exempt paths, sessionId in AuthResult, lastUsedAt tracking in requireOrgAuth and requireAuth
- `app/org/[slug]/force-password-change/page.tsx` - Updated fetch URL from admin endpoint to non-admin endpoint
- `components/settings-modal.tsx` - Current session highlighting (green border/bg), "Active now" display, session sorting

## Decisions Made
- Created separate non-admin `/api/org/[slug]/password-policy` endpoint rather than whitelisting the admin endpoint, because the admin endpoint uses `requireOrgAdmin()` which would still fail for non-admin users
- Added `/password-policy` to the forcePasswordChange exempt paths so users with the force flag can access the endpoint
- Extended `validateSession` to return `sessionId` so downstream functions can perform session updates without extra DB queries
- Added `lastUsedAt` tracking in both `requireOrgAuth` and `requireAuth` for comprehensive session activity coverage

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All gap closure items for Phase 4 are now complete
- Force-password-change flow shows full org policy requirements
- Session tracking provides accurate last-active timestamps
- Sessions tab provides clear current session identification

---
*Phase: 04-role-configuration-and-usage-limits*
*Completed: 2026-03-02*
