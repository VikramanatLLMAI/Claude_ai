---
phase: 10-prompt-suggestions-login-polish-chat-welcome
plan: 01
subsystem: api, database
tags: [prisma, login-branding, prompt-suggestions, lucide-icons, zod]

requires:
  - phase: 01-schema-auth-foundation
    provides: Prisma schema, Organization model, Role model
  - phase: 09-admin-ui-overhaul
    provides: Admin sidebar, role CRUD endpoints

provides:
  - LoginBranding schema model with headline, badge, description, feature cards
  - Role.promptSuggestions JSON field for per-role suggestion chips
  - GET/PUT /api/org/[slug]/admin/branding endpoint
  - Role CRUD endpoints accept and persist promptSuggestions
  - GET /api/org/[slug]/models includes promptSuggestions from role
  - Icon map utility with 31 curated Lucide icons
  - Branding nav item in org admin sidebar

affects: [10-02-welcome-screen, 10-03-login-redesign]

tech-stack:
  added: []
  patterns:
    - "Icon map pattern: string name -> LucideIcon component mapping with fallback"
    - "LoginBranding: separate model from OrgSettings for structured feature cards"

key-files:
  created:
    - prisma/schema.prisma (LoginBranding model)
    - lib/services/login-branding-service.ts
    - lib/icon-map.ts
    - app/api/org/[slug]/admin/branding/route.ts
  modified:
    - prisma/schema.prisma (Role.promptSuggestions)
    - lib/services/role-service.ts
    - app/api/org/[slug]/admin/roles/route.ts
    - app/api/org/[slug]/admin/roles/[roleId]/route.ts
    - app/api/org/[slug]/models/route.ts
    - components/admin/admin-sidebar.tsx

key-decisions:
  - "LoginBranding as separate model (not OrgSettings fields) for structured feature card JSON"
  - "Icon map uses string names for DB storage, resolved to components at render time"
  - "Max 4 prompt suggestions per role, max 4 feature cards per login branding"

patterns-established:
  - "Icon map pattern: SUGGESTION_ICONS/FEATURE_CARD_ICONS + getIcon() fallback"

requirements-completed: [SUGG-01, SUGG-04, LOGIN-02, LOGIN-03]

duration: 4min
completed: 2026-03-07
---

# Phase 10 Plan 01: Schema + Services + API Summary

**LoginBranding model, Role.promptSuggestions field, branding API endpoint, icon map utility, and models endpoint extended with prompt suggestions**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-07T08:03:02Z
- **Completed:** 2026-03-07T08:07:24Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- LoginBranding model added to schema with headline, badge, description, and feature cards fields
- Role.promptSuggestions JSON field enables per-role suggestion chips for chat welcome screen
- Full CRUD API for login branding with Zod validation (max 4 feature cards, field length limits)
- Models endpoint now serves prompt suggestions to chat frontend
- Icon map provides 31 curated Lucide icons with string-to-component resolution and fallback

## Task Commits

Each task was committed atomically:

1. **Task 1: Schema + Services + Icon Map** - `d76145d` (feat)
2. **Task 2: API Endpoints + Sidebar Link** - `6ab9539` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added LoginBranding model and Role.promptSuggestions field
- `lib/services/login-branding-service.ts` - getLoginBranding/upsertLoginBranding CRUD
- `lib/icon-map.ts` - 31 Lucide icons, PromptSuggestion/FeatureCard types, getIcon/getIconNames
- `app/api/org/[slug]/admin/branding/route.ts` - GET/PUT branding endpoint with Zod validation
- `app/api/org/[slug]/admin/roles/route.ts` - Added promptSuggestions to create schema and handler
- `app/api/org/[slug]/admin/roles/[roleId]/route.ts` - Added promptSuggestions to update schema and handler
- `app/api/org/[slug]/models/route.ts` - Added promptSuggestions to response
- `lib/services/role-service.ts` - Added promptSuggestions to CreateRoleInput/UpdateRoleInput and persistence
- `components/admin/admin-sidebar.tsx` - Added Branding nav item to Settings group

## Decisions Made
- LoginBranding stored as separate model rather than adding more fields to OrgSettings, because feature cards need structured JSON array storage
- Icon map uses string names stored in database, resolved to Lucide components at render time via getIcon()
- Maximum 4 prompt suggestions per role and 4 feature cards per branding to keep UI clean

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- db:push warned about potential data loss on slug unique constraint (pre-existing partial index); accepted with --accept-data-loss flag (no actual data affected)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Schema and API contracts ready for plan 02 (welcome screen) and plan 03 (login redesign)
- Models endpoint provides promptSuggestions for frontend consumption
- Branding API ready for admin UI in plan 03

---
*Phase: 10-prompt-suggestions-login-polish-chat-welcome*
*Completed: 2026-03-07*
