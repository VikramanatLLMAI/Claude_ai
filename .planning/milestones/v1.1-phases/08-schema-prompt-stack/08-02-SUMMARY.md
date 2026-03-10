---
phase: 08-schema-prompt-stack
plan: 02
subsystem: ui
tags: [react, lucide, ai-sdk, anthropic, haiku, textarea, restrictions, enhance]

# Dependency graph
requires:
  - phase: 08-01
    provides: "Schema fields for restrictionInstructions, 6-layer prompt composition, restriction save service functions, API endpoint extensions"
provides:
  - "Restriction textarea UI on Instructions admin page (org-wide and per-role)"
  - "AI-powered Enhance button on all prompt editing surfaces"
  - "POST /api/enhance-prompt endpoint using Haiku 4.5"
affects: [09-ui-ux, 10-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Collapsible restriction sections with auto-expand on content load"
    - "AI enhancement flow: Enhance button -> loading overlay -> Revert button"
    - "Character-based limits for restriction fields (vs token-based for instructions)"

key-files:
  created:
    - app/api/enhance-prompt/route.ts
  modified:
    - app/org/[slug]/admin/instructions/page.tsx
    - app/super-admin/system-prompt/page.tsx

key-decisions:
  - "Used maxOutputTokens instead of maxTokens for AI SDK v6 compatibility"
  - "Restriction textareas use raw textarea with character count rather than InstructionEditor with token count"
  - "Enhance button disabled globally when any field is being enhanced to prevent concurrent calls"

patterns-established:
  - "Enhance/Revert pattern: store original text, POST to /api/enhance-prompt, replace, offer Revert"
  - "Loading overlay on textarea during async operations (semi-transparent backdrop with spinner)"

requirements-completed: [PROMPT-02, PROMPT-03]

# Metrics
duration: 10min
completed: 2026-03-06
---

# Phase 8 Plan 02: Restriction UI & Enhance Button Summary

**Collapsible restriction textareas with character limits and AI-powered Enhance button across all 5 prompt editing surfaces**

## Performance

- **Duration:** 10 min
- **Started:** 2026-03-06T06:46:45Z
- **Completed:** 2026-03-06T06:56:45Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- Added collapsible org-wide restriction textarea with 2000 character limit and color-coded counter
- Added collapsible per-role restriction textareas with 1000 character limit per role
- Restriction sections auto-expand when existing content is loaded from the API
- Created POST /api/enhance-prompt endpoint that calls Haiku 4.5 with type-specific system prompts
- Added Enhance button to org instructions, org restrictions, role instructions, role restrictions, and platform system prompt
- Revert button restores original text after AI enhancement
- Textarea shows loading overlay (spinner + backdrop) during enhancement
- Dirty tracking includes restriction fields in beforeunload warning

## Task Commits

Each task was committed atomically:

1. **Task 1: Enhance API endpoint + Instructions page with restrictions and Enhance buttons** - `34c988b` (feat)

## Files Created/Modified
- `app/api/enhance-prompt/route.ts` - POST endpoint for AI prompt enhancement using Haiku 4.5, with auth (Super Admin for platform, basic auth for others)
- `app/org/[slug]/admin/instructions/page.tsx` - Added restriction textareas (org + per-role), Enhance/Revert buttons on all prompt fields, character counting, collapsible sections
- `app/super-admin/system-prompt/page.tsx` - Added Enhance/Revert button to platform system prompt editor

## Decisions Made
- Used `maxOutputTokens` instead of `maxTokens` for AI SDK v6.x compatibility (discovered via build error)
- Restriction textareas use raw `<textarea>` elements with character counting instead of the `InstructionEditor` component (which uses token counting) -- restrictions are character-limited, not token-limited
- Enhance button is globally disabled when any field is being enhanced to prevent concurrent API calls
- Role restriction data is fetched individually per role via the role instructions endpoint (includes `restrictionInstructions` field)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed maxTokens to maxOutputTokens for AI SDK v6**
- **Found during:** Task 1 (Build verification)
- **Issue:** AI SDK v6 uses `maxOutputTokens` instead of `maxTokens` in `generateText()` call settings
- **Fix:** Changed property name in enhance-prompt route
- **Files modified:** app/api/enhance-prompt/route.ts
- **Verification:** Build passes
- **Committed in:** 34c988b (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor API naming difference. No scope creep.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 prompt editing surfaces now have Enhance capability
- Restriction UI is functional for org and role levels
- Ready for Phase 9 (UI/UX improvements)

---
*Phase: 08-schema-prompt-stack*
*Completed: 2026-03-06*
