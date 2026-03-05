# Phase 6: Org Admin Dashboard - Research

**Researched:** 2026-03-05
**Domain:** Org Admin management panel — user management, invitations, analytics, audit logs, API key viewing
**Confidence:** HIGH

## Summary

Phase 6 completes the Org Admin management panel by implementing the remaining sections: Members (user management with side panel), Invitations (standalone page), Analytics (comprehensive enterprise-grade dashboard replacing existing Usage page), Audit Logs (mirroring Super Admin pattern), and Settings (API key viewer). The existing shell (sidebar, layout, breadcrumbs) and functional pages (Roles, Instructions, MCP, Usage, Security) from Phases 3-5 are extended, not rebuilt.

The implementation is heavily pattern-based. TanStack Table v8, Recharts v3, and shadcn components are already installed and used in the Super Admin dashboard. The org admin pages follow the same architecture: `useEffect` data fetching, `ColumnDef[]` driven tables, section-based analytics loading, and server-side pagination for audit logs. A new `org-analytics-service.ts` needs to be created following the `platform-analytics-service.ts` pattern, and the existing `audit-log-service.ts` needs an org-scoped variant.

**Primary recommendation:** Mirror existing Super Admin patterns exactly (analytics page structure, audit log filter bar, DataTable column definitions) and reuse all existing components (KpiCard, analytics chart components, DataTable, ConfirmationDialog). Build the user detail side panel using the existing Sheet component from Radix UI. Create a new org-analytics-service.ts using the platform-analytics-service.ts as a template, scoped to a single org via tenantDb.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Members Page — User Management**: Detail side panel (right slide-out, ~40% width). Compact table: Avatar+Name+Email, Role badge, Status badge (Active/Suspended/Pending/Inactive), Last active. Top actions bar in side panel: [Change Role] [Suspend/Activate] [Force Logout] [Delete] [Promote to Admin]. Bulk actions with floating bar. Filter bar + search (text search, role dropdown, status dropdown, server-side). Confirmation dialogs for destructive actions. Separate promote-to-admin action. Dropdown + confirm for role change. Small edit modal for name. Full custom instructions preview (read-only). Inactive user badge + filter (30+ days).
- **Invitations Page — Standalone**: Separate page in sidebar under People group. DataTable with status filter tabs (All, Pending, Accepted, Expired) with count badges. Modal form for sending invitations (email, role dropdown, optional welcome message). Row actions for pending (Resend, Revoke). Keep all invitations visible.
- **Org Analytics Dashboard — Enterprise-Grade**: Single scrollable page with anchor navigation. 4 KPI cards (Active Users, Total Conversations, Total Tokens, Users Near Limits). Section-based loading with skeleton loaders. Horizontal bar chart + table for top users. Presets + custom date range. Per-section CSV export. Claude's discretion on chart types. Replace existing Usage page with Analytics.
- **Org Audit Logs — Mirror Super Admin**: Same layout (filter bar, server-side paginated table, action badge coloring, metadata detail modal, CSV/JSON export). Org-scoped only. 10,000 row export cap. Detail modal on row click. Server-side pagination.
- **API Key Viewer — Read-Only**: Settings page section showing platform API keys assigned to org (masked values, assigned date). Test button per key. Read-only.
- **Sidebar Updates**: Enable People group items (Members, Invitations). Replace Usage with Analytics. Add Audit Logs. Add Settings.

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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OUI-01 | Org Admin panel at {org-slug}.llmatscale.ai/admin using shadcn sidebar | Already exists from Phase 3; sidebar updates needed to enable new items |
| OUI-02 | All Org Admin tables use TanStack Table | Use existing DataTable component with ColumnDef pattern |
| OUI-03 | All forms/modals/dialogs use shadcn components | Reuse Dialog, DropdownMenu, Badge, Button, Input patterns |
| OUI-04 | All analytics dashboards use Recharts | Reuse/adapt analytics-charts.tsx patterns from Super Admin |
| OUSR-02 | View all users with name, role, avatar, last active | DataTable with compact columns per CONTEXT.md decision |
| OUSR-03 | Edit user details (name only) | Small edit modal in side panel |
| OUSR-04 | Change user role | Dropdown + confirmation dialog pattern |
| OUSR-05 | Promote user to Org Admin | Separate action button with explicit warning dialog |
| OUSR-06 | Suspend a user | ConfirmationDialog with destructive variant |
| OUSR-07 | Activate a suspended user | Toggle action in side panel |
| OUSR-08 | Delete a user | ConfirmationDialog with cascade warning |
| OUSR-10 | View user custom instructions (read-only) | Read-only textarea in side panel |
| OUSR-11 | Force-logout a user | Uses existing force-logout API endpoint |
| OUSR-12 | View inactive users (30+ days) | Status filter with "Inactive" option derived from lastActiveAt |
| OAKEY-01 | View platform API keys assigned to org (read-only) | Settings page section with masked key display |
| OAKEY-02 | Test assigned API key validity | Test button per key (reuse test pattern from Super Admin) |
| OANA-01 | Total users (active, suspended, pending) | KPI card — query OrgMember + Invitation counts |
| OANA-02 | Total conversations and messages | KPI card — query org-scoped Conversation/Message counts |
| OANA-03 | Token usage by user, role, model | Stacked area/bar chart from UsageRecord grouped by user/role/model |
| OANA-04 | Most used models within org | Horizontal bar chart from UsageRecord grouped by model |
| OANA-05 | Top users by message count and tokens | Horizontal bar chart + table with cross-link to Members |
| OANA-06 | Per role usage breakdown | Bar chart from UsageRecord joined with OrgMember.roleId |
| OANA-07 | Daily/weekly/monthly usage trends | Area chart from UsageRecord with DATE() grouping (raw SQL) |
| OANA-08 | MCP server and tool usage frequency | Area chart from UsageRecord metadata or McpConnection activity |
| OANA-09 | Average response time per model | Bar chart from UsageRecord.requestDurationMs |
| OANA-10 | AI response error rate within org | Donut chart from Message metadata errorType |
| OANA-11 | Peak usage hours within org | CSS grid heatmap from UsageRecord hour/day grouping |
| OANA-12 | Invitation status overview | Donut/pie chart from Invitation status counts |
| OANA-13 | API key usage breakdown per assigned key | Bar chart from UsageRecord + PlatformApiKeyAssignment |
| OANA-14 | Users approaching or exceeding limits | KPI card + table from usage-service limit checks |
| OANA-15 | Inactive users report (30+ days) | Table from OrgMember where lastActiveAt < 30 days ago |
| OAUD-01 | View all admin actions within org | Server-side paginated table filtered by organizationId |
| OAUD-02 | Filter by date, action type, user | Filter bar with date range, action dropdown, user dropdown |
| OAUD-03 | Export org audit logs as CSV or JSON | Export button using audit-log-service export with org filter |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | ^8.21.3 | Data tables with sorting, filtering, pagination | Already installed; used in Super Admin tables |
| recharts | ^3.7.0 | Charts and analytics visualizations | Already installed; used in Super Admin analytics |
| @radix-ui/react-dialog | ^1.1.4 | Sheet/side panel and modal dialogs | Already installed; Sheet component wraps this |
| lucide-react | ^0.473.0 | Icons throughout admin UI | Already installed; used across all components |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| class-variance-authority | (installed) | Component variants | Badge variants, button variants |
| @radix-ui/react-dropdown-menu | ^2.1.16 | Row actions, filter dropdowns | Three-dot menus, role selector |
| @radix-ui/react-tabs | ^1.1.13 | Filter tabs on invitations | Status filter tabs |
| @radix-ui/react-checkbox | ^1.3.3 | Bulk selection checkboxes | Members table row selection |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sheet (Radix Dialog) for side panel | Custom absolute-positioned div | Sheet already exists with animations; no need to hand-roll |
| Server-side filtering | Client-side TanStack filters | Server-side needed for large user lists; consistent with audit log pattern |
| Section-based API loading | Single large analytics API | Section-based allows parallel loading with skeleton loaders per section |

