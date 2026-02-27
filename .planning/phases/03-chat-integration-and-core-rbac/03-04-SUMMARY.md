---
phase: 03-chat-integration-and-core-rbac
plan: 04
subsystem: ui, api
tags: [react, next.js, sidebar, admin-console, system-instructions, token-counter, textarea, crud-api]

# Dependency graph
requires:
  - phase: 03-chat-integration-and-core-rbac
    plan: 01
    provides: "Token counter utility (estimateTokenCount, TOKEN_LIMITS, SERVER_MARGIN)"
  - phase: 03-chat-integration-and-core-rbac
    plan: 02
    provides: "AdminSidebar component with variant prop for super-admin/org-admin reuse"
provides:
  - "Org Admin Console shell with sidebar at /org/[slug]/admin"
  - "System instructions management page at /org/[slug]/admin/instructions"
  - "InstructionEditor component with live token counter and progress bar"
  - "instruction-service.ts with token budget validation and audit logging"
  - "Org instructions GET/PATCH API endpoints"
  - "Role instructions GET/PATCH API endpoints"
  - "Zod schemas for org and role instruction validation"
affects: [03-05-role-settings, 03-06-mcp-management, chat-integration, user-instructions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Org Admin sidebar nav with enabled/disabled items and 'Coming Soon' badges"
    - "Org Admin layout with admin verification via org-scoped API call"
    - "InstructionEditor component reusable for org/role/user instruction editing"
    - "Token budget validation in service layer before DB write"

key-files:
  created:
    - "app/org/[slug]/admin/layout.tsx"
    - "app/org/[slug]/admin/instructions/page.tsx"
    - "components/admin/instruction-editor.tsx"
    - "lib/services/instruction-service.ts"
    - "app/api/org/[slug]/admin/instructions/route.ts"
    - "app/api/org/[slug]/admin/roles/[roleId]/instructions/route.ts"
  modified:
    - "components/admin/admin-sidebar.tsx"
    - "app/org/[slug]/admin/page.tsx"
    - "lib/validation.ts"

key-decisions:
  - "Org Admin layout verifies admin access via org-scoped API call (not auth/me which lacks org context)"
  - "Org name computed from session data synchronously (useMemo) to avoid ESLint set-state-in-effect error"
  - "Instructions stored as plain text -- sanitization happens at prompt composition time, not save time"
  - "Roles endpoint already existed from Plan 05; instructions page consumes its array response directly"

patterns-established:
  - "Org Admin layout auth pattern: verify via org-scoped admin endpoint, redirect on 401/403"
  - "InstructionEditor: reusable textarea with live token count, color-coded progress bar, configurable maxTokens"
  - "Instruction save pattern: validateTokenBudget -> prisma.$transaction with audit log"
  - "Org admin API pattern: requireOrgAdmin -> Zod validate -> service function -> error mapping"

requirements-completed: [OINST-01, OINST-02, OINST-03, OINST-04, ORSI-01, ORSI-02, ORSI-03, ORSI-04]

# Metrics
duration: 6min
completed: 2026-02-27
---

# Phase 3 Plan 04: Org Admin Console and System Instructions Summary

**Org Admin Console with sidebar navigation and system instructions management page featuring live token counting and org/role-level instruction editing**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-27T10:40:22Z
- **Completed:** 2026-02-27T10:46:26Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Org Admin Console shell at /org/[slug]/admin with 7-section sidebar (3 enabled: Instructions, Role Settings, MCP; 4 show "Coming Soon")
- System instructions management page with org-level editor (700 token limit) and per-role editors (500 token limit)
- InstructionEditor component with live token counter, color-coded progress bar (green/amber/red), and disabled state
- Server-side token budget validation via instruction-service.ts with audit logging
- AdminSidebar org-admin variant with org name header, "Back to Chat" link, and contextual sign out

## Task Commits

Each task was committed atomically:

1. **Task 1: Org Admin Console layout with sidebar and instruction service** - `a4db5bb` (feat)
2. **Task 2: System instructions management page with API endpoints** - `5022a9c` (feat)

## Files Created/Modified
- `components/admin/admin-sidebar.tsx` - Updated with org-admin variant: 7 nav items, org name header, Back to Chat link
- `app/org/[slug]/admin/layout.tsx` - New Org Admin layout with SidebarProvider and admin verification
- `app/org/[slug]/admin/page.tsx` - Updated to redirect to /instructions (was placeholder)
- `lib/services/instruction-service.ts` - New service with validateTokenBudget, saveOrgInstructions, saveRoleInstructions
- `lib/validation.ts` - Added OrgInstructionsSchema and RoleInstructionsSchema
- `components/admin/instruction-editor.tsx` - New reusable textarea with live token counter and progress bar
- `app/api/org/[slug]/admin/instructions/route.ts` - New GET/PATCH for org system instructions
- `app/api/org/[slug]/admin/roles/[roleId]/instructions/route.ts` - New GET/PATCH for role system instructions
- `app/org/[slug]/admin/instructions/page.tsx` - New instructions management page with org and role sections

## Decisions Made
- Org Admin layout verifies access by calling the org instructions API endpoint (which uses requireOrgAdmin internally), rather than auth/me which doesn't return org context for non-org-scoped calls.
- Used useMemo for initial org name from session instead of setState in useEffect to satisfy ESLint react-hooks/set-state-in-effect rule (same pattern as Plan 02 admin layout).
- Instructions stored as plain text without sanitization at save time. Sanitization via sanitizePromptLayer() happens at prompt composition time in system-prompt-service (Plan 03), keeping storage layer simple.
- Roles endpoint already existed from a concurrent plan (returns array directly, not { roles: [...] }). Instructions page adapted to consume the existing response format.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed ESLint set-state-in-effect error in Org Admin layout**
- **Found during:** Task 1 (Org Admin layout creation)
- **Issue:** Calling setOrgName synchronously inside useEffect triggered react-hooks/set-state-in-effect lint error
- **Fix:** Moved org name computation to useMemo outside the effect, matching the pattern used in Plan 02's admin layout
- **Files modified:** app/org/[slug]/admin/layout.tsx
- **Verification:** npm run lint passes
- **Committed in:** a4db5bb (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor refactor to satisfy linting rules. No scope change.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Org Admin Console shell ready for Plan 05 (Role Settings page) and Plan 06 (MCP Servers page)
- InstructionEditor component ready for reuse in user instructions (Plan 05)
- instruction-service.ts provides save patterns for both org and role instructions
- System instructions will be consumed by system-prompt-service.ts (Plan 03) for 4-layer prompt composition

## Self-Check: PASSED

All 9 files verified present on disk. Both task commits (a4db5bb, 5022a9c) found in git log.

---
*Phase: 03-chat-integration-and-core-rbac*
*Completed: 2026-02-27*
