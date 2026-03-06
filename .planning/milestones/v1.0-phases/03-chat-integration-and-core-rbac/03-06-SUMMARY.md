---
phase: 03-chat-integration-and-core-rbac
plan: 06
subsystem: mcp, ui, api
tags: [mcp, custom-instructions, token-counter, settings-modal, rbac, prisma]

# Dependency graph
requires:
  - phase: 03-01
    provides: "Token counter utility (TOKEN_LIMITS, estimateTokenCount, SERVER_MARGIN)"
  - phase: 03-04
    provides: "InstructionEditor component, org admin layout and sidebar"
provides:
  - "Org Admin MCP connection CRUD API (/api/org/[slug]/admin/mcp/connections)"
  - "Org Admin MCP test and discover routes"
  - "McpAssignmentPanel component with org-wide and role-specific sections"
  - "MCP management page at /org/[slug]/admin/mcp"
  - "User custom instructions API (/api/org/[slug]/user/custom-instructions)"
  - "Custom instructions wired into Settings modal via InstructionEditor"
affects: [chat-route, prompt-composition, phase-07-theming]

# Tech tracking
tech-stack:
  added: []
  patterns: [org-managed-mcp-connections, user-custom-instructions-api, settings-modal-org-integration]

key-files:
  created:
    - "app/api/org/[slug]/admin/mcp/connections/route.ts"
    - "app/api/org/[slug]/admin/mcp/connections/[id]/route.ts"
    - "app/api/org/[slug]/admin/mcp/connections/[id]/discover/route.ts"
    - "app/api/org/[slug]/admin/mcp/connections/[id]/test/route.ts"
    - "app/org/[slug]/admin/mcp/page.tsx"
    - "components/admin/mcp-assignment-panel.tsx"
    - "app/api/org/[slug]/user/custom-instructions/route.ts"
  modified:
    - "components/settings-modal.tsx"
    - "components/full-chat-app.tsx"

key-decisions:
  - "Org-managed MCP connections use userId=null to distinguish from personal connections"
  - "MCP assignment types (org-wide vs role-specific) coexist on same McpConnection model via roleId"
  - "Custom instructions saved via API when orgSlug available, localStorage fallback for non-org context"
  - "InstructionEditor renders grayed-out with disabled message when role has customInstructionsEnabled=false"

patterns-established:
  - "Org admin MCP routes: requireOrgAdmin -> verify connection is org-managed (userId===null) -> action"
  - "McpAssignmentPanel: org-wide section + role-specific section grouped by role name"
  - "Settings modal org-integration: pass orgSlug prop, fetch from org-scoped API, fallback to localStorage"

requirements-completed: [OMCP-01, OMCP-02, OMCP-03, OMCP-04, OMCP-05, UCUST-01, UCUST-02, UCUST-03, UCUST-04, SAFE-08]

# Metrics
duration: 7min
completed: 2026-02-27
---

# Phase 3 Plan 6: Org MCP Management and User Custom Instructions Summary

**Org Admin MCP server management with org-wide/role-specific assignment, plus user custom instructions wired into Settings modal with InstructionEditor and 200-token budget validation**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-27T10:51:35Z
- **Completed:** 2026-02-27T10:59:01Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Org Admin can connect, test, discover tools, and delete MCP servers with org-wide or role-specific assignment
- User custom instructions API validates against 200-token budget and respects role-level enable/disable flag
- Custom instructions section wired into existing Settings modal using InstructionEditor component
- Disabled custom instructions show grayed-out text with "Custom instructions disabled by your admin" message

## Task Commits

Each task was committed atomically:

1. **Task 1: MCP management API routes and page** - `c72cd45` (feat)
2. **Task 2: User custom instructions API and Settings modal integration** - `8abf96d` (feat)

**Plan metadata:** `4464dd8` (docs: complete plan)

## Files Created/Modified
- `app/api/org/[slug]/admin/mcp/connections/route.ts` - GET list, POST create org-managed MCP connections
- `app/api/org/[slug]/admin/mcp/connections/[id]/route.ts` - GET, PATCH, DELETE single connection
- `app/api/org/[slug]/admin/mcp/connections/[id]/discover/route.ts` - POST discover tools from MCP server
- `app/api/org/[slug]/admin/mcp/connections/[id]/test/route.ts` - POST test MCP server connection
- `app/org/[slug]/admin/mcp/page.tsx` - MCP Server Management page with roles list
- `components/admin/mcp-assignment-panel.tsx` - Panel with org-wide and role-specific MCP sections
- `app/api/org/[slug]/user/custom-instructions/route.ts` - GET/PATCH user custom instructions
- `components/settings-modal.tsx` - Added InstructionEditor integration with org-backed custom instructions
- `components/full-chat-app.tsx` - Pass orgSlug prop to SettingsModal

## Decisions Made
- Org-managed MCP connections use `userId=null` to distinguish from personal connections; the existing query in personal MCP routes (`where: { userId: user.id }`) naturally excludes org-managed ones
- MCP admin routes use `prisma.$transaction` (not tenantDb) for audit log atomicity, with explicit `organizationId` in WHERE clauses
- Custom instructions API returns `enabled` flag from role so the frontend can render the disabled state without an extra API call
- Settings modal receives `orgSlug` as prop; when present, fetches from org-scoped API; when absent, falls back to localStorage (backward compatible)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Phase 3 plans (01-06) complete
- Org Admin MCP management and user custom instructions ready for integration with chat route prompt composition
- Ready to proceed to Phase 4

## Self-Check: PASSED

All 7 created files verified present. Commits c72cd45 and 8abf96d verified in git log.

---
*Phase: 03-chat-integration-and-core-rbac*
*Completed: 2026-02-27*