**Installation:**
```bash
# No new packages needed — all dependencies already installed
```

## Architecture Patterns

### Recommended Project Structure
```
app/org/[slug]/admin/
├── layout.tsx                    # EXISTING — no changes needed
├── page.tsx                      # EXISTING — admin dashboard home
├── roles/page.tsx               # EXISTING
├── instructions/page.tsx        # EXISTING
├── mcp/page.tsx                 # EXISTING
├── security/page.tsx            # EXISTING
├── usage/page.tsx               # EXISTING → replaced by analytics/page.tsx
├── users/page.tsx               # NEW — Members page with DataTable + side panel
├── invitations/page.tsx         # NEW — Invitations page with DataTable + tabs
├── analytics/page.tsx           # NEW — Comprehensive analytics dashboard
├── audit-logs/page.tsx          # NEW — Audit logs (mirror Super Admin)
└── settings/page.tsx            # NEW — Org settings (API key viewer)

app/api/org/[slug]/admin/
├── users/route.ts               # NEW — GET list users, PATCH user details
├── users/[userId]/route.ts      # NEW — PATCH (role, status, name), DELETE
├── users/[userId]/force-logout/ # EXISTING
├── users/[userId]/force-reset/  # EXISTING
├── analytics/route.ts           # NEW — GET with ?section= parameter
├── audit-logs/route.ts          # NEW — GET paginated, GET export
├── settings/route.ts            # NEW — GET org settings
├── settings/api-keys/route.ts   # NEW — GET assigned API keys
├── settings/api-keys/[id]/test/route.ts # NEW — POST test key

lib/services/
├── org-analytics-service.ts     # NEW — org-scoped analytics queries
├── org-user-service.ts          # NEW — org user management (suspend, delete, role change)
├── audit-log-service.ts         # EXISTING — add org-scoped variant functions

components/admin/
├── org-analytics-charts.tsx     # NEW — org-specific chart components (adapting from analytics-charts.tsx)
├── user-detail-panel.tsx        # NEW — slide-out side panel for user details
├── members-table.tsx            # NEW — members DataTable with bulk actions
├── invitation-table.tsx         # NEW — invitations DataTable with filter tabs
├── org-audit-log-table.tsx      # NEW — org audit log table (mirror Super Admin)
```

