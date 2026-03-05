---
phase: 07-theming-branding-and-compliance
plan: 01
subsystem: database, api
tags: [prisma, themes, cleanup, cron, api-routes]

requires:
  - phase: 01-schema-and-auth-foundation
    provides: Prisma schema, OrgSettings, Session models
  - phase: 02-org-management
    provides: Organization CRUD, audit-service pattern
provides:
  - Extended OrgSettings with theme, login customization, and onboarding fields
  - Session impersonation fields for Phase 7 impersonation feature
  - Theme service with CRUD, fallback chain, and audit logging
  - Cleanup service with org purge, invitation cleanup, session cleanup
  - Super Admin theme assignment API (GET/PUT)
  - Org Admin theme selection API (GET/PUT)
  - User-facing theme fetch API (GET)
  - Cron cleanup route with CRON_SECRET auth
affects: [07-02, 07-03, 07-04, 07-05, 07-06, 07-07]

tech-stack:
  added: []
  patterns:
    - "CRON_SECRET bearer auth for scheduled cleanup routes"
    - "Theme fallback chain: activeTheme -> default assignment -> null (platform default)"

key-files:
  created:
    - lib/services/theme-service.ts
    - lib/services/cleanup-service.ts
    - app/api/super-admin/organizations/[id]/themes/route.ts
    - app/api/org/[slug]/admin/themes/route.ts
    - app/api/org/[slug]/theme/route.ts
    - app/api/cron/cleanup/route.ts
  modified:
    - prisma/schema.prisma

key-decisions:
  - "Cleanup service uses per-org transactions for isolation during purge"
  - "Cron cleanup route uses CRON_SECRET bearer token (not session-based auth)"
  - "Platform-level audit log entry for cleanup operations uses userId=null (system action)"

patterns-established:
  - "Theme fallback chain: active -> default -> null for graceful degradation"
  - "Secret-based auth pattern for cron/webhook routes"

requirements-completed: [SORG-08, SORG-09, OTHM-05, OTHM-06, OTHM-07, CRON-01, CRON-02, CRON-03]

duration: 4min
completed: 2026-03-05
---

# Phase 7 Plan 01: Schema Foundation + Theme Service + Cleanup Service Summary

**Extended Prisma schema with theme/onboarding/impersonation fields, theme service with fallback chain, cleanup service for scheduled purging, and 4 API routes for theme management and cron cleanup**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-05T09:32:47Z
- **Completed:** 2026-03-05T09:36:55Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Extended OrgSettings with activeTheme, loginTagline, loginWelcomeMessage, onboardingText, onboardingVersion
- Extended Session with impersonatorId, impersonationReason, impersonationExpiresAt for future impersonation
- Theme service with full CRUD, fallback chain (active -> default -> null), and audit logging
- Cleanup service with org purge (30-day grace), invitation cleanup, session cleanup
- 4 API routes: Super Admin theme assignment, Org Admin theme selection, user theme fetch, cron cleanup

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema extensions + theme service + cleanup service** - `1a96a4d` (feat)
2. **Task 2: Theme API routes + cron cleanup route** - `c9db579` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added OrgSettings theme/onboarding fields and Session impersonation fields
- `lib/services/theme-service.ts` - Theme CRUD with fallback chain and audit logging
- `lib/services/cleanup-service.ts` - Scheduled cleanup for orgs, invitations, sessions
- `app/api/super-admin/organizations/[id]/themes/route.ts` - Super Admin theme assignment (GET/PUT)
- `app/api/org/[slug]/admin/themes/route.ts` - Org Admin theme selection (GET/PUT)
- `app/api/org/[slug]/theme/route.ts` - User-facing theme fetch (GET)
- `app/api/cron/cleanup/route.ts` - Cron cleanup with CRON_SECRET bearer auth

## Decisions Made
- Cleanup service uses per-org transactions for isolation during purge (prevents partial deletes)
- Cron cleanup route uses CRON_SECRET env var bearer token (not session-based auth) for Vercel cron compatibility
- Platform-level audit log entries for cleanup operations use userId=null (system actions)
- Prisma client regeneration required after schema changes (Rule 3 auto-fix)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
- Add `CRON_SECRET` environment variable for cron cleanup route authentication
- In production, configure vercel.json cron schedule for `/api/cron/cleanup`

## Next Phase Readiness
- Schema foundation complete for all Phase 7 plans
- Theme service ready for frontend integration in subsequent plans
- Cleanup service ready for production cron scheduling

## Self-Check: PASSED

All 6 created files verified present. Both task commits (`1a96a4d`, `c9db579`) verified in git log. TypeScript compilation clean (no new errors introduced).

---
*Phase: 07-theming-branding-and-compliance*
*Completed: 2026-03-05*
