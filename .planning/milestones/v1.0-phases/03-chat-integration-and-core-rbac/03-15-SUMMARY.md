---
phase: 03-chat-integration-and-core-rbac
plan: 15
subsystem: ui
tags: [accessibility, aria-label, navigation-guard, beforeunload, role-descriptions, radix-tooltip]

# Dependency graph
requires:
  - phase: 03-chat-integration-and-core-rbac
    provides: "MCP assignment panel, instructions page, roles page from plans 03-04 through 03-13"
provides:
  - "MCP action buttons with aria-label attributes for screen readers"
  - "Unsaved changes navigation guard covering browser close, client-side nav, and back/forward"
  - "System role fallback descriptions for Technical/Business/Basic roles"
affects: [phase-04-role-configuration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "anyDirtyRef pattern for stable event handler references with changing dirty state"
    - "Capture-phase click interception for Next.js client-side navigation guard"
    - "SYSTEM_ROLE_DESCRIPTIONS constant map for fallback role descriptions"

key-files:
  created: []
  modified:
    - "components/admin/mcp-assignment-panel.tsx"
    - "app/org/[slug]/admin/instructions/page.tsx"
    - "app/org/[slug]/admin/roles/page.tsx"

key-decisions:
  - "aria-labels added to Button elements only, no Tooltip structure changes"
  - "Navigation guard uses capture-phase click handler + popstate for comprehensive coverage"
  - "window.location.href used for confirmed navigation to ensure reliable page transition"
  - "SYSTEM_ROLE_DESCRIPTIONS is a display-only fallback, not a database change"

patterns-established:
  - "anyDirtyRef: Use React ref to track mutable state in stable event handlers registered once"
  - "Capture-phase click interception: document.addEventListener('click', handler, true) for Next.js nav guard"

requirements-completed: [UCHAT-01, UCHAT-02, UCHAT-05, UCHAT-06, PRMT-01, PRMT-02, PRMT-03, PRMT-04, PRMT-05, PRMT-06, OLLM-01, OLLM-02, OMCP-01, OMCP-02, OMCP-03, OMCP-04, OMCP-05, OINST-01, OINST-02, OINST-03, OINST-04, ORSI-01, ORSI-02, ORSI-03, ORSI-04, UCUST-01, UCUST-02, UCUST-03, UCUST-04, SAFE-07, SAFE-08, SAFE-09, MODL-01, MODL-02, MODL-03, MODL-04, MODL-05, MODL-06, MODL-07]

# Metrics
duration: 3min
completed: 2026-02-28
---

# Phase 3 Plan 15: Gap Closure Summary

**Aria-label accessibility on MCP buttons, unsaved-changes navigation guard on instructions page, and system role fallback descriptions on role cards**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-28T11:57:37Z
- **Completed:** 2026-02-28T12:01:00Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- All 4 MCP action buttons (Test, Discover, Edit, Delete) now have descriptive aria-label attributes for screen reader accessibility
- Instructions page now warns about unsaved changes on browser close/reload, client-side Next.js navigation (sidebar link clicks), and browser back/forward buttons
- System roles (Technical, Business, Basic) always display description text on role cards via hardcoded fallback map

## Task Commits

Each task was committed atomically:

1. **Task 1: Add aria-label attributes to MCP action buttons** - `a6ad94f` (feat)
2. **Task 2: Add unsaved changes navigation guard to instructions page** - `b74f812` (feat)
3. **Task 3: Add fallback descriptions for system roles on role cards** - `16dd164` (feat)

## Files Created/Modified
- `components/admin/mcp-assignment-panel.tsx` - Added aria-label to all 4 MCP action buttons in McpAdminCard
- `app/org/[slug]/admin/instructions/page.tsx` - Added anyDirtyRef, capture-phase click handler, and popstate handler for navigation guard
- `app/org/[slug]/admin/roles/page.tsx` - Added SYSTEM_ROLE_DESCRIPTIONS map and fallback rendering in CardDescription

## Decisions Made
- aria-labels added directly to Button elements without restructuring Tooltip wrappers (minimal change principle)
- Navigation guard uses capture-phase click handler to fire before Next.js Link component, with window.location.href for confirmed navigation (reliable full page load)
- SYSTEM_ROLE_DESCRIPTIONS is display-only -- no database or seed changes (per STATE.md decision [03-12])

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript build error in `app/api/artifacts/[id]/route.ts` (tenantDb.artifact type unknown) causes `npm run build` to fail. This is documented in `deferred-items.md` and is unrelated to this plan's changes. All 3 modified files compile cleanly with zero TypeScript errors.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All 3 UAT gaps from Phase 3 verification are now closed
- Phase 3 is fully complete with all gap items addressed
- Ready for Phase 4: Role Configuration and Usage Limits

## Self-Check: PASSED

- All 3 modified files exist on disk
- All 3 task commits verified (a6ad94f, b74f812, 16dd164)
- 4 aria-label attributes confirmed in mcp-assignment-panel.tsx
- SYSTEM_ROLE_DESCRIPTIONS constant confirmed in roles/page.tsx
- Navigation guard effects confirmed in instructions/page.tsx

---
*Phase: 03-chat-integration-and-core-rbac*
*Completed: 2026-02-28*
