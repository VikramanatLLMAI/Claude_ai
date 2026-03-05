---
phase: 07-theming-branding-and-compliance
plan: 03
subsystem: frontend, api
tags: [themes, ui, org-admin, super-admin, sidebar]

requires:
  - phase: 07-theming-branding-and-compliance
    plan: 01
    provides: Theme service, API routes, OrgThemeAssignment model
provides:
  - ThemeAssignmentPanel for Super Admin to assign themes to organizations
  - ThemeSelector for Org Admin to pick active theme from assigned themes
  - OrgThemeProvider for server-side theme application (no FOUC)
  - Chat sidebar org logo display based on logoDisplayMode
affects: [07-04, 07-05, 07-06, 07-07]

tech-stack:
  added: []
  patterns:
    - "Server-side theme fetch in org layout, client-side application via data-theme attribute"
    - "OrgThemeProvider wraps org children for theme cleanup on unmount"
    - "Login API includes logo data in org info for session-based access"

key-files:
  created:
    - components/admin/theme-assignment-panel.tsx
    - components/admin/theme-selector.tsx
    - components/org-theme-provider.tsx
  modified:
    - app/super-admin/organizations/page.tsx
    - app/org/[slug]/admin/settings/page.tsx
    - app/org/[slug]/layout.tsx
    - components/full-chat-app.tsx
    - app/api/auth/login/route.ts

key-decisions:
  - "Login API enhanced to include logoBase64 and logoDisplayMode in org info (avoids extra API call for sidebar logo)"
  - "Theme applied server-side via getActiveTheme in org layout, then client-side via OrgThemeProvider useEffect"
  - "OrgThemeProvider removes data-theme on unmount for clean navigation away from org pages"

requirements-completed: [OTHM-01, OTHM-02, OTHM-03, OTHM-04]

duration: 7min
completed: 2026-03-05
---

# Phase 7 Plan 03: Theme Assignment UI + Theme Selection UI + Org-Wide Theme Application Summary

**Theme assignment panel for Super Admin, theme selector for Org Admin, server-side theme application via OrgThemeProvider, and chat sidebar org logo display based on logoDisplayMode**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-05T09:41:09Z
- **Completed:** 2026-03-05T09:47:45Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- ThemeAssignmentPanel: Super Admin assigns themes to orgs via checkboxes with color swatch previews and default theme selector
- ThemeSelector: Org Admin picks active theme from only assigned themes (OTHM-02) with color swatch cards
- OrgThemeProvider: Client component applies data-theme attribute from server-fetched theme (no FOUC)
- Org layout fetches active theme server-side using getActiveTheme service
- Login API now returns logoBase64 and logoDisplayMode in organization info
- Chat sidebar displays org logo based on logoDisplayMode (ORG_ONLY shows logo only, PLATFORM_AND_ORG shows both)

## Task Commits

Each task was committed atomically:

1. **Task 1: Super Admin theme assignment panel + Org Admin theme selector** - `1dade04` (feat)
2. **Task 2: Org layout theme application + chat sidebar logo** - `3f4fc2e` (feat)

## Files Created/Modified
- `components/admin/theme-assignment-panel.tsx` - Super Admin theme assignment UI with checkboxes, swatches, default selector
- `components/admin/theme-selector.tsx` - Org Admin theme picker showing only assigned themes as cards
- `components/org-theme-provider.tsx` - Client component for applying/removing data-theme attribute
- `app/super-admin/organizations/page.tsx` - Added ThemeAssignmentPanel to org edit dialog
- `app/org/[slug]/admin/settings/page.tsx` - Added Theme section with ThemeSelector
- `app/org/[slug]/layout.tsx` - Server-side theme fetch + OrgThemeProvider wrapper
- `components/full-chat-app.tsx` - Sidebar header org logo display (surgical ~20 line change)
- `app/api/auth/login/route.ts` - Include logoBase64 and logoDisplayMode in org info response

## Decisions Made
- Login API enhanced to include logoBase64 and logoDisplayMode in org info to avoid extra API calls for sidebar logo display
- Theme applied server-side via getActiveTheme in org layout, then client-side via OrgThemeProvider useEffect on documentElement
- OrgThemeProvider removes data-theme attribute on unmount for clean navigation away from org pages

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Login API missing logo data in org info**
- **Found during:** Task 2
- **Issue:** Session data from org login did not include logoBase64 or logoDisplayMode, needed for sidebar logo display
- **Fix:** Enhanced login route to include these fields from the already-fetched organization object
- **Files modified:** app/api/auth/login/route.ts
- **Commit:** 3f4fc2e

## Issues Encountered
None

## Self-Check: PASSED
