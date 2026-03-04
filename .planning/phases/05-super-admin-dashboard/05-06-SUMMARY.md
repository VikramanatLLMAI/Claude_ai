---
phase: 05
plan: 06
subsystem: super-admin-analytics
tags: [analytics, recharts, dashboard, kpi, charts, platform-monitoring]
dependency_graph:
  requires: [05-01, 05-03]
  provides: [analytics-service, analytics-api, analytics-page, kpi-card, chart-components]
  affects: [super-admin-layout, super-admin-sidebar]
tech_stack:
  added: []
  patterns: [raw-sql-aggregations, section-based-api-loading, recharts-v3, css-grid-heatmap]
key_files:
  created:
    - lib/services/platform-analytics-service.ts
    - app/api/super-admin/analytics/route.ts
    - components/admin/analytics-charts.tsx
    - components/admin/kpi-card.tsx
    - app/super-admin/analytics/page.tsx
  modified: []
decisions:
  - "Recharts v3 Tooltip formatter types use `as any` cast — Recharts types are stricter than runtime allows, established pattern for React 19 compatibility"
  - "Conversation groupBy uses cast to avoid Prisma 7 strict return type inference in conditional branch"
  - "PeakUsageHeatmap uses CSS grid instead of Recharts — no native heatmap in Recharts library"
  - "Analytics API supports section-based loading (kpi, trends, topOrgs, etc.) for frontend performance"
  - "Error rate returns empty array when no errorType in message metadata — non-breaking, populates as errors occur"
metrics:
  duration: "25 min"
  completed: "2026-03-04"
  tasks_completed: 2
  files_created: 5
  files_modified: 1
---

# Phase 5 Plan 6: Platform Analytics Dashboard Summary

**One-liner:** Full analytics dashboard with 13 raw SQL queries, 9 Recharts chart types, KPI cards, and time range controls covering all 12 SANA requirements.

## What Was Built

### Task 1: Analytics Service Layer and API Endpoint (ea2bbb1, 10de65f)

**`lib/services/platform-analytics-service.ts`** — Platform analytics aggregation service with 9 functions:

- `getKpiSummary()` — Orgs, users, conversations, messages, tokens (SANA-01 to SANA-03)
- `getUsageTrends(start, end)` — Daily input/output/thinking tokens via raw SQL DATE() grouping (SANA-05)
- `getTokensByOrgModel(start, end)` — Daily tokens per org+model for stacked charts (SANA-04)
- `getTopOrgsByUsage(start, end, limit=10)` — Top N orgs by token consumption with conv counts (SANA-06)
- `getErrorRates(start, end)` — Message metadata errorType distribution (SANA-07)
- `getPeakUsageHours(start, end)` — EXTRACT(HOUR/DOW) heatmap data (SANA-08)
- `getApiKeyConsumption(start, end)` — PlatformApiKey usage attribution per org (SANA-09)
- `getMcpUsageTrends(start, end)` — Messages with role='tool' over time (SANA-10)
- `getRegistrationTrends(start, end)` — New org/user registrations per day (SANA-11)
- `getFeatureAdoption(start, end)` — % of orgs using MCP, Artifacts, Thinking, File uploads (SANA-12)

All date-grouped queries use `prisma.$queryRaw` with `DATE()` or `EXTRACT()` (consistent pattern from Phase 4 usage-service.ts). 13 total raw SQL calls.

**`app/api/super-admin/analytics/route.ts`** — GET endpoint supporting:
- Required: `startDate`, `endDate` (ISO strings)
- Optional: `section` = kpi | trends | topOrgs | errors | peakHours | apiKeys | mcp | registrations | adoption | all
- Section-based loading: frontend can fetch KPI cards fast first, then charts in parallel
- Full auth via `requireSuperAdmin(req)`

**`components/admin/kpi-card.tsx`** — Reusable KPI summary card:
- Props: title, value, subtitle, icon (LucideIcon), optional trend { value, positive }
- Renders: icon top-right, large bold value, muted subtitle, green/red trend indicator

### Task 2: Analytics Dashboard Page with Recharts (a3df6fe)

**`components/admin/analytics-charts.tsx`** — 9 chart components using recharts v3.7.0:

| Component | Type | SANA |
|-----------|------|------|
| `UsageTrendChart` | Stacked AreaChart (input/output/thinking) | SANA-05 |
| `TokensByOrgChart` | Stacked AreaChart per org (dynamic series) | SANA-04 |
| `TopOrgsChart` | Horizontal BarChart sorted by tokens | SANA-06 |
| `ErrorRateChart` | Donut PieChart with % labels | SANA-07 |
| `PeakUsageHeatmap` | CSS grid 24x7 with green intensity scale | SANA-08 |
| `ApiKeyConsumptionChart` | Horizontal BarChart by key name | SANA-09 |
| `McpUsageChart` | AreaChart for tool invocations | SANA-10 |
| `RegistrationTrendChart` | AreaChart for new orgs + users | SANA-11 |
| `FeatureAdoptionChart` | Horizontal BarChart with % scale | SANA-12 |

All charts wrapped in Card components, with empty state handling.

**`app/super-admin/analytics/page.tsx`** — Full analytics dashboard:
- Page header with title, preset buttons (7d/30d/90d/1y), custom date picker, Refresh button
- 4 KPI summary cards (Orgs, Users, Conversations, Tokens)
- 9 chart sections in scrollable layout with per-section skeleton loaders
- `fetchData(range)` with `section=all` — loads everything in one request
- Error handling: error banner if fetch fails, sections show empty states gracefully

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Recharts v3 Tooltip formatter type incompatibility**
- **Found during:** Task 2 TypeScript check
- **Issue:** Recharts v3 has strict TypeScript types for `formatter` and `labelFormatter` props on `<Tooltip>` that are incompatible with standard `(value, name) => [...]` signatures
- **Fix:** Added `as any` casts on formatter props (9 occurrences) + `/* eslint-disable @typescript-eslint/no-explicit-any */` at file top
- **Files modified:** `components/admin/analytics-charts.tsx`
- **Commit:** 10de65f (included in analytics-charts.tsx)

**2. [Rule 1 - Bug] Prisma 7 groupBy type inference in conditional branch**
- **Found during:** Task 1 TypeScript check
- **Issue:** `prisma.conversation.groupBy()` inside an `if (orgIds.length > 0)` block fails type inference due to Prisma 7's strict conditional return types
- **Fix:** Cast via `(prisma.conversation.groupBy as any)(...)` with explicit return type cast
- **Files modified:** `lib/services/platform-analytics-service.ts`
- **Commit:** 10de65f

## Self-Check: PASSED

All created files verified:
- FOUND: `lib/services/platform-analytics-service.ts`
- FOUND: `app/api/super-admin/analytics/route.ts`
- FOUND: `components/admin/kpi-card.tsx`
- FOUND: `app/super-admin/analytics/page.tsx`
- FOUND: `components/admin/analytics-charts.tsx`

All commits verified:
- FOUND: ea2bbb1 (analytics service, API endpoint, KPI card)
- FOUND: a3df6fe (analytics dashboard page and chart components)
- FOUND: 10de65f (TypeScript groupBy fix)
