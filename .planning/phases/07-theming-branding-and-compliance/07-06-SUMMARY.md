---
phase: 07-theming-branding-and-compliance
plan: 06
subsystem: frontend, api, compliance
tags: [logo, branding, login, onboarding, wizard, framer-motion]

requires:
  - phase: 07-theming-branding-and-compliance
    plan: 01
    provides: OrgSettings with theme/onboarding fields, theme service
  - phase: 07-theming-branding-and-compliance
    plan: 03
    provides: Theme application via OrgThemeProvider, login API logo data
  - phase: 07-theming-branding-and-compliance
    plan: 04
    provides: Onboarding service, user onboarding API, conversation visibility
provides:
  - Org Admin logo upload/removal API (POST/DELETE)
  - Login page customization API (tagline + welcome message)
  - Redesigned org login page with two-column branding layout and theme application
  - Multi-step onboarding wizard with conversation visibility notice
  - Chat page onboarding gate (blocks access until accepted)
  - Settings page with Logo, Login Page, and Onboarding configuration sections
affects: [07-07]

tech-stack:
  added: []
  patterns:
    - "Multipart form upload pattern for org admin logo (File -> Base64 data URI)"
    - "Server-side theme fetch for login page (pre-auth theme application)"
    - "Onboarding gate pattern: chat page checks GET /onboarding before rendering"

key-files:
  created:
    - app/api/org/[slug]/admin/logo/route.ts
    - app/api/org/[slug]/admin/settings/login-page/route.ts
    - components/onboarding-wizard.tsx
  modified:
    - app/org/[slug]/login/page.tsx
    - components/org-login-page.tsx
    - app/org/[slug]/chat/page.tsx
    - app/org/[slug]/admin/settings/page.tsx

key-decisions:
  - "Login page server component fetches OrgSettings (tagline, welcome message) alongside org data in single query via Prisma relation"
  - "Login page applies theme via useEffect data-theme attribute (removed on unmount) since it is a client component"
  - "Onboarding wizard uses Framer Motion (motion/react) slide transitions between 3 steps"
  - "Chat page conversation visibility check gracefully falls back to false for non-admin users (403 from admin endpoint)"

patterns-established:
  - "Multipart logo upload: File input -> client validation -> FormData POST -> Base64 data URI storage"
  - "Pre-auth theme application: server component fetches theme, client component applies via data-theme"

requirements-completed: [OBRN-01, OVIS-06]

duration: 5min
completed: 2026-03-05
---

# Phase 7 Plan 06: Logo Upload, Login Page Redesign, and Onboarding Wizard Summary

**Org Admin logo upload with settings UI, two-column branded login page with server-side theme, and 3-step onboarding wizard with conversation visibility acknowledgment**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-05T09:50:33Z
- **Completed:** 2026-03-05T09:55:45Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Org Admin can upload/remove logo from settings page with client-side preview and validation
- Login page redesigned with two-column layout: branding (logo, tagline, welcome message) on left, form on right
- Login page applies org theme server-side before user authenticates (no FOUC)
- Multi-step onboarding wizard (Welcome -> Terms -> Confirmation) with Framer Motion transitions
- Conversation visibility notice shown in onboarding step 2 when enabled (OVIS-06)
- Chat page gates access until onboarding accepted
- Settings page now has Logo, Login Page, and Onboarding configuration sections

## Task Commits

Each task was committed atomically:

1. **Task 1: Org Admin logo upload + login page customization APIs** - `74f7827` (feat)
2. **Task 2: Login page redesign + onboarding wizard** - `2b17cc5` (feat)

## Files Created/Modified
- `app/api/org/[slug]/admin/logo/route.ts` - POST/DELETE for org logo upload/removal (multipart, max 500KB)
- `app/api/org/[slug]/admin/settings/login-page/route.ts` - GET/PUT for tagline and welcome message
- `components/onboarding-wizard.tsx` - 3-step wizard with slide transitions, checkbox agreement, POST acceptance
- `app/org/[slug]/login/page.tsx` - Server component now fetches OrgSettings and active theme
- `components/org-login-page.tsx` - Redesigned with two-column layout, theme application, tagline/welcome display
- `app/org/[slug]/chat/page.tsx` - Added onboarding check (GET /onboarding) before rendering chat
- `app/org/[slug]/admin/settings/page.tsx` - Added Logo, Login Page, and Onboarding sections

## Decisions Made
- Login page server component fetches OrgSettings via Prisma relation include (single query)
- Login page theme applied via client-side useEffect setting data-theme (cleaned up on unmount)
- Onboarding wizard uses Framer Motion slide transitions (already available as motion/react)
- Chat page conversation visibility check gracefully handles 403 for non-admin users (defaults to false)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All branding surfaces complete (logo, tagline, welcome message, theme)
- Onboarding wizard integrated into chat page flow
- Ready for final phase 7 plan (07-07)

## Self-Check: PASSED

All 3 created files verified present. Both task commits (`74f7827`, `2b17cc5`) verified in git log. TypeScript compilation clean (no new errors introduced).

---
*Phase: 07-theming-branding-and-compliance*
*Completed: 2026-03-05*
