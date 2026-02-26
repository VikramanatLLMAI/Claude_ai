---
phase: 01-schema-and-auth-foundation
plan: 03
subsystem: routing
tags: [next.js, proxy, subdomain, multi-tenant, routing, org-login, find-my-org]

# Dependency graph
requires:
  - "01-01: 17-model multi-tenant Prisma schema with Organization model (slug, logoDisplayMode)"
provides:
  - "proxy.ts for subdomain-to-path rewriting in production (admin.llmatscale.ai -> /admin/*, {slug}.llmatscale.ai -> /org/{slug}/*)"
  - "Org-scoped page structure under /org/[slug]/ (chat, login, admin)"
  - "Super Admin pages under /admin/ (dashboard placeholder, login)"
  - "Find My Org email-first org lookup flow on bare domain"
  - "Org-branded login component with PLATFORM_AND_ORG and ORG_ONLY logo modes"
  - "Global 404 page for unknown subdomains (no info leakage)"
  - "POST /api/auth/find-org endpoint with constant-time response"
affects: [02-org-management, 05-super-admin-dashboard, 06-org-admin-dashboard, 07-theming]

# Tech tracking
tech-stack:
  added: []
  patterns: [proxy-ts-subdomain-rewriting, org-scoped-page-routing, email-first-org-finder, constant-time-api-response]

key-files:
  created:
    - "proxy.ts"
    - "app/org/[slug]/layout.tsx"
    - "app/org/[slug]/chat/page.tsx"
    - "app/org/[slug]/admin/page.tsx"
    - "app/org/[slug]/login/page.tsx"
    - "app/admin/layout.tsx"
    - "app/admin/page.tsx"
    - "app/admin/login/page.tsx"
    - "app/not-found.tsx"
    - "components/find-my-org.tsx"
    - "components/org-login-page.tsx"
    - "app/api/auth/find-org/route.ts"
  modified:
    - "app/page.tsx"

key-decisions:
  - "proxy.ts does NO auth, NO DB queries -- purely thin URL rewriter per CVE-2025-29927 defense-in-depth"
  - "Org layout does prisma lookup for org validation; not-found triggers 404, SUSPENDED shows custom suspension page"
  - "Find-org API uses 200ms minimum response time for constant-time response pattern to prevent timing attacks"
  - "Org login uses <img> for base64 logos (cannot use next/image for data URLs) -- lint warnings accepted"

patterns-established:
  - "proxy.ts: subdomain detection -> path rewriting, passthrough in dev mode"
  - "Org-scoped layout: server component validates org exists/active, wraps children"
  - "Org chat page: client component wrapping FullChatApp with org context from URL params"
  - "Find-my-org flow: email -> API lookup -> redirect to org login or admin login"
  - "Org-branded login: initials fallback when no logo uploaded, dual logo display modes"

requirements-completed: [ROUTE-01, ROUTE-02, ROUTE-03]

# Metrics
duration: 9min
completed: 2026-02-26
---

# Phase 1 Plan 03: Routing Infrastructure Summary

**proxy.ts subdomain rewriting, org-scoped page structure with branded login, email-first org finder, and Super Admin entry points**

## Performance

- **Duration:** 9 min
- **Started:** 2026-02-26T13:45:09Z
- **Completed:** 2026-02-26T13:54:09Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- proxy.ts for production subdomain routing: admin.llmatscale.ai -> /admin/*, {slug}.llmatscale.ai -> /org/{slug}/* (development uses path-based routing natively)
- Org-scoped page structure: /org/[slug]/chat, /org/[slug]/login, /org/[slug]/admin with server-side org validation in layout
- Org-branded login page with PLATFORM_AND_ORG and ORG_ONLY logo display modes, org initials fallback
- Email-first "Find My Org" flow on bare domain (like Slack's "find your workspace")
- Super Admin dashboard placeholder and login page at /admin/*
- Global 404 page for unknown organizations (no info leakage)
- Find-org API endpoint with constant-time response to prevent timing attacks

## Task Commits

Each task was committed atomically:

1. **Task 1: Create proxy.ts and org-scoped page structure** - `83328f6` (feat)
2. **Task 2: Create bare domain page, org login, 404 handling, and find-org API** - `3a1c1c6` (feat)

## Files Created/Modified
- `proxy.ts` - Subdomain-to-path rewriting for production multi-tenancy (routing only, no auth)
- `app/org/[slug]/layout.tsx` - Server component: org lookup by slug, 404 on missing, suspension page
- `app/org/[slug]/chat/page.tsx` - Client component wrapping FullChatApp with org context
- `app/org/[slug]/admin/page.tsx` - Org Admin dashboard placeholder (Phase 6)
- `app/org/[slug]/login/page.tsx` - Server component rendering OrgLoginPage with org data
- `app/admin/layout.tsx` - Simple Super Admin layout wrapper
- `app/admin/page.tsx` - Super Admin dashboard placeholder (Phase 5)
- `app/admin/login/page.tsx` - Super Admin login with platform branding
- `app/page.tsx` - Updated: renders FindMyOrg instead of LoginPage
- `app/not-found.tsx` - Global 404 page (no info leakage about org existence)
- `components/find-my-org.tsx` - Email-first org finder with auto-redirect for existing sessions
- `components/org-login-page.tsx` - Org-branded login with dual logo display modes
- `app/api/auth/find-org/route.ts` - Email lookup with constant-time response pattern

## Decisions Made
- proxy.ts is a pure URL rewriter with zero auth or DB logic, following CVE-2025-29927 defense-in-depth principle
- Org layout performs prisma lookup to validate org exists and is active; notFound() triggers Next.js 404, SUSPENDED status shows a dedicated suspension page
- Find-org API enforces a 200ms minimum response time to prevent timing attacks that could reveal whether an email exists in the system
- Base64 logos use native `<img>` tag since next/image cannot optimize data URLs -- lint warnings are accepted as expected behavior
- Admin/page.tsx uses eager session check (via function call in render) instead of setState in useEffect to satisfy React 19 purity rules

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed React 19 purity lint error in admin/page.tsx**
- **Found during:** Task 2 (lint verification)
- **Issue:** `setIsAuthed(true)` called directly inside useEffect triggered React 19 "avoid calling setState within an effect" lint error
- **Fix:** Refactored to compute session validity eagerly via function call during render, removed useState dependency
- **Files modified:** app/admin/page.tsx
- **Verification:** npm run lint passes for admin/page.tsx (no errors)
- **Committed in:** 3a1c1c6 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix)
**Impact on plan:** Minor refactoring to satisfy React 19 lint rules. No scope creep.

## Issues Encountered
- Pre-existing uncommitted changes from Plan 02 (auth middleware enrichment) were present in the working tree. These were NOT staged or committed -- they are out of scope for Plan 03 and will be addressed when Plan 02 is executed.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All routing infrastructure is in place for multi-tenant navigation
- Org-scoped pages are ready to be enhanced with auth middleware (Plan 02) and org context passing
- Super Admin pages are ready for Phase 5 dashboard implementation
- Org Admin placeholder is ready for Phase 6 dashboard implementation
- Find-my-org flow is functional and ready for production use
- Existing /chat route preserved for backward compatibility

---
## Self-Check: PASSED

- All 12 created files found on disk
- All 2 task commits verified in git log
- Modified file (app/page.tsx) confirmed updated

---
*Phase: 01-schema-and-auth-foundation*
*Completed: 2026-02-26*
