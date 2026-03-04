# Roadmap: LLMatscale.ai RBAC Multi-Tenant Platform

## Overview

This roadmap transforms LLMatscale.ai from a single-user AI chat application into a multi-tenant RBAC platform. The build order is dependency-driven: schema and auth foundation first (everything depends on the data model), then organization management and invitations (users must exist before they can do anything), then chat integration with RBAC enforcement (the core value), then role configuration and usage controls (enterprise features), then the two admin dashboards with analytics (visualize data from earlier phases), and finally theming, branding, and compliance features (refinements on a working system). Every phase delivers a coherent, verifiable capability. The existing chat UI is preserved untouched -- RBAC layers alongside it through two new sidebar-based admin panels and surgical integration points.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Schema and Auth Foundation** - Multi-tenant database schema, tenant-scoped Prisma client, enriched auth middleware, routing infrastructure
- [ ] **Phase 2: Organization Management and Invitations** - Org CRUD, system role templates, invitation flow via Resend, user registration, audit logging foundation
- [x] **Phase 3: Chat Integration and Core RBAC** - Role-filtered model access, 4-layer prompt stack, usage tracking, MCP role assignment, org-scoped conversations
- [x] **Phase 4: Role Configuration and Usage Limits** - Custom roles, per-role limits, password policy, session management, usage enforcement with alerts
- [ ] **Phase 5: Super Admin Dashboard** - Platform admin panel at admin.llmatscale.ai with org management, API keys, analytics, and audit logs
- [ ] **Phase 6: Org Admin Dashboard** - Org admin panel at {org-slug}.llmatscale.ai/admin with user/role management, org analytics, and audit logs
- [ ] **Phase 7: Theming, Branding, and Compliance** - Theme assignment and fallback, org branding, conversation visibility, user impersonation, scheduled tasks

## Phase Details

### Phase 1: Schema and Auth Foundation
**Goal**: The multi-tenant data model exists and every database query is automatically scoped to the correct organization, with enriched auth context available on every request
**Depends on**: Nothing (first phase)
**Requirements**: SCHEMA-01, SCHEMA-02, SCHEMA-03, SCHEMA-04, SCHEMA-05, SCHEMA-06, AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06, AUTH-07, ROUTE-01, ROUTE-02, ROUTE-03, ROUTE-04, ROUTE-05, SAFE-03, SAFE-06
**Success Criteria** (what must be TRUE):
  1. Running `npx prisma db push` creates all RBAC tables (Organization, OrgMember, Role, Invitation, AuditLog, UsageRecord, PlatformApiKey, PasswordPolicy, OrgThemeAssignment, OrgSettings) alongside updated existing tables with organizationId columns
  2. The Super Admin seed script creates a Super Admin account from the CLI and that account can authenticate successfully
  3. API requests to org-scoped routes return 403 unless the session carries valid org membership and role context
  4. API requests to platform routes return 403 unless the session belongs to a Super Admin
  5. Subdomain routing resolves admin.llmatscale.ai to the Super Admin context and {org-slug}.llmatscale.ai to the correct organization context
**Plans**: 3 plans in 2 waves

Plans:
- [ ] 01-01-PLAN.md -- Schema rewrite, Prisma 7.4 upgrade, tenant-scoped client, seed script (Wave 1)
- [ ] 01-02-PLAN.md -- Auth middleware (requireOrgAuth/requireSuperAdmin), org context resolution, API route migration (Wave 2)
- [ ] 01-03-PLAN.md -- Routing infrastructure (proxy.ts), org-scoped pages, bare domain helper, org login (Wave 2)

### Phase 2: Organization Management and Invitations
**Goal**: Super Admin can create organizations, system role templates exist, and users can be invited to and join organizations through a complete email-based invitation flow
**Depends on**: Phase 1
**Requirements**: SORG-01, SORG-02, SORG-03, SORG-04, SORG-05, SORG-06, SORG-07, SUSR-01, SUSR-02, SUSR-03, SUSR-04, STPL-01, STPL-02, STPL-03, OUSR-01, OUSR-09, ODEF-01, ODEF-02, UATH-01, UATH-02, UATH-03, UATH-04, SAFE-01, SAFE-02, SAFE-04, SAFE-05
**Success Criteria** (what must be TRUE):
  1. Super Admin can create an organization with name and slug, and that org appears in the org list with correct status
  2. Super Admin can suspend and reactivate an organization, and all users in that org lose and regain access accordingly
  3. Org Admin can invite a user by email, the user receives an invitation email via Resend, and can register through the acceptance link
  4. System role templates (Technical, Business, Basic) exist in every new organization and Super Admin can view and edit the templates
  5. Safety rules are enforced: cannot delete self, must maintain at least 1 Org Admin per org and 1 Super Admin platform-wide