### Pattern 1: DataTable Page with Server-Side Filtering (Members)
**What:** Members page uses DataTable with server-side filtering via URL parameters
**When to use:** Large datasets that need server-side pagination/filtering (users, audit logs)
**Example:**
```typescript
// Established pattern from usage/page.tsx and audit-logs page
const [users, setUsers] = useState<UserRow[]>([])
const [loading, setLoading] = useState(true)
const [filters, setFilters] = useState({ search: '', role: '', status: '' })

useEffect(() => {
  fetchUsers()
}, [filters])

async function fetchUsers() {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.role) params.set('role', filters.role)
  if (filters.status) params.set('status', filters.status)

  const res = await fetch(`/api/org/${slug}/admin/users?${params}`, {
    headers: getAuthHeaders(),
  })
  const data = await res.json()
  setUsers(data.users)
}
```

### Pattern 2: Sheet Side Panel for User Details
**What:** Clicking a user row opens a Sheet (Radix Dialog) from the right with full user details
**When to use:** Detail view that should keep the parent table visible for context
**Example:**
```typescript
// Uses existing Sheet component from components/ui/sheet.tsx
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"

<Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
  <SheetContent side="right" className="w-[40%] sm:max-w-none">
    <SheetHeader>
      <SheetTitle>User Details</SheetTitle>
    </SheetHeader>
    {/* User details, actions, custom instructions preview */}
  </SheetContent>
</Sheet>
```

