# Phase 5: Super Admin Dashboard - Context

**Gathered:** 2026-03-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the Super Admin management panel at admin.llmatscale.ai by implementing all remaining sidebar sections (Organizations, Super Admins, API Keys, Settings, System Prompt, Analytics, Audit Logs), upgrading all data tables to TanStack Table, and adding Recharts-based analytics dashboards. The admin shell, sidebar, and Model Registry page already exist from Phase 3 — Phase 5 EXTENDS, does NOT rebuild.

</domain>

<decisions>
## Implementation Decisions

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

### Reusable Assets
- `components/admin/admin-sidebar.tsx`: Sidebar with `SUPER_ADMIN_NAV_ITEMS` array (currently flat, needs grouped conversion)
- `components/admin/admin-breadcrumb.tsx`: Breadcrumb component ready for all admin pages
- `components/admin/model-registry-table.tsx`: Custom table with generation grouping (to be upgraded to TanStack Table)
- `components/admin/model-registry-form.tsx`: Modal form pattern for add/edit (reusable pattern for API key form)
- `components/ui/sidebar.tsx`: Full shadcn sidebar with SidebarGroup, SidebarGroupLabel, SidebarMenu components
- `components/ui/skeleton-loaders.tsx`: Skeleton components for loading states
- `components/ui/badge.tsx`: Status badges for table cells
- `components/ui/dialog.tsx`: Modal dialog for forms
- `components/ui/button.tsx`, `input.tsx`, `switch.tsx`, `label.tsx`: Form components

### Established Patterns
- Admin layout auth guard: synchronous localStorage check in render, effect redirect for unauthenticated
- Admin page API call pattern: `getAuthHeaders()` helper with Bearer token from localStorage
- Admin sidebar variant prop for super-admin/org-admin reuse
- Org admin sidebar already uses grouped sections with `SidebarGroupLabel` (pattern to replicate for super admin)

### Integration Points
- `app/admin/layout.tsx`: Wraps all admin pages with `SidebarProvider` + `AdminSidebar`
- `app/admin/page.tsx`: Root redirect (currently → /admin/models, may change to /admin/analytics or stay)
- Existing admin API routes: `/api/admin/models`, `/api/admin/organizations`, `/api/admin/super-admins`, `/api/admin/role-templates`
- `prisma/schema.prisma`: PlatformApiKey model exists; need PlatformSettings table
- `lib/storage.ts`: CRUD operations (add new sections for API keys, settings, analytics queries)

### New Dependencies to Install
- `@tanstack/react-table` — Data table library
- `recharts` — Charting library
- `date-fns` or similar — Date range picker support (check if already installed)

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
