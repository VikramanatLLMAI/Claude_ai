---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-03T06:35:11.197Z"
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 33
  completed_plans: 33
---

---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: in-progress
last_updated: "2026-03-03T06:20:16Z"
progress:
  total_phases: 7
  completed_phases: 4
  total_plans: 32
  completed_plans: 32
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-26)

**Core value:** Organizations can securely deploy AI chat to their teams with full control over who can access what -- models, tools, settings, and conversations -- while maintaining complete data isolation between organizations.
**Current focus:** Phase 4 complete: Role Configuration and Usage Limits

## Current Position

Phase: 4 of 7 (complete)
Plan: 11 of 11 in current phase (11 complete, 0 pending)
Status: Phase 4 complete -- all role configuration and usage limits plans done (including gap closures 04-10 and 04-11)
Last activity: 2026-03-03 -- Completed 04-11-PLAN.md (UsageBanner welcome-screen visibility and metric selection fixes)

Progress: [####################] 100%

## Performance Metrics

**Velocity:**
- Total plans completed: 32
- Average duration: 8 min
- Total execution time: 3.9 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01 | 3 | 91 min | 30 min |
| 02 | 4 | 24 min | 6 min |
| 03 | 7+7 | 65 min | 5 min |
| 04 | 10 | 52 min | 5 min |

**Recent Trend:**
- Last 5 plans: 04-05 (7 min), 04-07 (2 min), 04-09 (2 min), 04-08 (5 min), 04-11 (10 min)
- Trend: Stable

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
- [03-07]: Single permission addition (org_admin to Technical role) rather than creating separate Org Admin role -- consistent with decision [02-01]
- [03-08]: Org admin models endpoint returns raw Model objects (same shape as super-admin endpoint) for component compatibility
- [03-08]: RoleModelAssignment now fetches from /api/org/${slug}/admin/models instead of /api/admin/models (fixes 403 blocker)
- [03-08]: Toast and AlertDialog components follow existing Radix UI wrapper patterns (dialog.tsx, tooltip.tsx)
- [03-10]: Simplified SaveStatus to idle|saving since toast handles feedback (removed saved|error inline states)
- [03-10]: Dirty state uses value comparison (savedValue vs currentValue) not form library
- [03-10]: MCP min server count enforced on blur not onChange to allow natural typing
- [03-10]: Switch animation enhancement is duration-200 ease-in-out on existing transitions
- [03-11]: Breadcrumb wrapper included inside AdminBreadcrumb component (returns null on root, no empty div rendered)
- [03-11]: Coming Soon badge text shortened to 'Soon' for minimal visual weight with outline variant
- [03-11]: Admin dashboard reads org name from session synchronously (no extra API call)
- [03-09]: Extended PATCH endpoint schema for MCP connections to support authType, authCredentials, assignmentType, roleId (was limited to name/serverUrl/isActive)
- [03-09]: Extracted shared McpConnectionFormFields component for Add/Edit dialog reuse
- [03-09]: Edit dialog leaves credential fields empty (encrypted server-side) with hint to keep existing values
- [03-09]: Used existing DropdownMenu from Radix UI for styled role selector (consistent with codebase patterns)
- [03-13]: Top-level MCP empty state handled inside McpAssignmentPanel (owns connection data, avoids lifting state to page)
- [03-13]: AddOrgMcpDialog accepts defaultAssignmentType prop with useEffect sync on dialog open for CTA pre-selection
- [03-13]: Gear icon fix uses minimal pl-0.5 (2px) on SidebarMenuItem -- single class on 86KB file
- [03-12]: Timestamps only show after save in current session (not persisted across reloads)
- [03-12]: InstructionsPreview shows org + role layers only; info note explains platform + user layers also exist
- [03-12]: System role description fallbacks use hardcoded map for Technical/Business/Basic roles
- [03-14]: All 27 UAT items verified via automated Playwright tests plus code review for non-visual items
- [03-14]: Phase 3 declared complete with SaaS readiness quality bar met
- [03-15]: aria-labels added to MCP action buttons only, no Tooltip structure changes
- [03-15]: Navigation guard uses capture-phase click handler + popstate for comprehensive coverage
- [03-15]: SYSTEM_ROLE_DESCRIPTIONS is a display-only fallback, not a database change
- [04-01]: Usage service uses single aggregate query for both request count and token sum (performance optimization)
- [04-01]: checkOrgMonthlyCeiling uses the lower of org ceiling (Super Admin) and orgSettings limit (Org Admin) for enforcement
- [04-01]: Role service catches Prisma P2002 unique constraint error and maps to user-friendly message
- [04-01]: Session service uses raw prisma (not tenantDb) since Session is not org-scoped
- [04-01]: Password expiry check falls back to user.createdAt when passwordChangedAt is null
- [04-05]: OrgMember uses joinedAt field (not createdAt) for profile join date display
- [04-05]: Avatar processing done client-side with canvas (auto-crop, resize 200x200, JPEG 80%)
- [04-05]: Session revoke uses inline Confirm/Cancel buttons (not a dialog modal)
- [04-05]: Profile tab syncs name to General tab state when saved
- [04-03]: UsageBanner polls every 60 seconds with setInterval (lightweight single-aggregate endpoint)
- [04-03]: Warning dismissal tracks percentage at dismissal, re-shows if usage jumps 10%+ since dismissed
- [04-03]: Daily trend uses raw SQL DATE() grouping since Prisma groupBy lacks date truncation
- [04-03]: Per-user table sorts blocked > warning > normal > inactive for admin attention priority
- [04-03]: Force-logout button wired to 04-05 endpoint path (works once that plan completes)
- [04-04]: Auth middleware guard exempts /change-password, /logout, and /force-password-change paths
- [04-04]: Force password change page fetches policy from admin API with graceful 403 fallback to defaults
- [04-04]: Login route re-queries orgMember for forcePasswordChange after session creation (lightweight single-field select)
- [04-04]: Change-password endpoint validates against org policy before accepting new password
- [04-02]: RoleModelAssignment reused in modal with in-memory state (no per-section save in modal)
- [04-02]: MCP assignment noted in Models tab rather than duplicating panel in role modal
- [04-02]: SAFE-11 comments as forward-looking guard against relaxing ownership checks
- [04-02]: Modal CRUD pattern: read-only card grid + Dialog modal replaces inline editing
- [04-07]: Description pre-fill already working in role-form-modal.tsx -- no changes needed
- [04-07]: disabledPlaceholder as separate prop rather than overriding placeholder default
- [04-08]: Used body.slug fallback (not new route) to minimize code changes and match existing login route structure
- [04-08]: Module-level checkForcePasswordChange helper (not component callback) for reuse across FullChatApp and ChatContent
- [04-08]: FORCE_PASSWORD_CHANGE intercepted on fetchModels, fetchConversations, and conversation loading
- [04-09]: Created separate non-admin /password-policy endpoint (admin endpoint uses requireOrgAdmin, would fail for non-admin users)
- [04-09]: Added /password-policy to forcePasswordChange exempt paths for force-change users
- [04-09]: Session lastUsedAt tracked in both requireOrgAuth and requireAuth for comprehensive coverage
- [04-09]: validateSession now returns sessionId for downstream session tracking
- [04-10]: Session-based org fallback in requireOrgAuth uses prisma.session.findUnique(id) to get organizationId when resolveOrgSlug returns null -- fixes flat /api/* path 400 errors for org users
- [04-10]: UsageBanner always mounted when orgSlug set; CSS hidden class on wrapper suppresses visual output on welcome screen -- ensures onBlockedChange fires on first poll
- [04-10]: resolvedSlug = slug ?? orgMember.organization.slug for forcePasswordChange redirect handles both URL-slug and session-based resolution paths
- [04-11]: isWelcomeVisible && !usageBlocked as hidden gate -- blocked users see banner on welcome screen; unblocked users do not (no visual regression)
- [04-11]: reqPct >= tokPct tie-break for primaryStatus selection -- requests win when equal, maintaining prior behaviour; null metrics use -1 so any active metric wins
- [04-11]: isRequestBased uses identity comparison (primaryStatus === status.requestStatus) after percentage-based selection for consistency

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 1]: RESOLVED -- storage.ts functions deprecated; all API routes now use tenantDb from requireOrgAuth() for data isolation
- [Phase 3]: 4-layer prompt stack is a novel pattern -- token budget enforcement needs experimentation
- [Phase 4]: RESOLVED -- Recharts 3.x installed with --legacy-peer-deps for React 19 compatibility

## Session Continuity

Last session: 2026-03-03
Stopped at: Completed 04-11-PLAN.md (UsageBanner welcome-screen visibility and metric selection fixes) -- Phase 4 fully signed off
Resume file: .planning/phases/04-role-configuration-and-usage-limits/04-11-SUMMARY.md
