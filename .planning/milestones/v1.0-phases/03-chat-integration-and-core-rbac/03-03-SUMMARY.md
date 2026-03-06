---
phase: 03-chat-integration-and-core-rbac
plan: 03
subsystem: api, chat, auth
tags: [rbac, system-prompt, xml-sanitization, model-registry, usage-tracking, mcp-filtering, admin-console]

# Dependency graph
requires:
  - phase: 03-01
    provides: "Model Registry service, prompt sanitizer, token counter"
  - phase: 01-02
    provides: "requireOrgAuth, tenantDb, OrgAuthContext"
provides:
  - "4-layer system prompt composition service (composeSystemPrompt)"
  - "Chat route RBAC: model validation, MCP filtering, usage tracking"
  - "Permitted models API (GET /api/org/[slug]/models)"
  - "Dynamic model selector in frontend (replaces hardcoded CLAUDE_MODELS)"
  - "Admin Console entry point in chat sidebar for Org Admins"
affects: [04-org-admin-console, 05-super-admin-dashboard, 06-analytics]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "4-layer XML-delimited prompt composition with sanitization"
    - "Model Registry as single source of truth for model capabilities"
    - "Role-based MCP tool filtering with org-wide + role + personal scopes"
    - "Per-request usage tracking with full token breakdown"

key-files:
  created:
    - "lib/services/system-prompt-service.ts"
    - "app/api/org/[slug]/models/route.ts"
  modified:
    - "app/api/chat/route.ts"
    - "components/full-chat-app.tsx"
    - "components/settings-modal.tsx"

key-decisions:
  - "UsageRecord uses tenantDb (not raw prisma) since it is in TENANT_SCOPED_MODELS"
  - "Model thinking mode resolved from Model Registry thinkingType field instead of hardcoded arrays"
  - "Org slug resolved from URL path for frontend API calls (getOrgSlugFromUrl helper)"
  - "isOrgAdmin flag included in models API response to avoid extra API call for Admin Console visibility"
  - "Permitted models passed as prop to SettingsModal to replace its own hardcoded CLAUDE_MODELS"

patterns-established:
  - "composeSystemPrompt: 4-layer XML prompt composition pattern for all chat requests"
  - "Model Registry lookup for model capabilities (replaces hardcoded arrays)"
  - "MCP authorization: org-wide + role-specific + personal (if enabled) filtering"

requirements-completed: [UCHAT-01, UCHAT-02, UCHAT-05, PRMT-01, PRMT-02, PRMT-03, PRMT-04, PRMT-05, PRMT-06, OLLM-02, SAFE-08]

# Metrics
duration: 7min
completed: 2026-02-27
---

# Phase 3 Plan 3: Chat Route RBAC Enforcement Summary

**RBAC-enforced chat with 4-layer XML-delimited system prompt, model access validation, MCP tool filtering, per-request usage tracking, dynamic model selector from Model Registry, and Admin Console entry point**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-27T10:41:15Z
- **Completed:** 2026-02-27T10:48:30Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Chat route validates model access against role.allowedModels with 403 rejection (UCHAT-01, OLLM-02)
- 4-layer system prompt composed with XML delimiters and sanitization of untrusted layers (PRMT-01 through PRMT-06)
- MCP tools filtered by authorization scope: org-wide + role-specific + personal if enabled (UCHAT-05)
- Per-request usage tracking with input/output/thinking/cache tokens and request duration (UCHAT-02)
- Custom instructions preserved in DB but excluded from prompt when role disables them (SAFE-08)
- Permitted models API endpoint serves as Model Registry source of truth (MODL-05)
- Frontend model selector dynamically fetches from API instead of using hardcoded CLAUDE_MODELS
- Admin Console button in sidebar footer visible only to Org Admins

## Task Commits

Each task was committed atomically:

1. **Task 1: 4-layer system prompt composition service** - `fe7da94` (feat)
2. **Task 2: Chat route RBAC enforcement** - `c3b81e0` (feat)
3. **Task 3: Permitted models endpoint, model selector wiring, Admin Console button** - `44a605b` (feat)

## Files Created/Modified

- `lib/services/system-prompt-service.ts` - 4-layer XML-delimited prompt composition with sanitization
- `app/api/chat/route.ts` - RBAC enforcement: model validation, MCP filtering, prompt composition, usage tracking
- `app/api/org/[slug]/models/route.ts` - Permitted models endpoint with isOrgAdmin flag
- `components/full-chat-app.tsx` - Dynamic model selector, Admin Console button, org context helpers
- `components/settings-modal.tsx` - Accepts permitted models prop instead of hardcoded list

## Decisions Made

- **UsageRecord scoping:** UsageRecord is in TENANT_SCOPED_MODELS, so use `tenantDb` for recording (auto-injects organizationId).
- **Model capabilities from registry:** Replaced hardcoded ADAPTIVE_THINKING_MODELS and MANUAL_THINKING_MODELS arrays with Model Registry lookup (modelInfo.thinkingType). Single source of truth.
- **Org slug from URL path:** Frontend extracts org slug from URL pathname (/org/:slug/...) for API calls. This works with dev path-based routing.
- **Admin flag in models response:** Included `isOrgAdmin` boolean in the models endpoint response so the frontend can show/hide the Admin Console button without an extra API call.
- **Fallback models during load:** While the models API is loading, the model selector shows a single fallback model (Claude 4.5 Sonnet) with "Loading models..." description.
- **Settings modal models:** Passed permitted models as an optional prop to SettingsModal, with internal fallback for backward compatibility.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Settings modal hardcoded models also needed replacement**
- **Found during:** Task 3 (Frontend model selector wiring)
- **Issue:** settings-modal.tsx had its own hardcoded CLAUDE_MODELS array for the default model dropdown
- **Fix:** Added `permittedModels` prop to SettingsModal, replaced hardcoded array with prop-based list
- **Files modified:** components/settings-modal.tsx, components/full-chat-app.tsx
- **Verification:** Lint passes, settings modal will show only permitted models
- **Committed in:** 44a605b (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential fix to prevent settings modal from showing unpermitted models. No scope creep.

## Issues Encountered

None

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Chat RBAC enforcement is live -- all subsequent plans can rely on model validation, prompt composition, and usage tracking
- Org Admin Console shell (Plan 04) can build on the Admin Console entry point added here
- Plans 04/05 need to add save-time token budget validation for org/role/user instructions (per CONTEXT.md)
- Plans 04/05 can use the `composeSystemPrompt` service as-is for prompt preview features

## Self-Check: PASSED

All 6 files verified present. All 3 task commits verified in git log.

---
*Phase: 03-chat-integration-and-core-rbac*
*Completed: 2026-02-27*
