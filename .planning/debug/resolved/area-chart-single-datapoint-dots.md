---
status: resolved
trigger: "Area charts show only scattered dots with no area fill when there is a single data point"
created: 2026-03-07T00:00:00Z
updated: 2026-03-07T00:00:00Z
---

## Current Focus

hypothesis: Recharts Area component cannot render an area polygon from a single data point - it degenerates to a dot
test: Reviewed Area component props across all affected charts
expecting: Confirmation that no data padding or minimum-point handling exists
next_action: Report root cause

## Symptoms

expected: Area charts with a single date of data should show a visible filled area region
actual: Charts with only 1 data point show tiny scattered dots with no area fill
errors: None (visual rendering issue, not a crash)
reproduction: Filter analytics to a date range containing only 1 day of data
started: After Phase 10.1 migration to shadcn/ui chart wrappers

## Eliminated

(none needed - root cause identified on first hypothesis)

## Evidence

- timestamp: 2026-03-07
  checked: UsageTrendChart (analytics-charts.tsx lines 134-195)
  found: Area elements use type="monotone" with no special handling for single data points. No data padding logic.
  implication: With 1 data point, Recharts cannot draw a line or fill an area - it renders only a dot marker.

- timestamp: 2026-03-07
  checked: TokensByOrgChart (analytics-charts.tsx lines 205-273)
  found: Same pattern - Area with type="monotone", stackId="1", no padding for single-point data.
  implication: Same issue as UsageTrendChart.

- timestamp: 2026-03-07
  checked: OrgUsageTrendChart (org-analytics-charts.tsx lines 172-234)
  found: Identical Area config pattern. No data padding.
  implication: Org Admin variant has the same bug.

- timestamp: 2026-03-07
  checked: RegistrationTrendChart (analytics-charts.tsx lines 630-675)
  found: Same Area component pattern but user reports this chart "works fine" - likely because registration data naturally has 2+ data points in the queried range.
  implication: Confirms the issue is data-dependent (number of points), not a component configuration issue.

- timestamp: 2026-03-07
  checked: ChartContainer (chart.tsx lines 81-132)
  found: ChartContainer is a thin wrapper providing ResponsiveContainer + CSS variable injection. No data transformation or padding logic.
  implication: The wrapper does not contribute to or solve this issue.

## Resolution

root_cause: |
  Recharts Area component with type="monotone" requires at least 2 data points to render a visible line and filled area.
  With a single data point, the SVG path degenerates to a zero-length path (a single coordinate), so:
  - The stroke (line) has zero length and is invisible
  - The fill (area under the curve) has zero area and is invisible
  - Only the dot marker renders (if dots are not explicitly disabled)

  This is an inherent behavior of SVG path-based area/line charts - you cannot draw a line or enclose an area with a single point.

  None of the 6 affected area chart components (UsageTrendChart, TokensByOrgChart, McpUsageChart,
  OrgUsageTrendChart, OrgMcpUsageChart, plus RegistrationTrendChart when it has single-day data)
  have any logic to pad single-point data arrays with synthetic neighboring points.

fix: (not applied - diagnosis only)
verification: (not applicable)
files_changed: []