### Pattern 3: Section-Based Analytics Loading
**What:** Analytics dashboard loads KPIs first, then chart sections in parallel with skeleton loaders
**When to use:** Complex dashboards with multiple data sections
**Example:**
```typescript
// Established pattern from super-admin/analytics/page.tsx
const [kpi, setKpi] = useState<KpiData | null>(null)
const [trends, setTrends] = useState<TrendData | null>(null)
// ... more section states

useEffect(() => {
  // KPI loads first (fast)
  fetchSection('kpi').then(setKpi)
  // Charts load in parallel
  Promise.all([
    fetchSection('trends').then(setTrends),
    fetchSection('users').then(setUserAnalytics),
    fetchSection('models').then(setModelAnalytics),
  ])
}, [timeRange])

async function fetchSection(section: string) {
  const res = await fetch(
    `/api/org/${slug}/admin/analytics?section=${section}&startDate=${range.startDate}&endDate=${range.endDate}`,
    { headers: getAuthHeaders() }
  )
  return res.json()
}
```

### Pattern 4: Org-Scoped Audit Log Service
**What:** Extend audit-log-service.ts with org-scoped query functions
**When to use:** Audit logs filtered to a single organization
**Example:**
```typescript
// Add to existing audit-log-service.ts or create org-specific wrapper
export async function listOrgAuditLogs(
  orgId: string,
  filters: AuditLogFilterInput
): Promise<AuditLogListResult> {
  return listAuditLogs({ ...filters, organizationId: orgId })
}

export async function exportOrgAuditLogs(
  orgId: string,
  filters: Omit<AuditLogFilterInput, 'page' | 'pageSize'>,
  format: 'csv' | 'json'
): Promise<AuditLogExportResult> {
  return exportAuditLogs({ ...filters, organizationId: orgId }, format)
}
```

### Pattern 5: Bulk Actions with Floating Bar
**What:** Checkbox selection on table rows triggers a floating action bar at the bottom
**When to use:** Tables that support multi-select operations (Members table)
**Example:**
```typescript
// TanStack Table row selection with enableRowSelection
const table = useReactTable({
  data: users,
  columns,
  enableRowSelection: true,
  onRowSelectionChange: setRowSelection,
  state: { rowSelection },
  // ... other config
})

// Floating bar when rows selected
{Object.keys(rowSelection).length > 0 && (
  <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-lg border bg-background px-4 py-3 shadow-lg">
    <span className="text-sm font-medium">
      {Object.keys(rowSelection).length} selected
    </span>
    <Button variant="outline" size="sm" onClick={handleBulkSuspend}>Suspend</Button>
    <DropdownMenu>...</DropdownMenu> {/* Change Role */}
    <Button variant="outline" size="sm" onClick={handleBulkForceLogout}>Force Logout</Button>
  </div>
)}
```

### Anti-Patterns to Avoid
- **Rebuilding existing pages:** Phase 6 extends the existing shell; never recreate the sidebar, layout, or breadcrumbs
- **Client-side pagination for large datasets:** Members and audit logs must use server-side pagination — client-side will break on orgs with 100+ users
- **Single analytics API endpoint:** Use section-based loading for perceived performance — one endpoint returning all 15 OANA metrics would be slow
- **Inline table editing:** Per CONTEXT.md, user details are read-only in the side panel; name editing uses a small modal
- **Mixing checkbox click with row click:** Checkbox selects for bulk actions; row content click opens detail panel — these must be separate handlers

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Data tables | Custom table with sorting/filtering | DataTable + @tanstack/react-table | Already built and tested; column definitions drive everything |
| Side panel | Custom positioned div with transitions | Sheet component (components/ui/sheet.tsx) | Radix Dialog with built-in focus trap, animations, overlay |
| Confirmation dialogs | Window.confirm() or custom | ConfirmationDialog component | Already exists with loading state, destructive variant |
| Toast notifications | Custom notification system | toast from components/ui/toast.tsx | Sonner integration already established |
| Action badge colors | Hardcoded color map | getActionBadgeClass() from audit-logs | Regex-based color coding already in Super Admin audit logs |
| CSV export | Custom CSV serializer | escapeCsvValue/exportAuditLogs from audit-log-service | BOM handling, proper escaping already implemented |
| Date range presets | Custom date math | getPresetRange() pattern from Super Admin analytics | 7d/30d/90d/1y calculation already standardized |
| Chart formatters | Custom number formatting | formatTokens/formatCount from analytics | Already handles K/M/B abbreviations |

