---
phase: 03-chat-integration-and-core-rbac
plan: 05
subsystem: api, ui
tags: [rbac, model-assignment, radix-checkbox, org-admin, role-settings, mcp]

# Dependency graph
requires:
  - phase: 03-chat-integration-and-core-rbac
    plan: 01
    provides: "Model Registry service (getAllModels, getModelsByIds), Role schema with personalMcpEnabled/personalMcpMaxCount fields"
  - phase: 02-org-management
    provides: "requireOrgAdmin middleware, audit-service pattern, Org Admin API route pattern"
provides:
  - "Role list API for Org Admin (GET /api/org/[slug]/admin/roles)"
  - "Role model assignment API (GET/PATCH /api/org/[slug]/admin/roles/[roleId]/models)"
  - "Role settings API (GET/PATCH /api/org/[slug]/admin/roles/[roleId]/settings)"
  - "RoleModelAssignment component with generation grouping and mixed-state checkboxes"
  - "Checkbox UI component (shadcn pattern with indeterminate state)"
  - "Role settings admin page at /org/[slug]/admin/roles"
affects: [03-03, 03-04, 03-06, chat-integration, model-filtering, org-admin-console]

# Tech tracking
tech-stack:
  added: ["@radix-ui/react-checkbox"]
  patterns:
    - "3-state checkbox group (checked/unchecked/indeterminate) for batch model selection"
    - "Per-section save pattern: model assignment and role settings saved independently"
    - "Org Admin role API route pattern: requireOrgAdmin -> Zod validate -> prisma.$transaction with auditLog"

key-files:
  created:
    - "app/api/org/[slug]/admin/roles/route.ts"
    - "app/api/org/[slug]/admin/roles/[roleId]/models/route.ts"
    - "app/api/org/[slug]/admin/roles/[roleId]/settings/route.ts"
    - "components/admin/role-model-assignment.tsx"
    - "components/ui/checkbox.tsx"
    - "app/org/[slug]/admin/roles/page.tsx"
  modified: []

key-decisions:
  - "Model assignment uses raw prisma.$transaction (not tenantDb) for update since Role.allowedModels is a JSON column updated directly by roleId"
  - "RoleModelAssignment fetches models from /api/admin/models (Super Admin endpoint) since model registry is platform-level"
  - "Settings save is per-role with change detection -- save button only appears when settings differ from server state"

patterns-established:
  - "Checkbox UI component: shadcn pattern with Radix primitive, supports checked/unchecked/indeterminate states"
  - "Role settings page pattern: Card per role with collapsible sections for model access, custom instructions, personal MCP"

requirements-completed: [OLLM-01, MODL-07]

# Metrics
duration: 3min
completed: 2026-02-27
---

# Phase 3 Plan 5: Role Model Assignment and Settings Summary

**Org Admin role settings page with generation-grouped model assignment (mixed-state checkboxes), custom instructions toggle, and personal MCP settings per role**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-27T10:40:22Z
- **Completed:** 2026-02-27T10:44:13Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Role management APIs: list roles with member counts, update model assignment with minimum-1 validation, update settings (custom instructions, personal MCP)
- Model assignment UI with generation grouping (Claude 4.6, 4.5, 4) and 3-state group checkboxes per MODL-07
- Custom instructions toggle and personal MCP toggle with max count input per role
- All mutations audit-logged with before/after metadata

## Task Commits

Each task was committed atomically:

1. **Task 1: Role settings APIs (roles list, model assignment, role configuration)** - `35a6ad6` (feat)
2. **Task 2: Role settings page with model assignment UI** - `22d1868` (feat)

## Files Created/Modified
- `app/api/org/[slug]/admin/roles/route.ts` - GET roles list with all fields and member counts
- `app/api/org/[slug]/admin/roles/[roleId]/models/route.ts` - GET/PATCH role model assignment with Model Registry validation
- `app/api/org/[slug]/admin/roles/[roleId]/settings/route.ts` - GET/PATCH role settings (custom instructions, personal MCP)
- `components/ui/checkbox.tsx` - Shadcn checkbox with indeterminate state support
- `components/admin/role-model-assignment.tsx` - Model assignment UI with generation grouping and mixed-state checkboxes
- `app/org/[slug]/admin/roles/page.tsx` - Org Admin role settings management page

## Decisions Made
- Model assignment uses raw prisma.$transaction (not tenantDb) for the update since we need to write to a specific roleId without the tenant extension interfering with the simple update-by-id pattern.
- RoleModelAssignment component fetches available models from `/api/admin/models?status=ACTIVE` (the Super Admin endpoint) since the Model Registry is platform-level and not org-scoped. This endpoint requires auth but works for listing available models.
- Save buttons are per-section (model assignment has its own save, settings have their own save) with change detection to avoid unnecessary API calls.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed @radix-ui/react-checkbox**
- **Found during:** Task 2 (Model assignment UI)
- **Issue:** @radix-ui/react-checkbox not in project dependencies, needed for indeterminate checkbox state
- **Fix:** Ran `npm install @radix-ui/react-checkbox` and created checkbox.tsx component
- **Files modified:** package.json, package-lock.json, components/ui/checkbox.tsx
- **Verification:** Import resolves, lint passes
- **Committed in:** 22d1868 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking dependency)
**Impact on plan:** Necessary for UI functionality. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Role model assignment page is functional and ready for Org Admin Console integration (Plan 04)
- Model assignment validation ensures all assigned models exist in the platform registry
- Role settings (custom instructions, personal MCP) are persisted and ready for chat integration enforcement in Plan 03

## Self-Check: PASSED

All 6 files verified present. Both commit hashes (35a6ad6, 22d1868) verified in git log.

---
*Phase: 03-chat-integration-and-core-rbac*
*Completed: 2026-02-27*
