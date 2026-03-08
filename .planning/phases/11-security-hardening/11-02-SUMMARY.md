---
phase: 11-security-hardening
plan: 02
subsystem: api
tags: [rate-limiting, origin-validation, security, csrf, api-protection]

# Dependency graph
requires:
  - phase: 11-01
    provides: "rate-limiter.ts and origin-validator.ts modules"
provides:
  - "All API routes protected by rate limiting (3 tiers: auth 5/15min, api 60/min, chat 10/min)"
  - "All mutation routes validate Origin header"
  - "DEBT-01 resolved (find-org rate limiting)"
affects: [security-hardening, testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "IP-based rate limiting for unauthenticated routes (auth tier)"
    - "User-based rate limiting for authenticated routes (api/chat tiers)"
    - "Origin validation before auth check on mutation handlers"
    - "Rate limiting after auth check on authenticated routes (needs user.id)"

key-files:
  created: []
  modified:
    - "app/api/auth/login/route.ts"
    - "app/api/auth/register/route.ts"
    - "app/api/auth/password-reset/route.ts"
    - "app/api/auth/password-reset/confirm/route.ts"
    - "app/api/auth/find-org/route.ts"
    - "app/api/chat/route.ts"
    - "app/api/conversations/route.ts"
    - "app/api/conversations/[id]/route.ts"
    - "app/api/conversations/[id]/messages/route.ts"
    - "app/api/artifacts/route.ts"
    - "app/api/messages/feedback/route.ts"
    - "app/api/mcp/connections/route.ts"
    - "app/api/user/preferences/route.ts"
    - "app/api/user/anthropic/route.ts"
    - "86+ additional route files across super-admin and org-admin paths"

key-decisions:
  - "Origin validation placed before auth check (fail fast, save DB lookups)"
  - "Rate limiting placed after auth check for user-keyed routes (needs user.id)"
  - "IP-based rate limiting for public/unauthenticated routes (auth, accept-invitation, validate-invitation, logout)"
  - "Systematic batch application to all 86+ route files via scripted approach"

patterns-established:
  - "Auth routes: IP-based rate limiting at top of handler, then origin validation, then body parsing"
  - "API routes: origin validation first (if mutation), then auth, then user-keyed rate limiting"
  - "GET handlers get rate limiting but skip origin validation (safe methods)"

requirements-completed: [SEC-01, SEC-02, SEC-06, DEBT-01]

# Metrics
duration: 10min
completed: 2026-03-08
---

# Phase 11 Plan 02: Rate Limiting & Origin Validation Wiring Summary

**Three-tier rate limiting (auth 5/15min, API 60/min, chat 10/min) and origin validation wired into all 86+ API route handlers**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-08T09:02:35Z
- **Completed:** 2026-03-08T09:12:33Z
- **Tasks:** 2
- **Files modified:** 100

## Accomplishments
- All 5 auth routes (login, register, password-reset, password-reset/confirm, find-org) have IP-based rate limiting with auth tier (5 req/15min)
- Chat route has user-based rate limiting with chat tier (10 req/min)
- All other API routes have user-based rate limiting with api tier (60 req/min)
- All mutation routes (POST/PUT/PATCH/DELETE) validate Origin header
- DEBT-01 resolved: find-org rate limiting TODO removed and replaced with implementation
- No TypeScript compilation errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Add rate limiting to auth routes and find-org** - `550f0bd` (feat)
2. **Task 2: Add rate limiting and origin validation to API routes** - `460f969` (feat)

## Files Created/Modified
- `app/api/auth/login/route.ts` - IP-based rate limiting + origin validation
- `app/api/auth/register/route.ts` - IP-based rate limiting + origin validation
- `app/api/auth/password-reset/route.ts` - IP-based rate limiting + origin validation (changed to NextRequest)
- `app/api/auth/password-reset/confirm/route.ts` - IP-based rate limiting + origin validation (changed to NextRequest)
- `app/api/auth/find-org/route.ts` - IP-based rate limiting + origin validation, removed DEBT-01 TODO
- `app/api/chat/route.ts` - User-based rate limiting (chat tier) + origin validation
- `app/api/conversations/route.ts` - User-based rate limiting on GET and POST, origin validation on POST
- `app/api/conversations/[id]/route.ts` - Rate limiting + origin validation on PATCH/DELETE
- `app/api/conversations/[id]/messages/route.ts` - Rate limiting + origin validation on POST/DELETE
- `app/api/artifacts/route.ts` - Rate limiting + origin validation on POST
- `app/api/messages/feedback/route.ts` - Rate limiting + origin validation on POST
- `app/api/mcp/connections/route.ts` - Rate limiting on GET, rate limiting + origin validation on POST
- `app/api/user/preferences/route.ts` - Rate limiting on GET, rate limiting + origin validation on PATCH
- `app/api/user/anthropic/route.ts` - Rate limiting on GET, rate limiting + origin validation on POST
- `app/api/super-admin/**/*.ts` - All super admin routes (25 files)
- `app/api/org/[slug]/admin/**/*.ts` - All org admin routes (35+ files)
- `app/api/org/[slug]/**/*.ts` - All org member routes (15+ files)
- Additional misc routes (files, enhance-prompt, user/settings, etc.)

## Decisions Made
- Origin validation is placed before auth check on mutation handlers to fail fast and avoid unnecessary database lookups for cross-origin requests
- Rate limiting is placed after auth check for user-keyed routes since user.id is needed for the rate limit key
- Public auth routes (accept-invitation, validate-invitation) use IP-based auth tier rate limiting
- Logout route uses IP-based api tier rate limiting since it does manual token extraction
- Impersonation route uses IP-based rate limiting for GET/DELETE since it does manual session checking

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Extended rate limiting beyond explicitly listed routes**
- **Found during:** Task 2
- **Issue:** Plan listed specific routes but noted "apply the same pattern to ALL mutation handlers under super-admin and org admin"
- **Fix:** Applied rate limiting and origin validation to all 86+ route files systematically, including routes not explicitly listed (user/settings, enhance-prompt, files, auth helper routes)
- **Files modified:** 86+ additional route files
- **Verification:** TypeScript compilation passes with zero errors

**2. [Rule 1 - Bug] Fixed script inserting code inside function parameter destructuring**
- **Found during:** Task 2
- **Issue:** Automated script incorrectly inserted origin validation/rate limiting code inside multi-line function parameter signatures (e.g., `{ params }: { params: ... }`)
- **Fix:** Restored 31 broken files from git and re-applied with corrected script that properly identifies function body opening brace vs parameter destructuring
- **Files modified:** 31 route files with multi-line signatures
- **Verification:** TypeScript compilation passes

---

**Total deviations:** 2 auto-fixed (1 missing critical, 1 bug)
**Impact on plan:** Both fixes necessary for correctness. Extended coverage is a security improvement.

## Issues Encountered
- Batch script approach was needed due to 86+ route files requiring identical patterns
- Multi-line function signatures with parameter destructuring required special handling

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All API routes now protected by rate limiting and origin validation
- Ready for Phase 11-03 (debug logging removal + type safety) and beyond
- Security hardening checklist items for rate limiting and CORS/origin are complete

---
*Phase: 11-security-hardening*
*Completed: 2026-03-08*