**Key insight:** Phase 5 already established every UI pattern and service pattern needed. Phase 6 adapts these patterns from platform-level (cross-org) to org-level (single org), which is a scoping change, not an architectural change.

## Common Pitfalls

### Pitfall 1: Sheet Width Override
**What goes wrong:** Sheet component defaults to `sm:max-w-sm` which is too narrow for user detail panel
**Why it happens:** The default Sheet variant for "right" sets a max-width that limits the panel
**How to avoid:** Override with `className="w-[40%] sm:max-w-none"` on SheetContent. The existing sheetVariants uses `w-3/4` base with `sm:max-w-sm` — override the sm max.
**Warning signs:** Side panel appears too narrow, content overflows or truncates

### Pitfall 2: TanStack Row Selection vs Row Click Conflict
**What goes wrong:** Clicking a checkbox also triggers the row click handler (opening detail panel)
**Why it happens:** Event bubbling — checkbox click propagates up to the row
**How to avoid:** Use `e.stopPropagation()` on checkbox column cell, or check event target in row click handler to exclude checkbox clicks
**Warning signs:** Clicking checkbox both selects row AND opens detail panel

### Pitfall 3: Recharts v3 Tooltip Type Casting
**What goes wrong:** TypeScript errors on Tooltip formatter and labelFormatter props
**Why it happens:** Recharts v3 has strict TypeScript types that don't match the runtime API (known React 19 compatibility issue)
**How to avoid:** Use `as any` casts on formatter props — this is the established project pattern per decision [05-06]
**Warning signs:** TypeScript compilation errors on chart tooltip props

### Pitfall 4: tenantDb vs raw prisma for Org Analytics
**What goes wrong:** Analytics queries using tenantDb can't access cross-table data needed for some metrics
**Why it happens:** tenantDb auto-filters by organizationId, but some tables (User, Session, PlatformApiKey) are not org-scoped
**How to avoid:** Use raw `prisma` with explicit `organizationId` filter for queries that join non-org-scoped tables. Use tenantDb only for org-scoped models (UsageRecord, Conversation, Message, OrgMember, etc.)
**Warning signs:** Empty results for queries that should return data; relation errors on non-org-scoped tables

### Pitfall 5: Audit Log Org Filter Missing
**What goes wrong:** Org audit logs show platform-level actions or actions from other orgs
**Why it happens:** Forgetting to pass organizationId filter to audit-log-service
**How to avoid:** Always pass `organizationId` to the filter — the existing service buildWhereClause already supports it
**Warning signs:** Org Admin sees Super Admin actions or cross-org data

### Pitfall 6: Analytics Usage Page Replacement
**What goes wrong:** Both /usage and /analytics pages exist, causing confusion
**Why it happens:** Forgetting to remove or redirect the old usage page
**How to avoid:** Replace the existing usage/page.tsx with a redirect to analytics, or delete it and update sidebar. The sidebar entry must change from "Usage" to "Analytics"
**Warning signs:** Two similar pages accessible, sidebar shows old "Usage" link

### Pitfall 7: Inactive User Status Derivation
**What goes wrong:** Inactive status conflicts with Suspended status
**Why it happens:** "Inactive" is derived from lastActiveAt (30+ days) while "Suspended" is an explicit admin action. A suspended user who was also inactive should show "Suspended" not "Inactive"
**How to avoid:** Priority order: Suspended > Inactive > Active. Only derive "Inactive" if the user's status is "ACTIVE" AND lastActiveAt is older than 30 days
**Warning signs:** Suspended users showing as "Inactive"

## Code Examples

