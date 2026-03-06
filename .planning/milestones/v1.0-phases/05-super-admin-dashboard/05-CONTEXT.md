# Phase 5: Super Admin Dashboard - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the Super Admin management panel at admin.llmatscale.ai by implementing all remaining sidebar sections (Organizations, Super Admins, API Keys, Settings, System Prompt, Analytics, Audit Logs), upgrading all data tables to TanStack Table, and adding Recharts-based analytics dashboards. The admin shell, sidebar, and Model Registry page already exist from Phase 3 — Phase 5 EXTENDS, does NOT rebuild.

</domain>

<decisions>
## Implementation Decisions

### Route Restructure
- **Rename Super Admin routes** from `/admin/*` to `/super-admin/*`
- Reserve `/admin/*` for Org Admin (currently at `/org/[slug]/admin/*` — Phase 6 will implement Org Admin at `/admin/*`)
- Super Admin pages: `/super-admin/models`, `/super-admin/organizations`, `/super-admin/analytics`, etc.
- Super Admin login: `/super-admin/login`
- Super Admin API routes: `/api/super-admin/*` (rename from `/api/admin/*`)
- Production subdomain: `super-admin.llmatscale.ai` (instead of `admin.llmatscale.ai`)
- **Migration scope**: Move `app/admin/` → `app/super-admin/`, update all internal links, sidebar hrefs, API route paths, layout auth guards, and catch-all route

### Sidebar Navigation
- Upgrade from flat list to **grouped sections** (matching org admin pattern)
- Groups:
  - **Management:** Models, Organizations, Super Admins, API Keys
  - **Monitoring:** Analytics, Audit Logs
  - **Configuration:** Settings, System Prompt
- All items enabled (no more "Coming Soon" placeholders)
- Uses existing `SidebarGroup` and `SidebarGroupLabel` components

### Page Header Pattern
- Every admin page uses a **consistent header bar**: breadcrumb trail + page title + primary action button(s) at top right
- Reuses existing `AdminBreadcrumb` component
- Production-grade, consistent across all sections

### Analytics Dashboard
- **Single scrolling page** layout with sections
- **KPI summary cards** at top: Total Orgs (active/suspended), Total Users, Total Conversations, Total Tokens Used (core 4 cards)
- **Time range controls**: Preset buttons (7d, 30d, 90d, 1y) PLUS custom date range picker
- **Chart types**:
  - Stacked area charts for usage trends over time (SANA-05)
  - Stacked area charts for token consumption by org/model (SANA-04)
  - Horizontal bar charts for top orgs by usage (SANA-06)
  - Donut/pie chart for AI error rate by type (SANA-07)
  - Heatmap grid (hour x day) for peak usage hours (SANA-08)
- **MCP & adoption metrics**: Detailed breakdowns — MCP usage per org, tool success/failure rates, adoption curves over time (SANA-10, SANA-12)
- **Data fetching**: Load on mount with skeleton loaders + manual refresh button in header
- **Library**: Recharts (to be installed)

### Data Tables (TanStack Table)
- **All admin tables** use TanStack Table with sorting, filtering, and pagination
- **Pagination**: Classic numbered pages with prev/next and rows per page selector (10/25/50)
- **Filtering**: Inline column filters (filter inputs in/below column headers, independent per column)
- **Row actions**: Three-dot dropdown menu at end of each row (Edit, Suspend, Delete, etc.)
- **Model Registry table**: Upgrade existing custom table to TanStack Table for consistency (preserve generation grouping)
- **Library**: TanStack Table (to be installed)
- Tables needed: Organizations, Super Admins, API Keys, Audit Logs, plus upgraded Models

### API Key Management (SKEY-01 to SKEY-04)
- **Add key flow**: Click "Add Key" → modal form with: key name, paste API key, select org(s) to assign, Test button before saving
- **Key display**: Masked with reveal — show `sk-ant-...xxxx` (first 7 + last 4 chars), click to temporarily reveal full key
- **Org assignment**: Multi-select dropdown in modal — one key can serve multiple orgs; unassigned keys available as "platform pool"
- **Test key action**: Inline status badge on row — click test → spinner → green "Valid" or red "Invalid" badge
- Backend: PlatformApiKey model already exists in schema; need CRUD API routes

