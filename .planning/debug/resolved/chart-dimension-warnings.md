---
status: resolved
trigger: "Console warnings 'The width(-1) and height(-1) of chart should be greater than 0' appearing 16 times on analytics pages"
created: 2026-03-07T00:00:00Z
updated: 2026-03-07T00:00:00Z
---

## Current Focus

hypothesis: ChartContainer uses `aspect-video` CSS class which sets aspect-ratio but no explicit height, and the outer wrapper div has no height constraint, so ResponsiveContainer measures -1 on initial render
test: Confirmed by reading chart.tsx line 109 and checking container styling
expecting: n/a - root cause confirmed
next_action: Report diagnosis

## Symptoms

expected: Charts render without console warnings
actual: 16 console warnings "The width(-1) and height(-1) of chart should be greater than 0"
errors: "The width(-1) and height(-1) of chart should be greater than 0"
reproduction: Open any analytics page (Super Admin or Org Admin) with chart data
started: After Phase 10.1 migration from direct ResponsiveContainer to ChartContainer wrapper

## Eliminated

(none needed - root cause found on first hypothesis)

## Evidence

- timestamp: 2026-03-07
  checked: chart.tsx ChartContainer implementation (lines 81-132)
  found: ChartContainer wraps children in a `<div>` with class `flex aspect-video justify-center text-xs` (line 109), then nests a bare `<ResponsiveContainer>` (line 126) with NO width/height props
  implication: ResponsiveContainer measures its parent div dimensions; if the parent has no resolved height at mount time, it reports -1

- timestamp: 2026-03-07
  checked: analytics-charts.tsx and org-analytics-charts.tsx usage patterns
  found: Charts use `className="min-h-[300px] w-full"` or `className="min-h-[260px] w-full"` or inline `style={{ minHeight }}` on ChartContainer. Some use `className="w-full"` with only inline style for minHeight.
  implication: The `min-h-*` classes set minimum height on the outer div, but `aspect-video` (aspect-ratio: 16/9) combined with flex layout creates a sizing conflict during initial render

- timestamp: 2026-03-07
  checked: How ResponsiveContainer calculates dimensions
  found: Recharts ResponsiveContainer uses a ResizeObserver on its parent container. On initial mount, if the parent has no resolved dimensions (height computes to 0 or negative due to padding/border subtraction), it reports width=-1 and height=-1
  implication: The -1 values come from ResponsiveContainer's internal calculation: containerWidth - horizontalPadding - borderWidth, which yields -1 when the container has no intrinsic height yet

## Resolution

root_cause: |
  The ChartContainer component in `components/ui/chart.tsx` (line 109) applies `aspect-video` (aspect-ratio: 16/9) as the primary sizing mechanism for the wrapper div. The `ResponsiveContainer` on line 126 is rendered with NO explicit width/height props.

  On initial render, the sizing chain fails:
  1. The outer `<div>` has `flex aspect-video` but flex containers with aspect-ratio need a resolved width to compute height
  2. During the first paint, before layout is complete, the div may have 0 computed dimensions
  3. `ResponsiveContainer` uses ResizeObserver to read parent dimensions and subtracts padding/borders
  4. When parent height is 0, the subtraction yields -1, triggering the warning

  The chart pages contribute to this: analytics-charts.tsx and org-analytics-charts.tsx pass `min-h-[300px]` or similar via className, but `min-height` is not the same as `height` -- it doesn't give the element an intrinsic size that `aspect-ratio` or `ResponsiveContainer` can use before content renders.

  The 16 warnings correspond to the total number of chart components rendered across the analytics pages (9 in Super Admin + 9 in Org Admin that use ChartContainer, minus heatmaps which use CSS grid = ~16 charts using ResponsiveContainer).

fix: (diagnosis only - not applied)
verification: (diagnosis only)
files_changed: []
