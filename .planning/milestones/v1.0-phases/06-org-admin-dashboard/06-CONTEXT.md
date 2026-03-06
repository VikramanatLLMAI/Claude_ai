# Phase 6: Org Admin Dashboard - Context

**Gathered:** 2026-03-05
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the Org Admin management panel at {org-slug}.llmatscale.ai/admin with user management, invitation management, comprehensive org analytics, audit logs, and API key viewing. The existing org admin shell (sidebar, layout, breadcrumbs) and functional pages (Roles, Instructions, MCP, Usage, Security) from Phases 3-4 are EXTENDED, not rebuilt. All new tables use TanStack Table, all charts use Recharts, all UI uses shadcn components.

</domain>

<decisions>
## Implementation Decisions

### Members Page — User Management
- **Detail side panel**: Clicking a user row opens a slide-out panel (right side, ~40% width) showing full profile, role, sessions, custom instructions, and usage summary. Modern SaaS feel — table stays visible for context.
- **Compact table columns**: Avatar + Name + Email (single cell), Role badge, Status badge (Active/Suspended/Pending/Inactive), Last active (relative time). Four columns — quick-scan optimized, detail panel shows everything else.
- **Top actions bar in side panel**: Panel header shows user avatar + name + role + status. Action buttons grouped at the top: [Change Role] [Suspend/Activate] [Force Logout] [Delete] [Promote to Admin]. Below: read-only sections for profile, custom instructions, usage, sessions.
- **Bulk actions with floating bar**: Checkbox selection on table rows. When 1+ rows selected, a floating action bar appears at the bottom: "N selected" + [Suspend] [Change Role ▼] [Force Logout]. Checkbox click does NOT open the side panel — only row content click does.
- **Filter bar + search**: Text search by name/email, Role dropdown filter, Status dropdown filter (Active, Suspended, Pending, Inactive). Server-side filtering. Consistent with audit log filter bar pattern from Phase 5.
- **Confirmation dialogs for destructive actions**: Standard ConfirmationDialog (existing component) with red styling for suspend/delete. Shows user name and explains consequences (e.g., "All sessions will be revoked"). Consistent with existing patterns.
- **Separate promote-to-admin action**: Distinct "Promote to Admin" button in the actions bar (NOT mixed with role change dropdown). Opens confirmation dialog with explicit warning: "This gives [User] full admin access to this organization." High-privilege action gets special treatment.
- **Dropdown + confirm for role change**: Click "Change Role" → dropdown shows available roles → selecting one triggers confirmation dialog ("Change [User] from [Current] to [New]?"). Two-step prevents accidental changes.
- **Small edit modal for name**: Click edit icon next to name in side panel → small dialog with just the name field + Save/Cancel. Panel stays read-only by default. Email and role are not editable here.
- **Full custom instructions preview**: Read-only textarea/code block in the side panel showing the user's complete custom instruction text. Full visibility for compliance review (OUSR-10).
- **Inactive user badge + filter**: Users inactive 30+ days get a gray "Inactive" status badge in the table. Filter bar includes "Inactive" as a status option. Separate from "Suspended" (admin action) vs "Inactive" (derived from last active).

### Invitations Page — Standalone
- **Separate page in sidebar**: Invitations gets its own page under the People sidebar group, NOT a tab on the Members page. Sidebar shows both "Members" and "Invitations" as separate enabled items.
- **DataTable with status filter tabs**: Filter tabs at top: All, Pending, Accepted, Expired. Count badges per tab. TanStack Table with columns: Email, Assigned Role badge, Status badge (color coded: pending=amber, accepted=green, expired=gray, revoked=red), Sent Date, Expires Date.
- **Modal form for sending invitations**: "Send Invitation" button opens a dialog with: email input, role dropdown (from existing roles), optional welcome message textarea. Submit sends via Resend API. Follows existing modal CRUD pattern.
- **Row actions for pending invitations**: Three-dot menu on pending rows: Resend, Revoke. Accepted/expired/revoked rows have no actions. Resend creates a new invitation token. Revoke uses confirmation dialog.
- **Keep all invitations visible**: All invitations (including expired) stay visible in the table. Filter tabs let admins focus on specific statuses. No auto-cleanup from the UI.

### Org Analytics Dashboard — Enterprise-Grade
- **Sections with anchor navigation**: Single scrollable page with distinct sections: Overview KPIs → Usage Trends → User Analytics → Model & MCP Usage → Operational Metrics. Sticky section nav or anchor links to jump between sections.
- **4 KPI cards at top**: Active Users (with trend), Total Conversations, Total Tokens Used, Users Near Limits. Mirrors Super Admin pattern. Covers OANA-01, OANA-02, OANA-14.
- **Section-based loading**: KPI cards load first (fast), then chart sections load in parallel with skeleton loaders. Same pattern as Super Admin analytics (?section= parameter). Faster perceived performance.
- **Horizontal bar chart + table for top users**: Top 10 users as horizontal bar chart (tokens), plus a small table with name, role, message count, token total. Clickable rows cross-link to the user's detail panel on the Members page.
- **Presets + custom date range**: Quick buttons (7d, 30d, 90d, 1y) plus a date picker for custom ranges. Same as Super Admin analytics.
- **Per-section CSV export**: Each chart section has a small download icon that exports that section's data as CSV. Enables Org Admins to create custom reports for leadership.
- **Claude's discretion on chart types**: For all 15 OANA requirements, Claude selects the most appropriate chart type (area, bar, donut, heatmap, table) based on the data characteristics and established Recharts patterns. Production-grade, enterprise-level detail.
- **Replace existing Usage page**: The new comprehensive Analytics dashboard replaces the existing Usage monitoring page. All usage data + the 15 OANA metrics live on one dashboard. Sidebar shows "Analytics" instead of "Usage" in the Monitoring group.