### Org User Management Service Pattern
```typescript
// lib/services/org-user-service.ts
// Pattern from existing service files

import prisma from '@/lib/db';
import type { TenantPrismaClient } from '@/lib/tenant';
import { auditLog, type PrismaTransactionClient } from './audit-service';

export async function listOrgMembers(
  orgId: string,
  filters: { search?: string; role?: string; status?: string }
) {
  const where: any = { organizationId: orgId };

  if (filters.status === 'inactive') {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    where.status = 'ACTIVE';
    where.lastActiveAt = { lt: thirtyDaysAgo };
  } else if (filters.status) {
    where.status = filters.status.toUpperCase();
  }

  if (filters.role) {
    where.roleId = filters.role;
  }

  const members = await prisma.orgMember.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true, avatarBase64: true } },
      role: { select: { id: true, name: true } },
    },
    orderBy: { joinedAt: 'desc' },
  });

  // Text search filter (name/email)
  if (filters.search) {
    const s = filters.search.toLowerCase();
    return members.filter(m =>
      m.user.name.toLowerCase().includes(s) ||
      m.user.email.toLowerCase().includes(s)
    );
  }

  return members;
}

export async function suspendOrgMember(
  orgId: string,
  userId: string,
  actorId: string,
  ipAddress: string
) {
  return prisma.$transaction(async (tx) => {
    // SAFE-01: Cannot suspend self
    if (userId === actorId) {
      throw new Error('Cannot suspend yourself');
    }

    const member = await tx.orgMember.findFirst({
      where: { userId, organizationId: orgId },
      include: { role: true },
    });

    if (!member) throw new Error('User not found in this organization');

    // SAFE-02: Check if this would remove the last admin
    if (member.role.permissions && (member.role.permissions as string[]).includes('org_admin')) {
      const adminCount = await tx.orgMember.count({
        where: {
          organizationId: orgId,
          status: 'ACTIVE',
          role: { permissions: { array_contains: ['org_admin'] } },
        },
      });
      if (adminCount <= 1) throw new Error('Cannot suspend the last Org Admin');
    }

    const updated = await tx.orgMember.update({
      where: { id: member.id },
      data: { status: 'SUSPENDED' },
    });

    // Revoke all sessions
    await tx.session.deleteMany({
      where: { userId, organizationId: orgId },
    });

    await auditLog.record(tx as unknown as PrismaTransactionClient, {
      organizationId: orgId,
      userId: actorId,
      action: 'user.suspended',
      targetType: 'OrgMember',
      targetId: member.id,
      metadata: { userName: member.userId },
      ipAddress,
    });

    return updated;
  });
}
```

### Org Analytics API Pattern
```typescript
// app/api/org/[slug]/admin/analytics/route.ts
// Pattern from super-admin/analytics API

import { NextRequest, NextResponse } from 'next/server';
import { requireOrgAdmin } from '@/lib/auth-middleware';
import * as orgAnalytics from '@/lib/services/org-analytics-service';

export async function GET(req: NextRequest) {
  const auth = await requireOrgAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const section = searchParams.get('section') || 'kpi';
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const orgId = auth.organization.id;

  const dateRange = {
    startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    endDate: endDate || new Date().toISOString().slice(0, 10),
  };

  switch (section) {
    case 'kpi':
      return NextResponse.json(await orgAnalytics.getKpiSummary(orgId));
    case 'trends':
      return NextResponse.json(await orgAnalytics.getUsageTrends(orgId, dateRange));
    case 'users':
      return NextResponse.json(await orgAnalytics.getTopUsers(orgId, dateRange));
    case 'models':
      return NextResponse.json(await orgAnalytics.getModelUsage(orgId, dateRange));
    // ... more sections
    default:
      return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
  }
}
```

