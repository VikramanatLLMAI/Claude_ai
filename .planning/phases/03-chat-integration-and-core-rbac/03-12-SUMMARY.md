---
phase: 03-chat-integration-and-core-rbac
plan: 12
subsystem: ui
tags: [react, instructions, timestamps, collapsible, token-counter, admin-console]

requires:
  - phase: 03-04
    provides: "Instructions page with InstructionEditor component"
  - phase: 03-08
    provides: "UI infrastructure (Toast, Skeleton loaders)"
  - phase: 03-10
    provides: "InstructionEditor with auto-grow, Ctrl+S, tooltip, placeholder prop"
provides:
  - "InstructionsPreview component for combined org + role instruction preview"
  - "Last-saved timestamps on instruction editors"
  - "Enhanced empty states for zero-roles scenario"
  - "Context-specific placeholder text per editor type"
  - "System role description fallbacks on role cards"
affects: [admin-console, instructions, roles]

tech-stack:
  added: []
  patterns:
    - "Collapsible preview panel pattern for admin content preview"
    - "Relative timestamp display with 30s auto-refresh via setInterval"
    - "System role description fallback map for consistent UX"

key-files:
  created:
    - "components/admin/instructions-preview.tsx"
  modified:
    - "app/org/[slug]/admin/instructions/page.tsx"
    - "app/org/[slug]/admin/roles/page.tsx"

key-decisions:
  - "Timestamps only appear after save (not 'never saved' text), matching plan spec"
  - "InstructionsPreview shows org + role layers only; info note explains platform + user layers exist"
  - "System role descriptions use hardcoded fallback map (Technical, Business, Basic)"

patterns-established:
  - "Collapsible preview: Radix Collapsible with button trigger, defaults collapsed"

requirements-completed: [UCHAT-02, PRMT-01, PRMT-04, PRMT-06, SAFE-07]

duration: 11min
completed: 2026-02-28
---

# Phase 03 Plan 12: Instructions Polish and Preview Summary

**Last-saved timestamps, context-specific placeholders, enhanced empty states, role card metadata, and collapsible combined instructions preview panel**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-28T00:33:07Z
- **Completed:** 2026-02-28T00:44:58Z
- **Tasks:** 2
- **Files modified:** 3 (+ 1 created)

## Accomplishments
- Added relative-time last-saved timestamps that auto-update every 30 seconds
- Created InstructionsPreview component showing combined org + role instructions with token counts
- Enhanced empty states with illustration icons and helpful CTAs
- Added context-specific placeholder text for org and role instruction editors
- Added system role description fallbacks and "No members" display on role cards

## Task Commits

Each task was committed atomically:

1. **Task 1: Add last-saved timestamps, enhanced empty states, and role card metadata** - `8216eef` (feat)
2. **Task 2: Create combined instructions preview panel** - `f43ec1b` (feat)

## Files Created/Modified
- `components/admin/instructions-preview.tsx` - New collapsible preview component showing merged org + role instructions with combined token count
- `app/org/[slug]/admin/instructions/page.tsx` - Added timestamps, placeholders, empty states, and InstructionsPreview wiring
- `app/org/[slug]/admin/roles/page.tsx` - Added system role description fallbacks and "No members" display

## Decisions Made
- Timestamps only appear after a successful save in the current session (not persisted across page reloads), matching plan spec of "if never saved in this session, show nothing"
- InstructionsPreview intentionally excludes platform prompt and user custom instructions since those are not admin-configurable; info note clarifies this
- System role description fallbacks use a hardcoded map for the three standard roles (Technical, Business, Basic), with "Custom role" as fallback for non-system roles without descriptions

## Deviations from Plan

None - plan executed exactly as written. The linter auto-applied some improvements (toast-based save feedback, dirty state tracking with amber dot indicator, beforeunload warning) which were compatible with the plan's additions.

## Issues Encountered
- Aggressive file-save linter hook repeatedly reverted incremental edits; resolved by using targeted edit operations that the linter accepted

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Instructions page now has full polish: timestamps, previews, placeholders, empty states
- Role cards display descriptions and member counts with proper fallbacks
- Ready for remaining gap closure plans (03-13, 03-14)

---
*Phase: 03-chat-integration-and-core-rbac*
*Completed: 2026-02-28*