**Plans**: 4 plans in 2 waves

Plans:
- [ ] 02-01-PLAN.md -- Shared foundation (audit service, role templates, validation schemas) + org CRUD + Super Admin CRUD + role template APIs (Wave 1)
- [ ] 02-02-PLAN.md -- Email infrastructure (Resend + React Email) + invitation service + Org Admin invitation APIs + default role (Wave 2, depends on 02-01)
- [ ] 02-03-PLAN.md -- Registration page + invitation acceptance flow + password validation + auto-login (Wave 2, depends on 02-01)
- [ ] 02-04-PLAN.md -- Gap closure: Fix dev-mode org context resolution for org-scoped API routes (Wave 1, standalone)

### Phase 3: Chat Integration and Core RBAC
**Goal**: Users can chat using only the AI models their role permits, with a composed 4-layer system prompt injected on every request, usage tracked per request, and MCP tools filtered by role assignment
**Depends on**: Phase 2
**Requirements**: UCHAT-01, UCHAT-02, UCHAT-05, UCHAT-06, PRMT-01, PRMT-02, PRMT-03, PRMT-04, PRMT-05, PRMT-06, OLLM-01, OLLM-02, OMCP-01, OMCP-02, OMCP-03, OMCP-04, OMCP-05, OINST-01, OINST-02, OINST-03, OINST-04, ORSI-01, ORSI-02, ORSI-03, ORSI-04, UCUST-01, UCUST-02, UCUST-03, UCUST-04, SAFE-07, SAFE-08, SAFE-09, MODL-01, MODL-02, MODL-03, MODL-04, MODL-05, MODL-06, MODL-07
**Success Criteria** (what must be TRUE):
  1. A user assigned the "Basic" role sees only the models permitted for that role in the model selector -- no other models are accessible via UI or API
  2. Every chat request composes and injects the 4-layer system prompt (platform + org + role + user) with descriptive XML delimiters, with per-layer token budgets enforced at save time (org: 700, role: 500, user: 200)
  3. MCP tools shown to the user match exactly their role-assigned tools plus org-wide tools -- no tools from other roles or orgs leak through
  4. Token usage (input + output) is recorded per request and can be queried by org, user, and model
  5. Org-level and role-level system instructions set by Org Admin affect AI behavior in user chat sessions
**Plans**: 14 plans in 3 waves

Plans:
- [x] 03-01-PLAN.md -- Model Registry schema (Model table + OnboardingAgreement table + UsageRecord extensions + Role extensions), prompt sanitizer, model registry service, seed data, Super Admin CRUD API (Wave 1)
- [x] 03-02-PLAN.md -- Super Admin Dashboard shell with sidebar + Model Registry management page with generation grouping (Wave 1)
- [x] 03-03-PLAN.md -- Chat route RBAC enforcement: model filtering, 4-layer prompt composition, MCP tool filtering, usage tracking, permitted models API + frontend model selector wiring (Wave 2, depends on 03-01)
- [x] 03-04-PLAN.md -- Org Admin Console shell with sidebar + system instructions management page (org + role level) with live token counters (Wave 2, depends on 03-01)
- [x] 03-05-PLAN.md -- Role model assignment with generation grouping and role configuration toggles (Wave 2, depends on 03-01)
- [x] 03-06-PLAN.md -- MCP server management (org-wide + role-specific) + user custom instructions API and Settings modal integration (Wave 2, depends on 03-01)
- [x] 03-07-PLAN.md -- Gap closure: Add org_admin permission to Technical role seed data (UAT Tests 7-13 fix) (Wave 1, standalone)
- [x] 03-08-PLAN.md -- Gap closure: BLOCKER fix (org-scoped models endpoint) + shared UI infrastructure (toast system, AlertDialog, ConfirmationDialog) (Wave 1, standalone)
- [x] 03-09-PLAN.md -- Gap closure: MCP server edit dialog, styled delete confirmation, toast notifications, status dots, tooltips (Wave 2, depends on 03-08)
- [x] 03-10-PLAN.md -- Gap closure: Instructions/Roles toast notifications, unsaved changes tracking, save button consistency, Ctrl+S, auto-grow textareas, toggle animations (Wave 2, depends on 03-08)
- [x] 03-11-PLAN.md -- Gap closure: Breadcrumb navigation, admin dashboard landing page, loading skeletons, redirect toast, sidebar visual polish (Wave 2, depends on 03-08)
- [x] 03-12-PLAN.md -- Gap closure: Last-saved timestamps, role card metadata, combined instructions preview, enhanced empty states (Wave 2, depends on 03-08)
- [x] 03-13-PLAN.md -- Gap closure: Gear icon fix, MCP empty states with CTAs, remaining visual polish (Wave 2, depends on 03-08)
- [x] 03-14-PLAN.md -- Gap closure: Human verification checkpoint for all 27 UAT SaaS readiness items (Wave 3, depends on 03-09 through 03-13)