### Members DataTable Column Definitions
```typescript
// Compact columns per CONTEXT.md decision
const columns: ColumnDef<UserRow>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        onClick={(e) => e.stopPropagation()}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
  },
  {
    accessorKey: "user",
    header: ({ column }) => <DataTableColumnHeader column={column} title="User" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">...</Avatar>
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "role",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Role" />,
    cell: ({ row }) => <Badge variant="outline">{row.original.roleName}</Badge>,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Status" />,
    cell: ({ row }) => {
      const status = row.original.status // Active | Suspended | Inactive
      const colors = {
        Active: "bg-green-500/10 text-green-700 border-green-500/20",
        Suspended: "bg-red-500/10 text-red-700 border-red-500/20",
        Inactive: "bg-gray-500/10 text-gray-500 border-gray-500/20",
        Pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
      }
      return <Badge variant="outline" className={colors[status]}>{status}</Badge>
    },
  },
  {
    accessorKey: "lastActiveAt",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Last Active" />,
    cell: ({ row }) => formatRelativeTime(row.original.lastActiveAt),
  },
]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate Usage page (Phase 4) | Comprehensive Analytics dashboard | Phase 6 | Usage page replaced; all OANA metrics on one page |
| Disabled sidebar items with "Soon" badges | Enabled sidebar links | Phase 6 | Members, Invitations become functional |
| No org audit log UI | Mirror Super Admin audit log pattern | Phase 6 | Full audit trail visibility for Org Admins |

**Deprecated/outdated:**
- `/org/[slug]/admin/usage` route — replaced by `/org/[slug]/admin/analytics`

## Open Questions

1. **MCP Usage Analytics Data Source (OANA-08)**
   - What we know: UsageRecord tracks model usage but not MCP tool invocations specifically. McpConnection has no usage counter.
   - What's unclear: Whether MCP tool usage is tracked in message metadata or needs a separate tracking mechanism
   - Recommendation: Check if chat/route.ts logs MCP tool usage in message metadata. If not, this metric may return empty data initially, which is acceptable (same pattern as SANA-10 and error rates in Phase 5).

2. **API Key Usage Breakdown (OANA-13)**
   - What we know: UsageRecord doesn't directly track which API key was used for each request
   - What's unclear: How to attribute usage to specific API keys when multiple keys may be assigned to an org
   - Recommendation: If the org has only one API key assigned, attribute all usage to it. If multiple, this metric may need to show aggregate org usage with a note. This mirrors the platform-level approach.

3. **Bulk Action Concurrency**
   - What we know: Bulk suspend/role-change on multiple users happens via sequential API calls
   - What's unclear: Whether to use Promise.allSettled for parallel execution or sequential for predictability
   - Recommendation: Use Promise.allSettled for better UX (don't block on one failure), report partial success/failures via toast.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `components/admin/data-table.tsx`, `components/admin/analytics-charts.tsx`, `components/admin/kpi-card.tsx` — verified TanStack Table v8 and Recharts v3 patterns
- Existing codebase: `app/super-admin/audit-logs/page.tsx`, `app/super-admin/analytics/page.tsx` — verified audit log and analytics page patterns
- Existing codebase: `lib/services/audit-log-service.ts`, `lib/services/platform-analytics-service.ts` — verified service layer patterns
- Existing codebase: `components/ui/sheet.tsx` — verified Sheet component with side variants and animations
- Existing codebase: `prisma/schema.prisma` — verified OrgMember, Invitation, AuditLog, UsageRecord models
- Existing codebase: `app/org/[slug]/admin/layout.tsx` — verified org admin layout with AdminSidebar
- Existing codebase: `components/admin/admin-sidebar.tsx` — verified sidebar nav groups with enabled/disabled items

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions — user-specified UX patterns (side panel, bulk actions, filter tabs)
- REQUIREMENTS.md — requirement definitions for OUSR, OAKEY, OANA, OAUD, OUI IDs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - all libraries already installed and used in Super Admin dashboard; no new dependencies needed
- Architecture: HIGH - all patterns (DataTable page, section-based analytics, server-side pagination, audit log mirror) are direct adaptations of existing Super Admin patterns
- Pitfalls: HIGH - identified from real codebase patterns (Sheet width, Recharts types, tenantDb scoping, status derivation)

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable — internal patterns, no external dependency changes expected)
