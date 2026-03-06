---
phase: 08-schema-prompt-stack
plan: 01
subsystem: api
tags: [prisma, system-prompt, xml, restrictions, zod, anthropic]

# Dependency graph
requires:
  - phase: 03-chat-core
    provides: 4-layer prompt composition, instruction service, token counter
provides:
  - 6-layer XML-tagged prompt composition with restriction layers
  - OrgSettings.restrictionInstructions and Role.restrictionInstructions schema fields
  - saveOrgRestrictions and saveRoleRestrictions service functions
  - API endpoints for restriction CRUD
  - Chat route wired with restriction fields
affects: [08-02-restrictions-ui, 09-org-admin-ux]

# Tech tracking
tech-stack:
  added: []
  patterns: [character-based validation for restriction fields, override-prevention preamble pattern]

key-files:
  created: []
  modified:
    - prisma/schema.prisma
    - lib/services/system-prompt-service.ts
    - lib/services/instruction-service.ts
    - lib/token-counter.ts
    - lib/validation.ts
    - app/api/org/[slug]/admin/instructions/route.ts
    - app/api/org/[slug]/admin/roles/[roleId]/instructions/route.ts
    - app/api/chat/route.ts

key-decisions:
  - "Character-based validation for restrictions (not token-based) -- simpler, more predictable for admins"
  - "Override-prevention preamble is hardcoded constant, not admin-editable -- ensures consistent security framing"
  - "Both systemInstructions and restrictionInstructions can be sent in same PATCH request, validated independently"

patterns-established:
  - "Restriction layers use <org-restrictions> and <role-restrictions> XML tags with hardcoded preamble"
  - "CHAR_LIMITS constant in token-counter.ts for character-based field limits"
  - "validateCharacterLimit helper in instruction-service.ts for non-token validations"

requirements-completed: [PROMPT-01, PROMPT-04, PROMPT-05, PROMPT-06]

# Metrics
duration: 7min
completed: 2026-03-06
---

# Phase 8 Plan 1: Schema & Prompt Stack Summary

**6-layer XML-tagged system prompt with org/role restriction fields, override-prevention preamble, and backend CRUD via character-validated API endpoints**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-06T06:45:27Z
- **Completed:** 2026-03-06T06:52:09Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added 4 new schema fields (restrictionInstructions + maxLength on OrgSettings and Role)
- Extended prompt composition from 4 to 6 XML-tagged layers with conditional restriction sections
- Built restriction save/validate service functions with character-based limits and audit logging
- Wired restriction fields through API endpoints and chat route

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema + Service Layer** - `721dce8` (feat)
2. **Task 2: API endpoints + chat route wiring** - `eb31a81` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added restrictionInstructions and restrictionInstructionsMaxLength to OrgSettings (default 2000) and Role (default 1000)
- `lib/services/system-prompt-service.ts` - 6-layer composition with org-restrictions and role-restrictions XML tags
- `lib/services/instruction-service.ts` - saveOrgRestrictions, saveRoleRestrictions, validateCharacterLimit functions
- `lib/token-counter.ts` - CHAR_LIMITS export for restriction field limits
- `lib/validation.ts` - OrgRestrictionsSchema, RoleRestrictionsSchema Zod schemas with type exports
- `app/api/org/[slug]/admin/instructions/route.ts` - Extended GET/PATCH for restrictionInstructions
- `app/api/org/[slug]/admin/roles/[roleId]/instructions/route.ts` - Extended GET/PATCH for restrictionInstructions
- `app/api/chat/route.ts` - Passes orgRestrictions and roleRestrictions to composeSystemPrompt

## Decisions Made
- Character-based validation for restrictions (2000/1000 char limits) instead of token-based -- simpler and more predictable for admin users
- Override-prevention preamble is a hardcoded constant shared by both org and role restriction layers
- API endpoints accept both systemInstructions and restrictionInstructions in the same PATCH request, validating each independently

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing build error in untracked `app/api/enhance-prompt/route.ts` (maxTokens type error) -- not related to this plan's changes, not in scope
- `db:push` required `--accept-data-loss` flag due to existing partial unique index constraint on slug column -- no actual data loss, just Prisma warning

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Schema fields in place, Prisma client regenerated
- API endpoints ready for the restrictions UI (Plan 08-02)
- Chat route composing all 6 layers when restriction content is present
- Backward compatible: empty restrictions produce identical 4-layer output

---
*Phase: 08-schema-prompt-stack*
*Completed: 2026-03-06*