### Phase 4: Role Configuration and Usage Limits
**Goal**: Org Admins can create custom roles with granular permissions, enforce usage limits with threshold alerts, set password policies, and users can manage their sessions
**Depends on**: Phase 3
**Requirements**: OROL-01, OROL-02, OROL-03, OROL-04, OROL-05, OROL-06, OROL-07, OUSE-01, OUSE-02, OUSE-03, OUSE-04, OUSE-05, OALT-01, OALT-02, OALT-03, UCHAT-03, UCHAT-04, SAFE-10, SAFE-11, OPWD-01, OPWD-02, OPWD-03, OPWD-04, OPWD-05, OPWD-06, USES-01, USES-02, UPRF-01, UPRF-02, UPRF-03, UPRF-04
**Phase 3 handoff notes**:
  - Org Admin Console shell already exists at `{org-slug}.llmatscale.ai/admin` with shadcn sidebar -- Phase 4 adds custom role management pages to the existing console
  - Model assignment uses the Platform Model Registry from Phase 3 (not hardcoded models) -- custom roles configure model access against the registry
  - Personal MCP server toggle + max count already exists per role from Phase 3 -- custom roles inherit this capability
  - Usage tracking infrastructure (UsageRecord with input/output/thinking/cache tokens) already exists from Phase 3 -- Phase 4 adds limit enforcement and alert banners
**Success Criteria** (what must be TRUE):
  1. Org Admin can create a custom role with specific model access (from Model Registry), MCP assignment, system instructions, and usage limits -- and users assigned that role are constrained accordingly
  2. A user who reaches 80% of their daily request or token limit sees a warning banner in the chat UI, and at 100% the chat input is blocked with a clear message
  3. Org Admin can set password policy (length, complexity, expiry) and users are required to comply on their next login or password change without immediate lockout
  4. Users can view all their active sessions and revoke any specific session, and Org Admin can force-logout a user from all sessions
  5. Users can update their display name and avatar, and cannot change their own email or role
**Plans**: 14 plans in 4 waves

