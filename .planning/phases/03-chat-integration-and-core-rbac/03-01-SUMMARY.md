---
phase: 03-chat-integration-and-core-rbac
plan: 01
subsystem: database, api
tags: [prisma, postgresql, model-registry, prompt-sanitizer, token-counter, zod, crud-api]

# Dependency graph
requires:
  - phase: 01-schema-and-auth-foundation
    provides: "Prisma schema with User, Session, Organization, Role, UsageRecord, AuditLog models"
  - phase: 02-org-management
    provides: "audit-service.ts pattern, requireSuperAdmin middleware, org-service.ts pattern"
provides:
  - "Model table in database with pricing, capabilities, limits, and status fields"
  - "OnboardingAgreement table for UCHAT-06 acceptance tracking"
  - "UsageRecord with thinkingTokens, cacheCreationTokens, cacheReadTokens, conversationId"
  - "Role with personalMcpEnabled and personalMcpMaxCount fields"
  - "Model registry service (getAllModels, getModelsByIds, getModelsGroupedByGeneration, createModel, updateModel, deleteModel)"
  - "Super Admin CRUD API routes for model management"
  - "7 Claude models seeded with verified pricing"
  - "Token counter utility (estimateTokenCount, TOKEN_LIMITS, SERVER_MARGIN)"
  - "Prompt sanitizer utility (sanitizePromptLayer for XML injection prevention)"
  - "CreateModelSchema and UpdateModelSchema Zod validators"
affects: [03-02, 03-03, 03-04, 03-05, chat-integration, usage-tracking, model-filtering]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Platform-level model registry (not org-scoped, uses raw prisma client)"
    - "Deprecation validation (prevents roles from losing all active models)"
    - "Idempotent seed via prisma.model.upsert keyed on modelId"
    - "4-char/token estimation heuristic with 5% server margin"

key-files:
  created:
    - "lib/services/model-registry-service.ts"
    - "lib/token-counter.ts"
    - "lib/prompt-sanitizer.ts"
    - "app/api/admin/models/route.ts"
    - "app/api/admin/models/[id]/route.ts"
  modified:
    - "prisma/schema.prisma"
    - "prisma/seed.ts"
    - "lib/validation.ts"
    - "lib/tenant.ts"

key-decisions:
  - "Model table is platform-level (not org-scoped), uses raw prisma client not tenantDb"
  - "Deprecation validation checks all roles across all orgs to prevent orphaned model assignments"
  - "Cache pricing derived from standard Anthropic rates: write=1.25x input, read=0.1x input"
  - "All model pricing stored as per-token Decimal(20,12) for precision"

patterns-established:
  - "Model registry as single source of truth: service layer functions for all model queries"
  - "Deprecation over deletion: deleteModel checks role references, suggests deprecation if blocked"
  - "Shared utilities in lib/: token-counter.ts and prompt-sanitizer.ts for cross-plan reuse"

requirements-completed: [MODL-01, MODL-02, MODL-03, MODL-04, MODL-05, MODL-06, UCHAT-06, SAFE-07, SAFE-09]

# Metrics
duration: 7min
completed: 2026-02-27
---

# Phase 3 Plan 1: Model Registry, Schema Extensions, and Shared Utilities Summary

**Platform-level Model registry with 7 Claude models, Super Admin CRUD API, prompt sanitizer, token counter, and schema extensions for thinking tokens and personal MCP**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-27T10:28:37Z
- **Completed:** 2026-02-27T10:35:51Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Model table added to schema as platform-level registry with pricing (Decimal 20,12), capabilities, and status fields
- OnboardingAgreement table provides UCHAT-06 minimum backend foundation for org-level acceptance tracking
- Model registry service with CRUD, deprecation validation, and transactional audit logging
- Super Admin API routes for model management (GET/POST collection, GET/PATCH/DELETE individual)
- 7 Claude models seeded idempotently with verified pricing and capabilities
- Prompt sanitizer and token counter utilities ready for Wave 2 plans
- UsageRecord extended with granular thinking/cache token tracking
- Role extended with personal MCP configuration fields

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend schema with Model table, OnboardingAgreement table, UsageRecord fields, Role fields, and shared utilities** - `31fd78a` (feat)
2. **Task 2: Model registry service, CRUD API routes, and seed data** - `8006475` (feat)

## Files Created/Modified
- `prisma/schema.prisma` - Added Model table, OnboardingAgreement table, extended UsageRecord and Role
- `lib/services/model-registry-service.ts` - Model CRUD with audit logging and deprecation validation
- `lib/token-counter.ts` - Token estimation utility (estimateTokenCount, TOKEN_LIMITS, SERVER_MARGIN)
- `lib/prompt-sanitizer.ts` - XML injection prevention for untrusted prompt inputs
- `lib/validation.ts` - Added CreateModelSchema and UpdateModelSchema Zod validators
- `app/api/admin/models/route.ts` - Super Admin GET/POST model collection endpoints
- `app/api/admin/models/[id]/route.ts` - Super Admin GET/PATCH/DELETE single model endpoints
- `prisma/seed.ts` - Extended with idempotent upsert of all 7 Claude models
- `lib/tenant.ts` - Added OnboardingAgreement to TENANT_SCOPED_MODELS

## Decisions Made
- Model table is platform-level (not org-scoped) since models are shared across all organizations. Uses raw prisma client, not tenantDb.
- Deprecation validation checks all roles across all orgs via in-memory filtering of allowedModels JSON arrays, since Prisma does not support JSON array contains queries directly.
- Cache pricing derived from standard Anthropic rates (write=1.25x input, read=0.1x input) as specific cache pricing is not published per-model.
- All 7 models get supportsThinking: true since all Claude 4+ models support some form of thinking.
- Pricing stored as per-token Decimal(20,12) for financial precision (e.g., $5/MTok = 0.000005 per token).

## Deviations from Plan

None - plan executed exactly as written.

Note: Task 1 commit (`31fd78a`) includes some unrelated changes (admin sidebar layout) from a concurrent process. All Task 1 schema/utility changes are verified present in this commit.

## Issues Encountered
- Git index.lock file from concurrent process required manual removal before committing. Task 1 changes were captured in commit `31fd78a` by the concurrent process.
- `prisma db push` required `--accept-data-loss` flag due to unique constraint addition on organizations.slug (pre-existing schema refinement, no actual data loss).

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Model registry is ready for model filtering (Plan 03), model assignment UI (Plans 02, 05), and usage cost calculation
- Token counter and prompt sanitizer utilities are available for import by Wave 2 plans
- OnboardingAgreement model is ready for Phase 7 onboarding UI implementation
- Role personalMcp fields ready for MCP management in Plan 04

## Self-Check: PASSED

All 9 files verified present. Both commit hashes (31fd78a, 8006475) verified in git log.

---
*Phase: 03-chat-integration-and-core-rbac*
*Completed: 2026-02-27*
