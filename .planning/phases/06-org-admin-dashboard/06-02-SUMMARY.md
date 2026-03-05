---
phase: 06-org-admin-dashboard
plan: 02
subsystem: api
tags: [analytics, prisma, raw-sql, csv-export, org-scoped]

requires:
  - phase: 05-super-admin-dashboard
    provides: "platform-analytics-service.ts pattern for section-based analytics"
  - phase: 01-schema-auth-foundation
    provides: "Prisma schema with UsageRecord, OrgMember, Role, Invitation models"
provides:
  - "Org-scoped analytics service with 14 query functions covering OANA-01 through OANA-15"
  - "Section-based analytics API endpoint at /api/org/[slug]/admin/analytics"
  - "CSV export support for all analytics sections"
affects: [06-org-admin-dashboard]

tech-stack:
  added: []
  patterns:
    - "Org analytics mirrors platform analytics pattern with orgId scoping"
    - "Section-based API dispatch for parallel frontend loading"
    - "CSV export with BOM + escapeCsvValue pattern from audit-log-service"

key-files:
  created:
    - lib/services/org-analytics-service.ts
    - app/api/org/[slug]/admin/analytics/route.ts
  modified: []

key-decisions:
  - "getUsersNearLimits uses subquery pattern for percentage calculation (avoids HAVING with complex CASE expressions)"
  - "API key usage falls back to org-level aggregate when no PlatformApiKeyAssignment exists for the org"
  - "CSV export of section=all returns 400 error (export individual sections instead)"

patterns-established:
  - "Org analytics service functions take orgId as first parameter for explicit scoping"
  - "Default date range of 30 days when startDate/endDate not provided"

requirements-completed: [OANA-01, OANA-02, OANA-03, OANA-04, OANA-05, OANA-06, OANA-07, OANA-08, OANA-09, OANA-10, OANA-11, OANA-12, OANA-13, OANA-14, OANA-15]

duration: 4min
completed: 2026-03-05
---

# Phase 6 Plan 02: Org Analytics Service & API Summary

**Org-scoped analytics service with 14 query functions and section-based API endpoint covering all 15 OANA requirements**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-05T04:11:54Z
- **Completed:** 2026-03-05T04:16:08Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- 14 service functions covering KPI summary, usage trends, model distribution, top users, per-role usage, MCP usage, response times, error rates, peak hours, invitations, API keys, near-limit users, and inactive users
- Section-based API endpoint supporting parallel frontend fetching with 12 section values
- CSV export for each analytics section with proper BOM and Content-Disposition headers

## Task Commits

Each task was committed atomically:

1. **Task 1: Org analytics service layer** - `03909c8` (feat)
2. **Task 2: Org analytics API endpoint** - `2789f7d` (feat)

## Files Created/Modified
- `lib/services/org-analytics-service.ts` - 14 org-scoped analytics query functions with typed interfaces
- `app/api/org/[slug]/admin/analytics/route.ts` - Section-based GET endpoint with CSV export

## Decisions Made
- getUsersNearLimits uses subquery with WHERE filter on percentages rather than HAVING clause for cleaner SQL
- API key usage falls back to org-level aggregate labeled "Platform Key (shared)" when no PlatformApiKeyAssignment exists
- CSV export returns 400 for section=all to avoid overly complex combined CSV format
- Masked key in API key usage shows encrypted key prefix (since raw key not available without decryption)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Analytics backend ready for frontend dashboard components (Plan 03+)
- All 15 OANA requirements have corresponding service functions and API sections

---
*Phase: 06-org-admin-dashboard*
*Completed: 2026-03-05*
