---
phase: 04-role-configuration-and-usage-limits
plan: 08
subsystem: auth
tags: [login, org-session, force-password-change, usage-limits, chat-input]

# Dependency graph
requires:
  - phase: 01-schema-and-auth-foundation
    provides: "Login route, session creation, resolveOrgSlug"
  - phase: 04-role-configuration-and-usage-limits
    provides: "Password policy service, force-password-change page, usage enforcement"
provides:
  - "Org login passes slug to login route for correct session organizationId"
  - "403 FORCE_PASSWORD_CHANGE interceptor in chat page redirects users to force-password-change"
  - "Chat input disabled state wired to usageBlocked for daily limit enforcement"
affects: [03-chat-integration-and-core-rbac, 04-role-configuration-and-usage-limits]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Module-level checkForcePasswordChange helper for 403 response interception"
    - "body.slug fallback in login route for org login page without URL-based slug"

key-files:
  created: []
  modified:
    - "components/org-login-page.tsx"
    - "app/api/auth/login/route.ts"
    - "components/full-chat-app.tsx"

key-decisions:
  - "Used body.slug fallback (not new route) to minimize code changes and match existing login route structure"
  - "Module-level checkForcePasswordChange helper (not component callback) for reuse across FullChatApp and ChatContent"
  - "FORCE_PASSWORD_CHANGE intercepted on fetchModels, fetchConversations, and conversation loading -- covers mount and navigation"

patterns-established:
  - "body.slug fallback pattern: resolveOrgSlug(req) || body.slug || null for login routes"
  - "403 FORCE_PASSWORD_CHANGE global interceptor pattern for protected pages"

requirements-completed: [OPWD-04, OPWD-05, USES-01, USES-02]

# Metrics
duration: 5min
completed: 2026-03-02
---

# Phase 4 Plan 08: Org Login Slug Fix & Force-Password-Change Redirect Summary

**Org login now passes slug for correct session organizationId, 403 FORCE_PASSWORD_CHANGE interceptor redirects from chat to force-password-change page, and chat input disables on usage block**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-02T10:43:53Z
- **Completed:** 2026-03-02T10:48:33Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Org login page now includes slug in POST body so sessions carry correct organizationId
- Login route uses body.slug fallback when resolveOrgSlug returns null (fixes BLOCKER)
- forcePasswordChange detection at login now works because organizationId is no longer null
- Chat page intercepts 403 FORCE_PASSWORD_CHANGE on mount fetches and conversation loading
- Chat input visually disabled with "Daily usage limit reached" placeholder when usageBlocked is true

## Task Commits

Each task was committed atomically:

1. **Task 1: Pass org slug in login request body and resolve in login route** - `0026144` (fix)
2. **Task 2: Add 403 FORCE_PASSWORD_CHANGE interceptor in chat app** - `32a78d6` (feat)

## Files Created/Modified
- `components/org-login-page.tsx` - Added slug: org.slug to login POST body
- `app/api/auth/login/route.ts` - Added body.slug fallback for resolveOrgSlug
- `components/full-chat-app.tsx` - Added checkForcePasswordChange interceptor, wired disabled/disabledPlaceholder to ClaudeChatInput

## Decisions Made
- Used body.slug fallback (not new route) to minimize code changes and match existing login route structure
- Module-level checkForcePasswordChange helper (not component callback) for reuse across FullChatApp and ChatContent
- FORCE_PASSWORD_CHANGE intercepted on fetchModels, fetchConversations, and conversation loading -- covers mount and navigation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Org login sessions now carry correct organizationId for all downstream features
- Force-password-change flow complete end-to-end (login detection + chat redirect)
- Usage limit enforcement visible to users via disabled chat input

## Self-Check: PASSED

- All 3 modified files verified on disk
- Commit 0026144 (Task 1) verified in git log
- Commit 32a78d6 (Task 2) verified in git log

---
*Phase: 04-role-configuration-and-usage-limits*
*Completed: 2026-03-02*
