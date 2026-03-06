---
phase: 04-role-configuration-and-usage-limits
plan: 03
subsystem: api, ui, chat
tags: [usage-limits, recharts, polling, 429-enforcement, admin-dashboard, progress-bars, rolling-window]

# Dependency graph
requires:
  - phase: 04-role-configuration-and-usage-limits
    provides: "Usage service (checkUserUsageLimits, getUserUsageSummary, getOrgMonthlyUsage, checkOrgMonthlyCeiling), Recharts dependency"
provides:
  - "Chat route usage pre-check (429 on daily limit or org ceiling)"
  - "GET /api/org/[slug]/usage-status for chat UI polling"
  - "UsageBanner component (amber warning at 80%, red block at 100%)"
  - "GET /api/org/[slug]/admin/usage with org-wide aggregates and trend data"
  - "GET /api/org/[slug]/admin/usage/users with per-user breakdown and status badges"
  - "Usage monitoring dashboard page with Recharts chart and per-user table"
  - "Super Admin org ceiling PATCH extension (monthlyRequestCeiling, monthlyTokenCeiling)"
affects: [04-05, 04-06, 05, 06]

# Tech tracking
tech-stack:
  added: []
  patterns: [usage-status-polling-60s, progress-bar-with-threshold-colors, filter-tabs-with-counts]

key-files:
  created:
    - app/api/org/[slug]/usage-status/route.ts
    - app/api/org/[slug]/admin/usage/route.ts
    - app/api/org/[slug]/admin/usage/users/route.ts
    - app/org/[slug]/admin/usage/page.tsx
    - components/chat/usage-banner.tsx
  modified:
    - app/api/chat/route.ts
    - components/full-chat-app.tsx
    - lib/validation.ts
    - lib/services/org-service.ts

key-decisions:
  - "UsageBanner polls every 60 seconds with setInterval (lightweight single-aggregate endpoint)"
  - "Warning dismissal tracks percentage at dismissal, re-shows if usage jumps 10%+ since dismissed"
  - "Daily trend uses raw SQL DATE() grouping since Prisma groupBy lacks date truncation"
  - "Per-user table sorts blocked > warning > normal > inactive for immediate attention priority"
  - "Force-logout button wired to future 04-05 endpoint path (works once that plan completes)"

patterns-established:
  - "Usage status polling: 60s interval with onBlockedChange callback for parent state sync"
  - "Admin dashboard layout: summary cards row + chart + filterable table with skeleton loading"
  - "Progress bar component: green <80%, amber 80-99%, red 100%+ with current/limit text"

requirements-completed: [OUSE-02, OUSE-03, OUSE-04, OUSE-05, OALT-01, OALT-02, OALT-03, UCHAT-03, UCHAT-04, SAFE-10]

# Metrics
duration: 8min
completed: 2026-02-28
---

# Phase 4 Plan 03: Usage Enforcement and Monitoring Summary

**Chat route 429 enforcement for daily/monthly limits, amber/red usage banners in chat UI, and admin usage dashboard with Recharts trend chart and per-user progress table**

## Performance

- **Duration:** 8 min
- **Started:** 2026-02-28T17:06:37Z
- **Completed:** 2026-02-28T17:14:29Z
- **Tasks:** 3
- **Files modified:** 9

## Accomplishments
- Chat route rejects requests with 429 when user hits daily limit or org hits monthly ceiling
- Users see amber warning banner at 80% and red blocked banner at 100% with chat input disabled
- Org Admin has a full monitoring dashboard with summary cards, 30-day trend chart, and per-user usage table with filter tabs

## Task Commits

Each task was committed atomically:

1. **Task 1: Chat route usage enforcement + usage status API + org ceiling API** - `d2bdbd8` (feat)
2. **Task 2: Chat UI usage banners + integration** - `5238267` (feat)
3. **Task 3: Admin usage monitoring dashboard** - `fb8a86c` (feat)

## Files Created/Modified
- `app/api/chat/route.ts` - Added sections C (user daily limit) and D (org monthly ceiling) usage checks
- `app/api/org/[slug]/usage-status/route.ts` - Lightweight polling endpoint for chat UI
- `app/api/org/[slug]/admin/usage/route.ts` - Org-wide usage aggregates with daily trend
- `app/api/org/[slug]/admin/usage/users/route.ts` - Per-user breakdown with status badges
- `app/org/[slug]/admin/usage/page.tsx` - Usage monitoring dashboard with Recharts and filter tabs
- `components/chat/usage-banner.tsx` - Amber warning and red blocked banners
- `components/full-chat-app.tsx` - UsageBanner integration (import, state, prop, render)
- `lib/validation.ts` - Added monthlyRequestCeiling/monthlyTokenCeiling to UpdateOrgSchema
- `lib/services/org-service.ts` - Extended updateOrganization to handle ceiling fields

## Decisions Made
- UsageBanner uses 60-second polling interval (suitable for lightweight single-aggregate query endpoint)
- Warning banner dismissal tracks the percentage at dismissal time and re-shows if usage crosses 10% higher
- Daily trend chart uses raw SQL with DATE() truncation since Prisma groupBy doesn't support date functions natively
- Per-user table is sorted by severity (blocked first, then warning, normal, inactive) for admin attention priority
- Force-logout button on user rows calls the 04-05 endpoint path (will work once that plan is executed)
- Banner renders outside ChatContainerContent (above scroll area) so it stays pinned at top

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Usage enforcement is live in chat route (429 responses)
- Chat UI shows warning/blocked states via polling
- Admin dashboard provides monitoring visibility
- Force-logout UI is pre-wired for 04-05 completion
- Super Admin ceiling API ready for Phase 5 UI

---
*Phase: 04-role-configuration-and-usage-limits*
*Completed: 2026-02-28*