Plans:
- [ ] 04-01-PLAN.md -- Schema changes + service layer foundation + Tabs UI + dependency installation (Wave 1)
- [x] 04-02-PLAN.md -- Admin sidebar redesign + role CRUD API + refactored roles page + role create/edit modal with 4 tabs (Wave 2, depends on 04-01)
- [ ] 04-03-PLAN.md -- Usage limit enforcement in chat route + chat UI banners + usage monitoring dashboard with Recharts + org ceiling API (Wave 2, depends on 04-01)
- [x] 04-04-PLAN.md -- Password policy management + force password reset + forced password change page + login integration (Wave 2, depends on 04-01)
- [ ] 04-05-PLAN.md -- User profile management + session management in settings modal + force-logout API (Wave 2, depends on 04-01)
- [x] 04-06-PLAN.md -- Human verification checkpoint for all 30 Phase 4 requirements (Wave 3, depends on 04-02 through 04-05) (completed 2026-03-03)
- [x] 04-07-PLAN.md -- Gap closure: Zod validation fix (personalMcpMaxCount nonnegative) + role description pre-fill + chat textarea disabled state (Wave 1, standalone)
- [x] 04-08-PLAN.md -- Gap closure: Org login slug fix + 403 FORCE_PASSWORD_CHANGE interceptor in chat (Wave 1, standalone)
- [x] 04-09-PLAN.md -- Gap closure: Non-admin password policy endpoint for force-password-change + session lastUsedAt tracking + sessions tab current highlighting (Wave 1, standalone)
- [x] 04-10-PLAN.md -- Gap closure: requireOrgAuth session-based org fallback for flat /api/* paths + UsageBanner unconditional mount (Wave 1, standalone)
- [x] 04-11-PLAN.md -- Gap closure: UsageBanner welcome-screen visibility when blocked + highest-percentage metric selection (Wave 1, standalone)
- [x] 04-12-PLAN.md -- Gap closure: Session isolation fixes (isSuperAdmin guard on admin layout, org login SA bypass, root redirect to /org/slug/chat) (Wave 1, standalone)
- [x] 04-13-PLAN.md -- Gap closure: Deprecate model confirmation dialog (BUG-4) (Wave 1, standalone)
- [x] 04-14-PLAN.md -- Gap closure: Admin catch-all page so admin layout loads for all /admin/* paths, fixing org-user redirect (Wave 1, standalone)

### Phase 5: Super Admin Dashboard
**Goal**: Super Admin has a complete management panel at super-admin.llmatscale.ai with org management, API key management, platform analytics, and audit logs -- all built with shadcn sidebar, TanStack Table, and Recharts. Routes restructured from /admin/* to /super-admin/*.
**Depends on**: Phase 4
**Requirements**: SUI-01, SUI-02, SUI-03, SUI-04, SKEY-01, SKEY-02, SKEY-03, SKEY-04, SSET-01, SSET-02, SANA-01, SANA-02, SANA-03, SANA-04, SANA-05, SANA-06, SANA-07, SANA-08, SANA-09, SANA-10, SANA-11, SANA-12, SAUD-01, SAUD-02, SAUD-03
**Phase 3 handoff notes**:
  - Super Admin dashboard shell already exists at `admin.llmatscale.ai` with shadcn + Radix UI sidebar -- Phase 5 EXTENDS the existing shell, does NOT rebuild from scratch
  - Model Registry management page already functional from Phase 3 -- Phase 5 may polish it with TanStack Table but the core CRUD is done
  - Sidebar already has all planned sections with "Coming Soon" placeholders -- Phase 5 implements the remaining sections (Orgs, Users, API Keys, Settings, Analytics, Audit Logs)
  - Add Recharts in Phase 5 (not installed in Phase 3) for analytics dashboards
  - Add TanStack Table in Phase 5 for data tables
**Success Criteria** (what must be TRUE):
  1. Super Admin can navigate the super-admin.llmatscale.ai panel using a shadcn sidebar layout and manage organizations, Super Admin users, API keys, and platform settings through shadcn-based forms and modals
  2. Super Admin can add, test, and assign Anthropic API keys to specific organizations, and remove keys that are no longer needed
  3. Platform analytics dashboard displays org statistics, user counts, token consumption by org/model, usage trends over time, and top orgs by usage -- all rendered with Recharts
  4. Super Admin can view, filter (by date, org, action type, user), and export (CSV/JSON) platform-wide audit logs
  5. All data tables (orgs, users, API keys, audit logs) use TanStack Table with sorting, filtering, and pagination
**Plans**: 8 plans in 4 waves

Plans:
- [x] 05-01-PLAN.md -- Route restructure (/admin to /super-admin), install TanStack Table, schema changes (PlatformSettings, PlatformApiKeyAssignment) (Wave 1)
- [ ] 05-02-PLAN.md -- Reusable DataTable component system (DataTable, DataTablePagination, DataTableColumnHeader) (Wave 1)
- [ ] 05-03-PLAN.md -- Organizations page + Super Admins page + sidebar grouped navigation upgrade (Wave 2, depends on 05-01, 05-02)
- [ ] 05-04-PLAN.md -- API Key management: service layer, CRUD API, test endpoint, management page (Wave 2, depends on 05-01, 05-02)
- [ ] 05-05-PLAN.md -- Platform Settings page (general + feature toggles) + System Prompt editor page (Wave 2, depends on 05-01)
- [ ] 05-06-PLAN.md -- Platform Analytics: service layer, API endpoint, KPI cards, 9 Recharts chart sections (Wave 3, depends on 05-01, 05-03)
- [ ] 05-07-PLAN.md -- Audit Logs: service layer, server-side paginated API, filter/sort, CSV/JSON export (Wave 3, depends on 05-01, 05-02)
- [ ] 05-08-PLAN.md -- Model Registry TanStack Table upgrade + final human verification checkpoint (Wave 4, depends on all)

### Phase 6: Org Admin Dashboard
**Goal**: Org Admin has a complete management panel at {org-slug}.llmatscale.ai/admin with user management, role management, invitation management, org analytics, and audit logs -- all built with shadcn sidebar, TanStack Table, and Recharts
**Depends on**: Phase 5
**Requirements**: OUI-01, OUI-02, OUI-03, OUI-04, OUSR-02, OUSR-03, OUSR-04, OUSR-05, OUSR-06, OUSR-07, OUSR-08, OUSR-10, OUSR-11, OUSR-12, OAKEY-01, OAKEY-02, OANA-01, OANA-02, OANA-03, OANA-04, OANA-05, OANA-06, OANA-07, OANA-08, OANA-09, OANA-10, OANA-11, OANA-12, OANA-13, OANA-14, OANA-15, OAUD-01, OAUD-02, OAUD-03
**Phase 3 handoff notes**:
  - Org Admin console shell already exists at `{org-slug}.llmatscale.ai/admin` with shadcn + Radix UI sidebar -- Phase 6 EXTENDS the existing shell, does NOT rebuild from scratch
  - Functional pages from Phase 3 already exist: MCP management, role model assignment, system instructions (org + role), user custom instruction toggle -- Phase 6 polishes these with TanStack Table and refined UX
  - Sidebar already has all planned sections with "Coming Soon" placeholders -- Phase 6 implements remaining sections (Users, Invitations, Analytics, Audit Logs, Settings)
  - MCP assignment UI (org-wide vs role-specific) already functional from Phase 3 -- Phase 6 may refine but core logic is done
  - Add Recharts in Phase 5/6 for analytics dashboards
  - Add TanStack Table for data tables (users, invitations, audit logs)
**Success Criteria** (what must be TRUE):
  1. Org Admin can navigate the {org-slug}.llmatscale.ai/admin panel using a shadcn sidebar layout and manage users, roles, invitations, and org settings through shadcn-based forms and modals
  2. Org Admin can view all users with status, change roles, suspend/activate users, view custom instructions (read-only), force-logout users, and identify inactive users -- all via TanStack Table
  3. Org analytics dashboard displays user stats, conversation/message counts, token usage by user/role/model, model distribution, usage trends, MCP usage, and limit alerts -- all rendered with Recharts
  4. Org Admin can view, filter (by date, action type, user), and export (CSV/JSON) org-scoped audit logs
  5. Org Admin can view platform API keys assigned to their org (read-only) and test key validity
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD
- [ ] 06-03: TBD

### Phase 7: Theming, Branding, and Compliance
**Goal**: Organizations have visual identity through theme selection and branding, conversation visibility gives Org Admin compliance oversight, user impersonation enables support, and scheduled tasks keep the system clean
**Depends on**: Phase 6
**Requirements**: SORG-08, SORG-09, OTHM-01, OTHM-02, OTHM-03, OTHM-04, OTHM-05, OTHM-06, OTHM-07, OBRN-01, OBRN-02, OBRN-03, OBRN-04, UTHEM-01, UTHEM-02, UTHEM-03, OVIS-01, OVIS-02, OVIS-03, OVIS-04, OVIS-05, OVIS-06, OVIS-07, SAUD-04, CRON-01, CRON-02, CRON-03
**Phase 3 handoff notes**:
  - Conversation visibility notice decided in Phase 3: handled via user onboarding agreement page (org-customizable), NO in-chat indicator -- adjust success criterion #4 accordingly
  - User onboarding agreement page (org-customizable text, acceptance tracking) may be partially built in Phase 3 or deferred here -- check Phase 3 CONTEXT.md for what was implemented
  - Full logo upload implementation belongs here (Phase 1 laid org logo placeholder foundation, Phase 2 mentioned logoDisplayMode)
  - Login page customization (tagline, custom content on org login pages) belongs here
  - Org branding colors applied to login page + org admin console + chat UI
**Success Criteria** (what must be TRUE):
  1. Super Admin can assign available themes to an org, Org Admin can choose the active theme from assigned themes, and if an assigned theme is removed the system falls back gracefully to the default
  2. Org Admin can set primary and accent brand colors and upload a logo, and branding applies across the entire org UI instantly
  3. Users can toggle between light, dark, and system mode independently from the org theme, and their preference persists across sessions
  4. Org Admin can enable conversation visibility, gaining read-only access to all org conversations with filtering and export, while users acknowledged conversation visibility during onboarding agreement (no in-chat indicator per Phase 3 decision)
  5. Scheduled tasks automatically purge soft-deleted orgs after 30 days, clean up expired invitations, and clean up expired sessions
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD
- [ ] 07-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Schema and Auth Foundation | 3/3 | Complete | 2026-02-26 |
| 2. Organization Management and Invitations | 4/4 | Complete | 2026-02-27 |
| 3. Chat Integration and Core RBAC | 14/14 | Complete | 2026-02-28 |
| 4. Role Configuration and Usage Limits | 14/14 | Complete | 2026-03-03 |
| 5. Super Admin Dashboard | 4/8 | In Progress|  |
| 6. Org Admin Dashboard | 0/3 | Not started | - |
| 7. Theming, Branding, and Compliance | 0/3 | Not started | - |