### Platform Settings (SSET-01, SSET-02)
- **Two-section page**: General Settings at top, Feature Toggles grid below
- **Feature toggles** (core set): Web search, File uploads, MCP tools, Artifact generation, Extended/Adaptive thinking
- **Save pattern**: Explicit save button with unsaved changes indicator — no auto-save (prevents accidental toggles affecting all orgs)
- **General settings**: Platform display name, default session expiry duration, maintenance mode toggle, and any other settings from requirements
- Backend: Need PlatformSettings model/API (not yet in schema)

### Platform System Prompt
- **Separate sidebar item** under Configuration group (not part of Settings page)
- Dedicated page for editing the platform-level layer of the 4-layer prompt system
- Uses existing instruction editor pattern from org admin

### Audit Logs (SAUD-01 to SAUD-03)
- View audit logs in TanStack Table with sorting, filtering, pagination
- **Filters**: Date range, org, action type, user — inline column filters
- **Export**: CSV and JSON download options
- Backend: AuditLog model exists; need read/filter/export API routes

### Claude's Discretion
- Exact chart dimensions, colors, and spacing within Recharts
- Loading skeleton designs for each page
- Error state handling across all pages
- TanStack Table column widths and responsive behavior
- Exact modal/form field ordering and validation messages
- API endpoint structure for analytics aggregation queries

</decisions>

<specifics>
## Specific Ideas

- Production-grade SaaS quality — every page should feel polished and professional
- Sidebar grouped layout must mirror the org admin console pattern for consistency
- All existing Phase 2/3 admin APIs (orgs, super-admins, models, role-templates) are ready for UI consumption
- Model Registry table upgrade to TanStack Table must preserve generation grouping feature
- AdminSidebar component already has variant prop (`super-admin` | `org-admin`) — Phase 5 updates the super-admin nav items

</specifics>

<code_context>
## Existing Code Insights

### Reusable Admin Components
- `components/admin/admin-sidebar.tsx`: Sidebar with `SUPER_ADMIN_NAV_ITEMS` (flat, needs grouped conversion); org admin variant already uses `NavGroup[]` with `SidebarGroupLabel` — replicate for super admin
- `components/admin/admin-breadcrumb.tsx`: Pathname-based breadcrumb navigation for all admin pages
- `components/admin/model-registry-table.tsx`: Custom table with generation grouping, deprecate/delete confirmation dialogs (to be upgraded to TanStack Table)
- `components/admin/model-registry-form.tsx`: Modal form pattern for add/edit with MTok price conversion
- `components/admin/role-form-modal.tsx`: 4-tab Dialog modal (General, Models, Limits, Permissions) — reusable modal CRUD pattern for org/user forms
- `components/admin/role-card.tsx`: Read-only card component pattern
- `components/admin/instruction-editor.tsx`: Auto-growing textarea with live token counter, color-coded progress bar, Ctrl+S shortcut
- `components/admin/mcp-assignment-panel.tsx`: Org-wide + role-specific sections with add/edit/delete dialogs

### Reusable UI Components
- `components/ui/sidebar.tsx`: Full shadcn sidebar with SidebarGroup, SidebarGroupLabel, SidebarMenu
- `components/ui/skeleton-loaders.tsx`: Admin skeleton loaders (AdminInstructionsSkeleton, AdminRoleCardsSkeleton, AdminMcpSkeleton)
- `components/ui/confirmation-dialog.tsx`: Styled wrapper for destructive actions (Radix AlertDialog)
- `components/ui/toast.tsx`: Toast notifications via sonner (`toast.success()`, `toast.error()`)
- `components/ui/tabs.tsx`: Radix Tabs wrapper for admin forms
- `components/ui/checkbox.tsx`: Radix-backed with indeterminate state (used for batch model selection)
- `components/ui/badge.tsx`, `dialog.tsx`, `button.tsx`, `input.tsx`, `switch.tsx`, `label.tsx`: Standard form/display components

