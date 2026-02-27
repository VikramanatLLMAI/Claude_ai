---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-02-27T11:09:39.876Z"
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 13
  completed_plans: 13
---

---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in-progress
last_updated: "2026-02-27T10:59:01.000Z"
progress:
  total_phases: 7
  completed_phases: 3
  total_plans: 17
  completed_plans: 14
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** Organizations can securely deploy AI chat to their teams with full control over who can access what -- models, tools, settings, and conversations -- while maintaining complete data isolation between organizations.
**Current focus:** Phase 3: Chat Integration and Core RBAC

## Current Position

Phase: 4 of 7 (next phase)
Plan: 0 of ? in current phase
Status: Phase 3 complete, ready for Phase 4
Last activity: 2026-02-27 -- Completed 03-06-PLAN.md (Org MCP Management & User Custom Instructions)

Progress: [################----] 82%

## Performance Metrics

**Velocity:**
- Total plans completed: 14
- Average duration: 12 min
- Total execution time: 2.6 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 3 | 91 min | 30 min |
| 02 | 4 | 24 min | 6 min |
| 03 | 7 | 40 min | 6 min |

**Recent Trend:**
- Last 5 plans: 03-02 (5 min), 03-05 (3 min), 03-04 (6 min), 03-03 (5 min), 03-06 (7 min)
- Trend: Accelerating

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Fresh database start -- complete schema redesign, no migration from existing data
- [Roadmap]: Authorization enforced at API route handler level, not Next.js middleware (CVE-2025-29927)
- [Roadmap]: Tenant scoping via Prisma Client Extensions (auto-inject orgId), not PostgreSQL RLS
- [Roadmap]: Existing chat UI untouched -- RBAC through two new sidebar admin panels + 5 surgical integration points
- [01-01]: Added dotenv/config import to seed.ts for standalone tsx execution
- [01-01]: Kept User back-relations for data models (Prisma requires bidirectional relations)
- [01-01]: Added Invitation back-relation on Role model (Prisma FK requirement)
- [01-02]: Migrated user/anthropic routes from User.anthropicApiKeyEncrypted to PlatformApiKey model (field removed in schema rewrite)
- [01-02]: auth/me uses requireAuth (not requireOrgAuth) so it works for both Super Admins and org users
- [01-02]: Kept storage.ts deprecated functions rather than deleting to avoid breaking imports
- [01-02]: user/settings uses avatarBase64 matching new schema (not old avatarUrl)
- [01-03]: proxy.ts is pure URL rewriter -- zero auth/DB logic per CVE-2025-29927 defense-in-depth
- [01-03]: Find-org API uses 200ms constant-time response to prevent timing attacks on email existence
- [01-03]: Base64 logos use native <img> (next/image cannot optimize data URLs)
- [02-01]: Org creation uses Technical role for initial admin invitation (not a separate Org Admin role)
- [02-01]: Role template overrides stored in .data/role-templates.json (file-based, no schema change)
- [02-01]: Service layer pattern: all mutations in prisma.$transaction() with auditLog.record() co-located
- [02-01]: API route pattern: requireSuperAdmin -> Zod validate -> getIpAddress -> service fn -> error mapping
- [02-02]: Resend client is null (not empty string) when RESEND_API_KEY missing -- constructor throws on empty
- [02-02]: SAFE-02 admin check uses in-code permission check (not Prisma JSON filtering) for reliability
- [02-02]: Lazy expiry: overdue PENDING invitations batch-updated to EXPIRED on list query
- [02-02]: Org Admin API route pattern: requireOrgAdmin -> Zod validate -> getIpAddress -> service fn -> error mapping
- [02-03]: Registration stores session using llmatscale_auth_session key (matching org-login-page convention)
- [02-03]: avatarBase64 left null at registration -- existing chat UI renders initials from user name (UATH-03 resolved)
- [02-03]: Public auth endpoints use invitation token as authorization proof (no requireAuth needed)
- [02-03]: Server component validates token directly (no fetch to API) for faster rendering
- [02-04]: resolveOrgSlug tries page path regex first, then API path regex (order ensures no regression)
- [02-04]: Route handler logic unchanged -- slug consumed via URL by resolveOrgSlug, not from Next.js params
- [03-01]: Model table is platform-level (not org-scoped), uses raw prisma client not tenantDb
- [03-01]: Deprecation validation checks all roles across all orgs to prevent orphaned model assignments
- [03-01]: Cache pricing derived from standard Anthropic rates: write=1.25x input, read=0.1x input
- [03-01]: All model pricing stored as per-token Decimal(20,12) for financial precision
- [Phase 03]: AdminSidebar accepts variant prop (super-admin | org-admin) for reuse in Plan 04 Org Admin Console
- [Phase 03]: Model form displays prices as dollar/MTok and converts to per-token before API submission
- [Phase 03]: Admin layout bypasses sidebar for /admin/login path to avoid auth-guarded sidebar wrapping login page
- [03-05]: Model assignment uses raw prisma.$transaction (not tenantDb) for Role update by direct roleId
- [03-05]: RoleModelAssignment fetches from /api/admin/models (platform-level) since Model Registry is not org-scoped
- [03-05]: Per-section save pattern: model assignment and role settings saved independently with change detection
- [Phase 03-04]: Org Admin layout verifies admin access via org-scoped API call (not auth/me which lacks org context)
- [Phase 03-04]: Instructions stored as plain text -- sanitization happens at prompt composition time, not save time
- [Phase 03-04]: InstructionEditor component reusable for org/role/user instruction editing with configurable maxTokens
- [03-03]: UsageRecord uses tenantDb (not raw prisma) since it is in TENANT_SCOPED_MODELS
- [03-03]: Model thinking mode resolved from Model Registry thinkingType field instead of hardcoded arrays
- [03-03]: Org slug resolved from URL path for frontend API calls (getOrgSlugFromUrl helper)
- [03-03]: isOrgAdmin flag included in models API response to avoid extra API call for Admin Console visibility
- [03-06]: Org-managed MCP connections use userId=null to distinguish from personal connections
- [03-06]: MCP assignment types (org-wide vs role-specific) coexist on same McpConnection model via roleId
- [03-06]: Custom instructions saved via API when orgSlug available, localStorage fallback for non-org context
- [03-06]: InstructionEditor renders grayed-out with disabled message when role has customInstructionsEnabled=false

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: RESOLVED -- storage.ts functions deprecated; all API routes now use tenantDb from requireOrgAuth() for data isolation
- [Phase 3]: 4-layer prompt stack is a novel pattern -- token budget enforcement needs experimentation
- [Phase 5]: Recharts 3.x may need --legacy-peer-deps for React 19 compatibility

## Session Continuity

Last session: 2026-02-27
Stopped at: Completed 03-06-PLAN.md (Org MCP Management & User Custom Instructions) -- Phase 3 complete
Resume file: .planning/phases/03-chat-integration-and-core-rbac/03-06-SUMMARY.md
