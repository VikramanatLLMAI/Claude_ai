---
phase: 04-role-configuration-and-usage-limits
plan: 10
subsystem: auth
tags: [auth, middleware, session, prisma, usage-limits, react]

# Dependency graph
requires:
  - phase: 04-role-configuration-and-usage-limits
    provides: requireOrgAuth, UsageBanner, session.organizationId, usage-status endpoint
provides:
  - requireOrgAuth session-based org fallback for flat /api/* paths
  - UsageBanner unconditional mount with CSS-only welcome-screen suppression
affects:
  - flat API paths (conversations, chat, mcp/connections) for org users
  - usage limit enforcement correctness for all org users

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dual-path org resolution: slug-from-URL (existing) + organizationId-from-session (new fallback)"
    - "CSS hidden class for visual suppression without unmounting React component"

key-files:
  created: []
  modified:
    - lib/auth-middleware.ts
    - components/full-chat-app.tsx

key-decisions:
  - "Session-based org fallback in requireOrgAuth: fetch session.organizationId when resolveOrgSlug returns null — fixes flat API path 400 errors for org users"
  - "UsageBanner always mounted when orgSlug set; CSS hidden class suppresses visual output on welcome screen — ensures onBlockedChange fires on first poll regardless of welcome-screen state"
  - "resolvedSlug = slug ?? orgMember.organization.slug for forcePasswordChange redirect — handles both URL-slug and session-based paths"

patterns-established:
  - "requireOrgAuth: auth.sessionId available from validateSession for downstream session DB lookups"
  - "React component visibility: prefer CSS hidden over conditional mounting when polling/callbacks must fire"

requirements-completed:
  - OROL-01
  - OROL-02
  - OROL-03
  - OROL-04
  - OROL-05
  - OROL-06
  - OROL-07
  - OUSE-01
  - OUSE-02
  - OUSE-03
  - OUSE-04
  - OUSE-05
  - OALT-01
  - OALT-02
  - OALT-03
  - UCHAT-03
  - UCHAT-04
  - SAFE-10
  - SAFE-11
  - OPWD-01
  - OPWD-02
  - OPWD-03
  - OPWD-04
  - OPWD-05
  - OPWD-06
  - USES-01
  - USES-02
  - UPRF-01
  - UPRF-02
  - UPRF-03
  - UPRF-04

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 4 Plan 10: Org Auth Session Fallback and UsageBanner Mount Fix Summary

**Session-based org lookup fallback in requireOrgAuth and unconditional UsageBanner mounting — fixes 400 errors on flat API paths and ensures usage limit enforcement works on welcome screen**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-03T07:33:21Z
- **Completed:** 2026-03-03T07:35:31Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Fixed flat API path 400 errors for org users by adding session.organizationId fallback to requireOrgAuth
- Fixed UsageBanner never firing onBlockedChange when user lands on welcome screen (no conversations loaded)
- forcePasswordChange redirect now works for both URL-slug and session-based org resolution paths
- GET /api/conversations, POST /api/chat, GET /api/mcp/connections now return 200 for org users on flat paths

## Task Commits

Each task was committed atomically:

1. **Task 1: Add session-based org fallback to requireOrgAuth** - `93d8ce7` (fix)
2. **Task 2: Mount UsageBanner unconditionally, hide wrapper visually on welcome screen** - `9cabfb3` (fix)

## Files Created/Modified
- `lib/auth-middleware.ts` - Added dual-path org resolution: Path A (URL slug, unchanged) + Path B (session.organizationId fallback for flat /api/* paths); forcePasswordChange redirect uses resolvedSlug fallback
- `components/full-chat-app.tsx` - Removed !isWelcomeVisible gate from UsageBanner mount; added CSS hidden class to wrapper div instead

## Decisions Made
- Session-based org fallback fetches only `organizationId` field from session (minimal select) via `prisma.session.findUnique` — avoids loading full session record
- `resolvedSlug = slug ?? orgMember.organization.slug` for forcePasswordChange redirect — deriving from already-loaded orgMember, no extra query needed
- CSS `hidden` class on wrapper div (not conditional React mount) preserves component lifecycle — polling starts immediately on mount, `onBlockedChange` fires on first poll regardless of screen state

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

Pre-existing TypeScript errors in `tenantDb` usage across other files (app/api/artifacts, app/api/chat, etc.) — these are out of scope for this plan. Both modified files (`lib/auth-middleware.ts`, `components/full-chat-app.tsx`) compile clean with zero errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Org user chat flows fully functional: conversations load, chat works, MCP connections accessible
- Usage limit enforcement now fully operational: UsageBanner polls from mount, usageBlocked fires correctly
- All Phase 4 requirements met including UCHAT-03, UCHAT-04, OUSE-02, OUSE-03, SAFE-10 for usage enforcement

---
*Phase: 04-role-configuration-and-usage-limits*
*Completed: 2026-03-03*

## Self-Check: PASSED

- lib/auth-middleware.ts: FOUND
- components/full-chat-app.tsx: FOUND
- .planning/phases/04-role-configuration-and-usage-limits/04-10-SUMMARY.md: FOUND
- Commit 93d8ce7 (Task 1): FOUND
- Commit 9cabfb3 (Task 2): FOUND