### Service Layer (Backend)
- `lib/services/org-service.ts`: 9 org lifecycle functions (create, update, suspend, activate, delete, restore, list, get, updateOrgLogo) — all use `$transaction` + `auditLog.record()`
- `lib/services/super-admin-service.ts`: Super Admin CRUD with safety rules (SAFE-01: can't delete self, SAFE-06: min 1 Super Admin)
- `lib/services/audit-service.ts`: Transactional audit log service, exports `PrismaTransactionClient` type
- `lib/services/role-template-service.ts`: Role template CRUD with file-based overrides (`.data/role-templates.json`)
- `lib/services/usage-service.ts`: Usage tracking, org summaries, daily trend aggregation (raw SQL DATE() grouping)
- `lib/services/role-service.ts`: Role CRUD with validation
- `lib/services/session-service.ts`: Session list/revoke/force-logout with device-enriched data
- `lib/services/password-policy-service.ts`: Password policy CRUD & validation
- `lib/services/invitation-service.ts`: Invitation CRUD + email sending via Resend
- `lib/services/model-registry-service.ts`: getAllModels(), getModelsGroupedByGeneration(), create/update/delete with deprecation validation
- `lib/services/system-prompt-service.ts`: 4-layer XML-delimited prompt composition
- `lib/services/instruction-service.ts`: Token budget validation, save with audit logging
- `lib/token-counter.ts`: estimateTokenCount() with SERVER_MARGIN, TOKEN_LIMITS constants

### Existing Admin API Routes (Ready for UI)
- `GET/POST /api/admin/organizations/` — List, create orgs
- `GET/PATCH/DELETE /api/admin/organizations/[id]/` — Single org CRUD
- `POST /api/admin/organizations/[id]/suspend/` — Soft suspend (invalidates all org sessions)
- `POST /api/admin/organizations/[id]/activate/` — Reactivate suspended
- `POST /api/admin/organizations/[id]/restore/` — Restore soft-deleted (30-day grace)
- `PATCH /api/admin/organizations/[id]/logo/` — Upload logo
- `GET/POST /api/admin/super-admins/` — List, create Super Admins
- `GET/PATCH/DELETE /api/admin/super-admins/[id]/` — Single Super Admin CRUD
- `GET /api/admin/role-templates/` — List templates
- `GET/PATCH/POST /api/admin/role-templates/[id]/` — Template CRUD + reset
- `GET/POST/PATCH/DELETE /api/admin/models/` + `/api/admin/models/[id]/` — Model Registry CRUD

### Auth & Data Access Patterns
- `requireSuperAdmin(req)` middleware for all `/api/admin/*` routes — returns `{ user }`, uses raw `prisma` (not tenant-scoped)
- `requireOrgAuth(req)` for org-scoped routes — returns `{ user, org, role, permissions, tenantDb }`
- `tenantPrisma(orgId)` in `lib/tenant.ts` for org-scoped queries — Super Admin uses raw `prisma` for cross-org
- Soft delete pattern: filter `deletedAt: null` in all queries; Organization has 30-day restore grace period
- Service mutation pattern: `prisma.$transaction()` with co-located `auditLog.record()` for atomic audit trail
- `getIpAddress(req)` extracted in all admin API routes for audit logging
- `getAuthHeaders()` helper in frontend admin pages for Bearer token from localStorage

### Database Models Available
- **PlatformApiKey**: Exists in schema — encrypted API keys for AI providers, org-scoped
- **AuditLog**: `userId`, `action`, `resourceType`, `resourceId`, `changes`, `metadata`, `organizationId` — ready for audit dashboard
- **UsageRecord**: `inputTokens`, `outputTokens`, `thinkingTokens`, `cacheCreationTokens`, `cacheReadTokens`, `conversationId`, `costUsd` — ready for analytics
- **Organization**: `monthlyRequestCeiling`, `monthlyTokenCeiling` (Super Admin ceilings), `logoDisplayMode`, soft delete
- **OrgSettings**: `monthlyRequestLimit`, `monthlyTokenLimit` (Org Admin limits, capped by org ceilings)
- **Model**: Platform-level registry with pricing (Decimal 20,12), capabilities, status, thinkingType
- **Session**: `organizationId`, `userAgent`, `ipAddress` for session tracking

### Established Dashboard Patterns (from Phase 4 Org Admin)
- Dashboard layout: summary cards row → chart → filterable table with skeleton loading
- Recharts: 30-day trend chart with raw SQL DATE() grouping (Prisma groupBy lacks date truncation)
- Progress bar: green <80%, amber 80-99%, red 100%+ with current/limit text
- Filter tabs with counts pattern for table filtering
- Modal-based CRUD: read-only cards + Dialog modal for create/edit (4-tab pattern)
- Confirmation dialogs for all destructive actions (delete, suspend, force-logout)
- Toast notifications for success/error feedback

### Validation Schemas (in `lib/validation.ts`)
- CreateOrgSchema, UpdateOrgSchema
- CreateSuperAdminSchema, UpdateSuperAdminSchema
- CreateModelSchema, UpdateModelSchema
- OrgInstructionsSchema, RoleInstructionsSchema
- CreateInvitationSchema, SetDefaultRoleSchema
- (Phase 5 will add: PlatformApiKeySchema, PlatformSettingsSchema, AuditLogFilterSchema)

### Safety Rules (Must Enforce in Dashboard UI)
- **SAFE-01**: Super Admin cannot delete themselves — disable delete button for current user
- **SAFE-06**: System must maintain at least 1 Super Admin — prevent last SA deletion
- **SAFE-02**: Cannot remove last admin from org — validated server-side, show error in UI

### Integration Points (will be renamed /admin → /super-admin)
- `app/admin/layout.tsx` → `app/super-admin/layout.tsx`: Wraps all pages with `SidebarProvider` + `AdminSidebar`
- `app/admin/page.tsx` → `app/super-admin/page.tsx`: Root redirect (currently → /admin/models)
- `app/admin/[...catchAll]/page.tsx` → `app/super-admin/[...catchAll]/page.tsx`: Catch-all for unmatched paths
- `lib/constants/role-templates.ts`: DEFAULT_ROLE_TEMPLATES + AVAILABLE_MODELS constant for UI dropdowns
- `lib/user-agent.ts`: Browser/OS/device parsing for session display

### New Dependencies to Install
- `@tanstack/react-table` — Data table library
- `recharts` — Charting library (may already be installed from Phase 4 — verify)
- `date-fns` or similar — Date range picker support (check if already installed)

### New API Routes Needed (under /api/super-admin/)
- `/api/super-admin/api-keys/` — CRUD for PlatformApiKey (list, create, update, delete)
- `/api/super-admin/api-keys/[id]/test/` — Test API key validity
- `/api/super-admin/settings/` — Platform settings CRUD
- `/api/super-admin/analytics/` — Aggregated platform analytics (org stats, usage trends, error rates, etc.)
- `/api/super-admin/audit-logs/` — Filtered audit log listing with export (CSV/JSON)
- `/api/super-admin/system-prompt/` — Platform system prompt CRUD

### Existing API Routes to Rename (/api/admin/ → /api/super-admin/)
- `/api/admin/organizations/*` → `/api/super-admin/organizations/*`
- `/api/admin/super-admins/*` → `/api/super-admin/super-admins/*`
- `/api/admin/models/*` → `/api/super-admin/models/*`
- `/api/admin/role-templates/*` → `/api/super-admin/role-templates/*`

</code_context>

<deferred>
## Deferred Ideas

- SAUD-04 (User impersonation for support) — listed in requirements but not in Phase 5 scope per roadmap; belongs in Phase 7
- Dashboard widget customization/rearrangement — beyond current scope, could be future enhancement
- Real-time analytics auto-refresh — decided against for now (manual refresh button instead)

</deferred>

---

*Phase: 05-super-admin-dashboard*
*Context gathered: 2026-03-04*
