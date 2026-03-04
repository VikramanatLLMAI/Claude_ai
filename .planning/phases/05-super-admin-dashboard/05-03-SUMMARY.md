---
phase: 05-super-admin-dashboard
plan: "03"
subsystem: ui
tags: [react, tanstack-table, data-table, organizations, super-admins, sidebar, admin, crud]

# Dependency graph
requires:
  - phase: 05-super-admin-dashboard
    provides: Route restructure /admin -> /super-admin (05-01)
  - phase: 05-super-admin-dashboard
    provides: Generic DataTable component system (05-02)
provides:
  - Organizations management page with DataTable and full CRUD (create/edit/suspend/activate/delete/restore)
  - Super Admins management page with DataTable and CRUD (create/edit/delete with safety guards)
  - Updated super-admin sidebar with 3 grouped sections, all 8 items enabled
affects:
  - app/super-admin/organizations/page.tsx
  - app/super-admin/super-admins/page.tsx
  - components/admin/admin-sidebar.tsx

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DataTable page pattern: useEffect fetchData -> useState -> ColumnDef[] with DataTableColumnHeader -> DataTable component"
    - "Modal CRUD pattern: Dialog + form state + onSubmit async handler throwing errors for in-dialog display"
    - "ConfirmationDialog for destructive actions (suspend, delete, restore) with loading state"
    - "Safety guards via UI disable: currentUserId from localStorage, admins.length <= 1 for last-SA check"
    - "Row actions via DropdownMenu with MoreVertical trigger, conditional items based on status"
    - "Auto-slug generation from org name on create (disabled on edit)"

key-files:
  created:
    - app/super-admin/organizations/page.tsx
    - app/super-admin/super-admins/page.tsx
  modified:
    - components/admin/admin-sidebar.tsx

key-decisions:
  - "Used userCount (not _count.orgMembers) since listOrganizations() service returns flat shape with userCount alias"
  - "Slug field disabled on edit with explanatory text -- slug is identity, cannot change"
  - "Removed Tooltip import for disabled delete in super-admins page -- used native title attribute instead (Radix Tooltip unreliable inside DropdownMenuContent portals)"
  - "Sign-out redirect updated to /super-admin/login in admin-sidebar.tsx (was /admin/login)"
  - "SUPER_ADMIN_NAV_ITEMS flat array replaced with SUPER_ADMIN_NAV_GROUPS NavGroup[] matching org-admin pattern"
  - "Activate confirmation dialog uses warning variant (not destructive) since it is a positive action"

patterns-established:
  - "Super-admin page header: SidebarTrigger + icon + h1 title on left, primary Button on right"
  - "Loading state: inline spinner div (no external skeleton) for lightweight pages"
  - "Toast feedback on all CRUD mutations (success and error)"
  - "Deleted org shows Restore only; suspended org shows Activate instead of Suspend"

requirements-completed:
  - SUI-01
  - SUI-03

# Metrics
duration: 8min
completed: "2026-03-04"
---

# Phase 05 Plan 03: Organizations and Super Admins Management Pages Summary

**Organizations and Super Admins management pages with TanStack DataTable, row actions, CRUD modals, and sidebar upgrade from flat to 3-group navigation (Management, Monitoring, Configuration) with all 8 items enabled**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-03-04T15:08:47Z
- **Completed:** 2026-03-04T15:16:50Z
- **Tasks:** 3
- **Files modified:** 2 created, 1 modified

## Accomplishments

- Upgraded `AdminSidebar` super-admin variant from flat `SUPER_ADMIN_NAV_ITEMS` to grouped `SUPER_ADMIN_NAV_GROUPS` with 3 sections (Management, Monitoring, Configuration), all 8 nav items enabled with `/super-admin/*` hrefs
- Created `app/super-admin/organizations/page.tsx`: DataTable with name/slug, status badge (green/amber/red), user count, created date columns; Create/Edit dialog with auto-slug generation; Suspend/Activate/Delete/Restore row actions via DropdownMenu with ConfirmationDialogs
- Created `app/super-admin/super-admins/page.tsx`: DataTable with name/email, email, created date columns; Create dialog (name + email + password); Edit dialog (name only, email read-only); Delete with SAFE-01 (self-delete disabled) and SAFE-06 (last SA disabled) safety guards

## Task Commits

1. **Task 1: Upgrade admin sidebar to grouped navigation** - `deeca88` (feat)
2. **Task 2: Organizations management page** - `7e0fafb` (feat)
3. **Task 3: Super Admins management page** - `d65f15e` (feat)

## Files Created/Modified

- `components/admin/admin-sidebar.tsx` - Replaced SUPER_ADMIN_NAV_ITEMS with SUPER_ADMIN_NAV_GROUPS (3 groups), updated hrefs to /super-admin/*, updated sign-out redirect to /super-admin/login, org admin variant unchanged
- `app/super-admin/organizations/page.tsx` - Full CRUD page: StatusBadge component, OrgFormDialog (create/edit), 5 action types (edit/suspend/activate/delete/restore), ConfirmationDialogs for destructive actions
- `app/super-admin/super-admins/page.tsx` - CRUD page: CreateSuperAdminDialog (3 fields), EditSuperAdminDialog (name only), delete guard logic using currentUserId and admins.length

## Decisions Made

- Used `userCount` field (not `_count.orgMembers`) since `listOrganizations()` returns a flat shape with `userCount` as alias
- Slug field disabled on edit with explanatory text — slug is org identity, cannot be changed post-creation
- Removed Radix Tooltip import for disabled delete item in super-admins page; used native `title` attribute instead — Radix Tooltip is unreliable inside `DropdownMenuContent` portals
- Updated sidebar sign-out redirect from `/admin/login` to `/super-admin/login`
- Activate confirmation uses warning variant (amber) rather than destructive — it is a positive re-activation action
- SAFE-01 and SAFE-06 safety rules enforced through `canDelete` flag: `!isCurrentUser && !isLastAdmin`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing prerequisite infrastructure from 05-01 and 05-02**
- **Found during:** Initial analysis before Task 1
- **Issue:** 05-01 and 05-02 had been executed but not committed to git; directories showed as untracked. All infrastructure (super-admin layout, API routes, DataTable components) was actually present on disk
- **Fix:** Confirmed all prerequisites existed — proceeded with 05-03 tasks directly
- **Impact:** No code changes needed; state was already correct

**2. [Rule 1 - Bug] Tooltip inside DropdownMenuContent portals**
- **Found during:** Task 3 (Super Admins page) code review
- **Issue:** Radix Tooltip + disabled DropdownMenuItem inside DropdownMenuContent causes pointer-event conflicts; tooltip doesn't trigger reliably
- **Fix:** Replaced Tooltip wrapper with native `title` attribute on disabled DropdownMenuItem
- **Files modified:** app/super-admin/super-admins/page.tsx

---

**Total deviations:** 2 (1 non-issue state confirmation, 1 pattern bug fix)
**Impact on plan:** Minimal — both resolved without scope creep

## Issues Encountered

None blocking.

## User Setup Required

None — all features use existing API routes at `/api/super-admin/organizations/*` and `/api/super-admin/super-admins/*`.

## Next Phase Readiness

- 05-04 (API Keys management page) can proceed — DataTable infrastructure ready, super-admin layout working
- 05-05 (Analytics dashboard) can proceed in parallel (Wave 2)
- Sidebar navigation now links to all pages including Organizations and Super Admins

---
*Phase: 05-super-admin-dashboard*
*Completed: 2026-03-04*