### Org Audit Logs — Mirror Super Admin
- **Mirror Super Admin pattern exactly**: Same layout: filter bar (date range + presets + action type dropdown + user dropdown), server-side paginated table, action badge color coding (green=created, red=deleted, amber=updated, blue=tested), metadata detail modal on row click, CSV/JSON export buttons.
- **Org-scoped only**: Shows ONLY actions performed within the specific organization. NO platform-level/Super Admin actions. Super Admin has their own platform-wide audit log.
- **10,000 row export cap**: Same as Super Admin audit log. Prevents memory issues on large orgs.
- **Detail modal on row click**: Table shows timestamp, action badge, user, description. Clicking row opens a detail modal with full metadata JSON (IP address, details, changes). Same component pattern as Super Admin.
- **Server-side pagination**: External state (page/pageSize/sortBy/sortOrder) drives API calls. Reuses the same pattern from Super Admin audit logs (lib/services/audit-log-service.ts).

### API Key Viewer — Read-Only
- **Settings page section**: API key viewing lives as a section on an Org Settings page. Shows platform API keys assigned to this org by Super Admin (masked values, assigned date). "Test" button per key to verify validity. Read-only — Org Admin cannot add/remove/edit keys.

### Sidebar Updates
- **Enable People group items**: "Members" and "Invitations" change from "Coming Soon" disabled badges to enabled links.
- **Replace Usage with Analytics**: In the Monitoring group, "Usage" becomes "Analytics" pointing to the new comprehensive analytics dashboard.
- **Add Audit Logs**: Add "Audit Logs" to the Monitoring or Security group.
- **Add Settings**: Add "Settings" link for the org settings page (API keys, general org config).

### Claude's Discretion
- Exact side panel animation and transition effects
- Analytics chart color palette and axis formatting
- Loading skeleton designs per page
- Empty state illustrations and copy
- Exact filter bar component layout and spacing
- Audit log action type categorization
- Analytics section ordering and grouping
- Per-section export file naming convention
- Org settings page layout and additional sections beyond API keys

</decisions>

<specifics>
## Specific Ideas

- Members side panel inspired by Linear/Notion slide-out pattern — table stays visible, panel slides in from right
- Bulk actions floating bar at bottom (like Gmail/Figma selection bar)
- Enterprise-level analytics: detailed, thorough, production-grade — not a lightweight dashboard
- Per-section CSV export on analytics for reporting to leadership
- Inactive users (30+ days) get distinct status treatment separate from suspended users

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/admin/data-table.tsx` — TanStack Table wrapper with sorting, filtering, pagination (136 lines)
- `components/admin/data-table-pagination.tsx` — Pagination controls for DataTable
- `components/admin/data-table-column-header.tsx` — Sortable column headers with icons
- `components/admin/analytics-charts.tsx` — 9 Recharts chart components (UsageTrend, TokensByOrg, TopOrgs, ErrorRate, PeakHeatmap, ApiKeyConsumption, McpUsage, RegistrationTrend, FeatureAdoption)
- `components/admin/kpi-card.tsx` — Reusable KPI summary card with trend indicator
- `components/ui/confirmation-dialog.tsx` — Destructive action confirmation with loading state
- `components/ui/toast.tsx` — Sonner toast wrapper (toast.success/error/info)
- `components/admin/admin-sidebar.tsx` — Unified sidebar with org-admin variant using NavGroup interface
- `components/admin/admin-breadcrumb.tsx` — Contextual breadcrumbs for admin pages

### Established Patterns
- **Modal CRUD**: Read-only display + Dialog modal for create/edit (RoleFormModal pattern)
- **DataTable page**: useEffect fetchData → useState → ColumnDef[] with DataTableColumnHeader → DataTable
- **Row actions**: DropdownMenu with MoreVertical trigger, conditional items based on status
- **Server-side pagination**: External state (page/pageSize/sortBy/sortOrder) drives API calls
- **Filter bar**: Date range + presets + entity dropdowns + clear button (audit log pattern)
- **Section-based API loading**: ?section= parameter for parallel data loading (analytics pattern)
- **Confirmation dialogs**: ConfirmationDialog with warning/destructive variants
- **Toast feedback**: All CRUD mutations provide toast.success/error feedback
- **Action badge color coding**: .created=green, .deleted=red, .updated=amber, .tested=blue

### Integration Points
- Org admin layout at `app/org/[slug]/admin/layout.tsx` — auth check, SidebarProvider, AdminSidebar
- Invitation APIs from Phase 2: `GET/POST /api/org/[slug]/invitations`, resend/revoke endpoints
- Force-logout API: `POST /api/org/[slug]/admin/users/[userId]/force-logout`
- Profile API: `GET/PATCH /api/org/[slug]/profile`
- Sessions API: `GET /api/org/[slug]/sessions`, `DELETE /api/org/[slug]/sessions/[id]`
- Usage data: `GET /api/org/[slug]/admin/usage` and `GET /api/org/[slug]/admin/usage/users`
- Audit log service: `lib/services/audit-log-service.ts` (listAuditLogs, exportAuditLogs) — needs org-scoped variant
- Platform analytics service: `lib/services/platform-analytics-service.ts` — pattern reference for org analytics service
- Roles API: `GET /api/org/[slug]/admin/roles` — for role dropdowns in members/invitations

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 06-org-admin-dashboard*
*Context gathered: 2026-03-05*
