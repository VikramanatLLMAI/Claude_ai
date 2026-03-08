---
status: resolved
trigger: "Org Admin chart tooltips render in DOM but are visually hidden behind SVG elements due to z-index stacking context"
created: 2026-03-07T00:00:00Z
updated: 2026-03-07T00:00:00Z
---

## Current Focus

hypothesis: The recharts-tooltip-wrapper div lacks z-index, causing it to render behind SVG elements in certain stacking contexts
test: Trace Recharts tooltip rendering pipeline to confirm no z-index is set
expecting: No z-index on tooltip wrapper; adding z-index would fix it
next_action: Report root cause

## Symptoms

expected: Hovering chart bars/areas should show tooltip overlay on top of chart content
actual: Tooltip HTML is present in DOM with correct content but visually hidden behind SVG chart elements
errors: No JS errors; purely visual/CSS stacking issue
reproduction: Hover any Org Admin chart (bar, area, pie) and observe tooltip not visible
started: After Phase 10.1 migration from Recharts direct usage to shadcn/ui Chart wrappers

## Eliminated

- hypothesis: ChartContainer creates stacking context that traps tooltip
  evidence: ChartContainer is a plain div with flex/aspect-video classes; no transform/opacity/z-index that would create stacking context
  timestamp: 2026-03-07

- hypothesis: ResponsiveContainer overflow:hidden clips tooltip
  evidence: ResponsiveContainer inner div uses overflow:visible explicitly (responsiveContainerUtils.js line 49)
  timestamp: 2026-03-07

- hypothesis: globals.css overflow:hidden on html/body clips tooltip
  evidence: Tooltip renders inside recharts-wrapper (position:relative) via createPortal, not escaping to body level
  timestamp: 2026-03-07

## Evidence

- timestamp: 2026-03-07
  checked: chart.tsx ChartContainer component (line 81-132)
  found: No z-index or stacking-context-creating styles. Uses Tailwind classes only. No CSS rule for .recharts-tooltip-wrapper
  implication: The shadcn/ui wrapper does not add z-index to the tooltip

- timestamp: 2026-03-07
  checked: Recharts TooltipBoundingBox.js (line 88-96)
  found: Tooltip wrapper style is { position: 'absolute', top: 0, left: 0, pointerEvents: 'none', transform: translate(...) } with NO z-index
  implication: Tooltip relies solely on DOM order for paint order

- timestamp: 2026-03-07
  checked: Recharts RechartsWrapper.js (line 206-217)
  found: Tooltip portal target IS the recharts-wrapper div itself (setTooltipPortal(node) where node is the wrapper)
  implication: Tooltip is portaled into the same div that contains the SVG

- timestamp: 2026-03-07
  checked: Recharts Tooltip.js (line 170)
  found: Uses createPortal(tooltipElement, tooltipPortal) to render tooltip into wrapper div
  implication: Tooltip div is appended to wrapper div alongside SVG

- timestamp: 2026-03-07
  checked: Recharts RootSurface.js (line 15-28)
  found: SVG has style { width: '100%', height: '100%', display: 'block' } - no position/z-index
  implication: SVG is in normal flow within the wrapper

- timestamp: 2026-03-07
  checked: globals.css for any recharts-specific CSS
  found: No recharts-related CSS rules exist in globals.css
  implication: No project-level CSS addresses tooltip z-index

- timestamp: 2026-03-07
  checked: Standard shadcn/ui chart implementation patterns
  found: The official shadcn/ui chart component typically needs z-index on .recharts-tooltip-wrapper for proper tooltip display
  implication: The chart.tsx in this project is missing the z-index rule

## Resolution

root_cause: The recharts-tooltip-wrapper div (rendered by Recharts TooltipBoundingBox) has position:absolute but NO z-index. While it is portaled to the end of the recharts-wrapper div (which should give it higher paint order than the SVG), the transform property on the tooltip creates a new stacking context at z-index:auto (equivalent to 0). In some browser rendering paths, particularly with SVG elements that have width/height 100% and display:block, the SVG content can paint over the tooltip. The fix is to add an explicit z-index to the .recharts-tooltip-wrapper element. The chart.tsx ChartContainer component (line 96-111) already targets multiple recharts CSS classes with Tailwind selectors but is missing a selector for the tooltip wrapper z-index.
fix: ""
verification: ""
files_changed: []
