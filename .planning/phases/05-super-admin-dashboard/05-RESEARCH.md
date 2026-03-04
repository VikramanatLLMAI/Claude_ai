# Phase 5: Super Admin Dashboard - Research

**Researched:** 2026-03-04
**Domain:** Admin dashboard UI (TanStack Table, Recharts, route restructuring, API key management, platform settings, analytics, audit logs)
**Confidence:** HIGH

## Summary

Phase 5 completes the Super Admin management panel by implementing all remaining sidebar sections, upgrading tables to TanStack Table, adding Recharts analytics, and restructuring routes from `/admin/*` to `/super-admin/*`. The existing shell (sidebar, layout, Model Registry page) from Phase 3 provides the foundation -- Phase 5 extends it.

The route restructure (`/admin` to `/super-admin`) is a significant migration touching pages, API routes, sidebar nav items, layout auth guards, and all internal links. This should be done first as a standalone task to avoid conflicts. TanStack Table v8.21.3 is compatible with React 19 and is headless (no built-in styles), meaning all table styling uses existing Tailwind/shadcn patterns. Recharts 3.7.0 is already installed. For the heatmap chart (SANA-08), Recharts lacks a native heatmap component -- use a custom CSS grid with colored cells (simple, no extra library needed).

**Primary recommendation:** Start with route restructure, then build reusable DataTable component wrapping TanStack Table, then implement pages section-by-section (API Keys, Settings, System Prompt, Analytics, Audit Logs), upgrading the Model Registry table last.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **Route Restructure**: Rename `/admin/*` to `/super-admin/*`, `/api/admin/*` to `/api/super-admin/*`, production subdomain `super-admin.llmatscale.ai`
- **Sidebar Navigation**: Upgrade from flat list to grouped sections (Management, Monitoring, Configuration) using existing `SidebarGroup`/`SidebarGroupLabel` components
- **Page Header Pattern**: Every admin page uses consistent header bar: breadcrumb trail + page title + primary action button(s) at top right
- **Analytics Dashboard**: Single scrolling page with KPI summary cards, time range controls (7d/30d/90d/1y + custom date range picker), specific chart types per requirement
- **Data Tables (TanStack Table)**: All admin tables use TanStack Table with sorting, filtering, pagination. Classic numbered pages, inline column filters, three-dot row actions dropdown
- **API Key Management**: Add key modal with name/paste key/org multi-select/test button. Masked display (first 7 + last 4 chars). Multi-org assignment. Inline test status badge
- **Platform Settings**: Two-section page (General Settings + Feature Toggles grid). Explicit save with unsaved changes indicator. No auto-save
- **Platform System Prompt**: Separate sidebar item under Configuration group, dedicated page, uses existing instruction editor pattern
- **Audit Logs**: TanStack Table with sorting/filtering/pagination, date range + org + action type + user filters, CSV and JSON export
- **Model Registry table**: Upgrade existing custom table to TanStack Table, preserve generation grouping feature

### Claude's Discretion
- Exact chart dimensions, colors, and spacing within Recharts
- Loading skeleton designs for each page
- Error state handling across all pages
- TanStack Table column widths and responsive behavior
- Exact modal/form field ordering and validation messages
- API endpoint structure for analytics aggregation queries

### Deferred Ideas (OUT OF SCOPE)
- SAUD-04 (User impersonation for support) -- belongs in Phase 7
- Dashboard widget customization/rearrangement -- future enhancement
- Real-time analytics auto-refresh -- manual refresh button instead
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| SUI-01 | Super Admin panel at admin.llmatscale.ai using shadcn sidebar | Route restructure to `/super-admin/*`; existing sidebar shell extended with grouped navigation |
| SUI-02 | All Super Admin tables use TanStack Table with sorting, filtering, pagination | Reusable DataTable component wrapping `@tanstack/react-table` v8.21.3 |
| SUI-03 | All forms/modals/dialogs use shadcn components | Existing Radix UI wrappers (Dialog, DropdownMenu, Switch, Tabs, etc.) already available |
| SUI-04 | All analytics dashboards use Recharts | Recharts 3.7.0 already installed; AreaChart, BarChart, PieChart for analytics; custom grid for heatmap |
| SKEY-01 | Add API keys per AI provider | PlatformApiKey model exists; needs schema update for multi-org assignment (junction table) |
| SKEY-02 | Remove API keys | Delete endpoint with confirmation dialog |
| SKEY-03 | Test API key validity | `Anthropic({ apiKey }).messages.create()` with minimal request to validate key |
| SKEY-04 | Assign API keys to organizations | Multi-org junction table `PlatformApiKeyAssignment`; multi-select dropdown in modal |
| SSET-01 | Manage platform-wide settings | New PlatformSettings model (singleton); General settings section |
| SSET-02 | Enable/disable features platform-wide | Feature toggles stored in PlatformSettings JSON; switch grid UI |
| SANA-01 | Total organizations with growth over time | Aggregate query on Organization model with status breakdown |
| SANA-02 | Total users with active/suspended breakdown | Aggregate on OrgMember with status filter |
| SANA-03 | Total conversations and messages | Count queries on Conversation and Message models |
| SANA-04 | Token consumption by org/model | Aggregate UsageRecord grouped by org + model; stacked area chart |
| SANA-05 | Daily/weekly/monthly usage trends | Raw SQL DATE() grouping on UsageRecord (pattern from Phase 4) |
| SANA-06 | Top orgs by usage | Aggregate UsageRecord grouped by org, sorted DESC; horizontal bar chart |
| SANA-07 | AI error rate by type | Need error tracking (metadata on UsageRecord or separate); donut chart |
| SANA-08 | Peak usage hours | Aggregate by EXTRACT(HOUR) + EXTRACT(DOW); custom CSS heatmap grid |
| SANA-09 | API key consumption per org/provider | Aggregate UsageRecord joined with PlatformApiKey assignment |
| SANA-10 | MCP tool usage trends | Aggregate from Message model where role='tool'; line/area chart |
| SANA-11 | New orgs/users registered over time | Aggregate by createdAt/joinedAt DATE() grouping |
| SANA-12 | Feature adoption trends | Track feature usage in UsageRecord metadata or derive from data patterns |
| SAUD-01 | View audit logs for all admin actions | AuditLog model exists with indexes; paginated query with TanStack Table |
| SAUD-02 | Filter by date, org, action type, user | Prisma where clause composition; inline column filters |
| SAUD-03 | Export as CSV or JSON | Server-side streaming export endpoint; client-side download trigger |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @tanstack/react-table | 8.21.3 | Headless data tables | Industry standard for React tables; headless = full styling control with Tailwind |
| recharts | 3.7.0 | Charts and analytics | Already installed; React-native charting with composable components |
| Next.js | 16.1.4 | Framework | Already in use |
| Prisma | 7.3.0 | Database ORM | Already in use; raw SQL for date aggregations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| date-fns | (check if installed) | Date formatting/manipulation | Date range picker, chart axis formatting |
| lucide-react | 0.473.0 | Icons | Already installed; all admin page icons |
| zod | 4.3.6 | Validation | Already installed; new schemas for API keys, settings, audit filters |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom CSS heatmap | nivo/heatmap | Extra dependency for one chart; CSS grid is simpler |
| TanStack Table | AG Grid | AG Grid is heavier, paid for enterprise features; TanStack is headless + free |

**Installation:**
```bash
npm install @tanstack/react-table
```

Note: Recharts is already installed. TanStack Table v8.21.3 works with React 19 (confirmed). May need `--legacy-peer-deps` if peer dependency issues arise (same pattern as Recharts install in Phase 4).

## Architecture Patterns

### Route Restructure Map

```
BEFORE (Phase 3/4)              AFTER (Phase 5)
─────────────────────            ─────────────────────
app/admin/                   →   app/super-admin/
  layout.tsx                 →     layout.tsx
  page.tsx                   →     page.tsx
  login/page.tsx             →     login/page.tsx
  models/page.tsx            →     models/page.tsx
  [...catchAll]/page.tsx     →     [...catchAll]/page.tsx
  + NEW pages                      organizations/page.tsx
                                   super-admins/page.tsx
                                   api-keys/page.tsx
                                   settings/page.tsx
                                   system-prompt/page.tsx
                                   analytics/page.tsx
                                   audit-logs/page.tsx

app/api/admin/               →   app/api/super-admin/
  organizations/             →     organizations/
  super-admins/              →     super-admins/
  models/                    →     models/
  role-templates/            →     role-templates/
  + NEW routes                     api-keys/
                                   settings/
                                   system-prompt/
                                   analytics/
                                   audit-logs/
```

**Files requiring path updates:**
- `components/admin/admin-sidebar.tsx`: All `SUPER_ADMIN_NAV_ITEMS` hrefs (`/admin/*` to `/super-admin/*`), sign-out redirect
- `app/admin/layout.tsx` to `app/super-admin/layout.tsx`: Login page path check, redirect paths
- `app/admin/login/page.tsx` to `app/super-admin/login/page.tsx`: Post-login redirect path
- `lib/proxy.ts` or routing config: If subdomain mapping exists
- Any component importing from `@/app/admin/*`
- `requireSuperAdmin()` middleware: If it references `/admin/` paths
- Org user redirect in layout: `/admin/login` to `/super-admin/login`
- Phase 4 decision [04-12]: `isSuperAdmin` localStorage check in layout

### Recommended Project Structure for New Pages

```
app/super-admin/
├── layout.tsx                    # Auth guard + SidebarProvider (migrated)
├── page.tsx                      # Root redirect → /super-admin/models
├── login/page.tsx                # Super Admin login (migrated)
├── models/page.tsx               # Model Registry (migrated, upgraded to TanStack Table)
├── organizations/page.tsx        # Org management table + CRUD modals
├── super-admins/page.tsx         # SA management table + CRUD modals
├── api-keys/page.tsx             # API key management table + add/test modals
├── settings/page.tsx             # Platform settings form + feature toggles
├── system-prompt/page.tsx        # Platform system prompt editor
├── analytics/page.tsx            # Full analytics dashboard (scrolling)
├── audit-logs/page.tsx           # Audit log viewer with filters + export
└── [...catchAll]/page.tsx        # Catch-all redirect (migrated)

components/admin/
├── admin-sidebar.tsx             # Updated nav items + grouped layout
├── admin-breadcrumb.tsx          # Already pathname-based (auto-adapts)
├── data-table.tsx                # NEW: Reusable TanStack Table wrapper
├── data-table-pagination.tsx     # NEW: Pagination controls
├── data-table-column-header.tsx  # NEW: Sortable column header
├── model-registry-table.tsx      # Upgraded to TanStack Table
├── api-key-form.tsx              # NEW: API key add/edit modal
├── platform-settings-form.tsx    # NEW: Settings form
├── analytics-charts.tsx          # NEW: Chart components
└── [existing files...]           # Unchanged
```

### Pattern 1: Reusable DataTable Component (TanStack Table)

**What:** A single reusable `<DataTable>` component that wraps TanStack Table with consistent styling, pagination, column filters, and row actions.
**When to use:** Every admin table (Organizations, Super Admins, API Keys, Audit Logs, Models).

```typescript
// components/admin/data-table.tsx
"use client"

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table"
import { useState } from "react"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  pageSize?: number
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageSize = 10,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
    initialState: { pagination: { pageSize } },
  })

  return (
    <div>
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b bg-muted/50">
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-3 text-left text-sm font-medium">
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b hover:bg-muted/30">
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-3 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination controls */}
    </div>
  )
}
```

### Pattern 2: Analytics KPI Card

**What:** Consistent summary cards for analytics dashboard.
**When to use:** Top of analytics page for key metrics.

```typescript
// Reuses existing Card component from shadcn
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

function KpiCard({ title, value, subtitle, icon: Icon }: {
  title: string; value: string | number; subtitle?: string; icon: React.ElementType
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  )
}
```

### Pattern 3: Row Actions Dropdown

**What:** Three-dot menu at end of each table row with context-specific actions.
**When to use:** Every data table row.

```typescript
// Column definition for row actions
const actionsColumn: ColumnDef<OrgRow> = {
  id: "actions",
  cell: ({ row }) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleEdit(row.original)}>Edit</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleSuspend(row.original)}>Suspend</DropdownMenuItem>
        <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(row.original)}>
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
}
```

### Pattern 4: Recharts Stacked Area Chart

**What:** Usage trend visualization with multi-series stacking.
**When to use:** SANA-04, SANA-05 usage trend charts.

```typescript
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

<ResponsiveContainer width="100%" height={300}>
  <AreaChart data={trendData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Area type="monotone" dataKey="org1" stackId="1" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
    <Area type="monotone" dataKey="org2" stackId="1" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
  </AreaChart>
</ResponsiveContainer>
```

### Pattern 5: Custom Heatmap Grid (SANA-08)

**What:** CSS grid-based heatmap for peak usage hours since Recharts lacks native heatmap support.
**When to use:** SANA-08 peak usage hours visualization.

```typescript
// Custom heatmap using CSS grid + colored cells
// Data: { hour: 0-23, day: 0-6, count: number }[]
function UsageHeatmap({ data }: { data: HeatmapCell[] }) {
  const maxCount = Math.max(...data.map(d => d.count))
  const getColor = (count: number) => {
    const intensity = count / maxCount
    // Green scale: lighter = less usage, darker = more
    return `rgba(34, 197, 94, ${0.1 + intensity * 0.8})`
  }

  return (
    <div className="grid grid-cols-[auto_repeat(24,1fr)] gap-0.5">
      {/* Day labels column + 24 hour columns */}
      {/* Each cell colored by intensity */}
    </div>
  )
}
```

### Anti-Patterns to Avoid
- **Don't create separate table components per page:** Use one `DataTable<T>` with typed columns. Column definitions are page-specific, but the table shell is shared.
- **Don't fetch all analytics data in one API call:** Split into separate endpoints per section (KPIs, trends, top orgs, errors, etc.) for independent loading and caching.
- **Don't auto-save platform settings:** CONTEXT.md explicitly says "no auto-save" to prevent accidental feature toggle changes affecting all orgs.
- **Don't store raw API keys in state:** Always use masked display. Only pass raw key from input to API on create; API returns masked version.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Data table sorting/filtering/pagination | Custom sort/filter logic | `@tanstack/react-table` getSortedRowModel, getFilteredRowModel, getPaginationRowModel | Edge cases with multi-column sort, filter debouncing, page boundary math |
| Chart rendering | SVG path calculations | `recharts` AreaChart, BarChart, PieChart | Responsive containers, tooltips, animations, axis formatting |
| API key encryption | Custom crypto | `lib/encryption.ts` encrypt/decrypt (AES-256-GCM) | Already tested and used for MCP credentials |
| Date formatting | Manual string manipulation | `date-fns` or `Intl.DateTimeFormat` | Locale-aware, timezone-correct |
| CSV export | Manual string building | Simple map + join with proper escaping | But do handle commas in values, newlines, Unicode BOM for Excel |

**Key insight:** TanStack Table is headless -- it handles data logic (sorting, filtering, pagination state) but NOT rendering. All visual output uses existing shadcn/Tailwind patterns. This is the correct approach for maintaining visual consistency with the existing admin shell.

## Common Pitfalls

### Pitfall 1: Route Restructure Breaking Existing Functionality
**What goes wrong:** Moving `/admin` to `/super-admin` breaks hardcoded paths in localStorage session checks, redirect logic, breadcrumb parsing, and API fetch calls.
**Why it happens:** Path references are scattered across layout guards, sidebar nav items, login pages, API routes, and frontend fetch calls.
**How to avoid:** Do a global search for `/admin` (literal string) across the entire codebase. Create a checklist of every file containing this string. Update all at once in a single task.
**Warning signs:** 404s on navigation, redirect loops, breadcrumb showing wrong path segments.

### Pitfall 2: PlatformApiKey Schema Mismatch with Multi-Org Assignment
**What goes wrong:** Current schema has `organizationId` as a single FK on PlatformApiKey (one key = one org). CONTEXT.md requires one key assigned to multiple orgs.
**Why it happens:** Schema was designed before multi-org assignment decision.
**How to avoid:** Create a junction table `PlatformApiKeyAssignment` (keyId + orgId). Keep `organizationId` nullable on PlatformApiKey for backward compat OR remove it and use junction table exclusively. Recommended: junction table approach.
**Warning signs:** Can only assign one org per key in the UI.

### Pitfall 3: TanStack Table Server-Side vs Client-Side Pagination
**What goes wrong:** Loading all data client-side for large datasets (audit logs can be thousands of rows).
**Why it happens:** TanStack Table defaults to client-side pagination.
**How to avoid:** For audit logs specifically, use server-side pagination (pass page/pageSize to API, return total count). For smaller tables (orgs, super admins, API keys), client-side pagination is fine.
**Warning signs:** Slow initial load, high memory usage on audit logs page.

### Pitfall 4: Recharts 3.x API Changes
**What goes wrong:** Using Recharts 2.x patterns that changed in 3.x.
**Why it happens:** Most online examples are for Recharts 2.x.
**How to avoid:** The existing org admin usage page already uses Recharts 3.x successfully (BarChart pattern). Follow that exact import/usage pattern. Key 3.x change: `Customized` component is deprecated; use render props or custom components instead.
**Warning signs:** TypeScript errors on Recharts components, missing props.

### Pitfall 5: Analytics SQL Queries Performance
**What goes wrong:** Complex aggregation queries (multi-org, multi-model, date ranges) become slow.
**Why it happens:** Prisma's `groupBy` lacks date truncation; raw SQL needed for DATE()/EXTRACT() functions.
**How to avoid:** Use raw SQL (`prisma.$queryRaw`) for all date-grouped analytics queries (established pattern from Phase 4). Add appropriate indexes. Consider caching analytics responses (analytics data is not real-time critical).
**Warning signs:** Analytics page taking >3s to load.

### Pitfall 6: Feature Toggle Side Effects
**What goes wrong:** Toggling a platform feature (e.g., "disable file uploads") doesn't actually enforce it in the chat API.
**Why it happens:** Feature toggles stored in PlatformSettings but chat API doesn't check them.
**How to avoid:** Phase 5 creates the settings UI and storage. Enforcement in chat API can be wired incrementally. Document which toggles are "UI only" vs "enforced" in Phase 5.
**Warning signs:** User can still use features after Super Admin disables them.

## Code Examples

### TanStack Table Column Definition with Inline Filter

```typescript
import { ColumnDef } from "@tanstack/react-table"
import { Input } from "@/components/ui/input"

// Column header with sort + filter
function SortableFilterHeader({ column, title }: { column: any; title: string }) {
  return (
    <div className="space-y-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="-ml-3 h-8"
      >
        {title}
        {column.getIsSorted() === "asc" ? <ChevronUp className="ml-1 h-3 w-3" /> :
         column.getIsSorted() === "desc" ? <ChevronDown className="ml-1 h-3 w-3" /> :
         <ChevronsUpDown className="ml-1 h-3 w-3" />}
      </Button>
      <Input
        placeholder={`Filter ${title.toLowerCase()}...`}
        value={(column.getFilterValue() as string) ?? ""}
        onChange={(e) => column.setFilterValue(e.target.value)}
        className="h-7 text-xs"
      />
    </div>
  )
}

const columns: ColumnDef<Organization>[] = [
  {
    accessorKey: "name",
    header: ({ column }) => <SortableFilterHeader column={column} title="Name" />,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <SortableFilterHeader column={column} title="Status" />,
    cell: ({ row }) => (
      <Badge variant={row.original.status === "ACTIVE" ? "default" : "destructive"}>
        {row.original.status}
      </Badge>
    ),
  },
  // ... more columns
]
```

### Pagination Controls

```typescript
function DataTablePagination({ table }: { table: any }) {
  return (
    <div className="flex items-center justify-between px-2 py-4">
      <div className="text-sm text-muted-foreground">
        {table.getFilteredRowModel().rows.length} row(s) total
      </div>
      <div className="flex items-center gap-2">
        <select
          value={table.getState().pagination.pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          className="h-8 rounded-md border px-2 text-sm"
        >
          {[10, 25, 50].map((size) => (
            <option key={size} value={size}>Show {size}</option>
          ))}
        </select>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
            Previous
          </Button>
          <span className="flex items-center text-sm px-2">
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </span>
          <Button size="sm" variant="outline" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}
```

### API Key Test Endpoint Pattern

```typescript
// Test key validity by making a minimal Anthropic API call
import Anthropic from "@anthropic-ai/sdk"

async function testApiKey(decryptedKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const client = new Anthropic({ apiKey: decryptedKey })
    // Minimal request to validate key
    await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1,
      messages: [{ role: "user", content: "test" }],
    })
    return { valid: true }
  } catch (error: any) {
    if (error?.status === 401) return { valid: false, error: "Invalid API key" }
    if (error?.status === 403) return { valid: false, error: "Key lacks permissions" }
    // Other errors (rate limit, network) -- key may be valid
    return { valid: false, error: error.message || "Connection error" }
  }
}
```

### CSV Export Pattern

```typescript
// Server-side CSV generation for audit logs
function generateCsv(rows: AuditLogRow[]): string {
  const BOM = "\uFEFF" // UTF-8 BOM for Excel compatibility
  const headers = ["Date", "User", "Action", "Target", "Organization", "IP Address"]
  const escape = (val: string) => `"${(val || "").replace(/"/g, '""')}"`

  const csvRows = rows.map(row => [
    escape(new Date(row.createdAt).toISOString()),
    escape(row.user?.name || row.user?.email || "System"),
    escape(row.action),
    escape(`${row.targetType || ""}:${row.targetId || ""}`),
    escape(row.organization?.name || "Platform"),
    escape(row.ipAddress || ""),
  ].join(","))

  return BOM + [headers.join(","), ...csvRows].join("\n")
}
```

### PlatformSettings Singleton Pattern

```typescript
// Schema addition needed:
// model PlatformSettings {
//   id                  String   @id @default("singleton")
//   platformName        String   @default("LLMatscale.ai")
//   sessionExpiryDays   Int      @default(30)
//   maintenanceMode     Boolean  @default(false)
//   featureToggles      Json     @default("{}")
//   createdAt           DateTime @default(now())
//   updatedAt           DateTime @updatedAt
//   @@map("platform_settings")
// }

// Service: upsert pattern for singleton
async function getPlatformSettings() {
  return prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  })
}

async function updatePlatformSettings(data: Partial<PlatformSettingsInput>) {
  return prisma.platformSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  })
}
```

## Schema Changes Required

### 1. PlatformSettings Model (NEW)
```prisma
model PlatformSettings {
  id                String   @id @default("singleton")
  platformName      String   @default("LLMatscale.ai") @map("platform_name")
  sessionExpiryDays Int      @default(30) @map("session_expiry_days")
  maintenanceMode   Boolean  @default(false) @map("maintenance_mode")
  featureToggles    Json     @default("{}") @map("feature_toggles")
  createdAt         DateTime @default(now()) @map("created_at")
  updatedAt         DateTime @updatedAt @map("updated_at")

  @@map("platform_settings")
}
```

Feature toggles JSON structure:
```json
{
  "webSearch": true,
  "fileUploads": true,
  "mcpTools": true,
  "artifactGeneration": true,
  "extendedThinking": true
}
```

### 2. PlatformApiKeyAssignment Junction Table (NEW)
```prisma
model PlatformApiKeyAssignment {
  id             String   @id @default(uuid())
  apiKeyId       String   @map("api_key_id")
  organizationId String   @map("organization_id")
  assignedAt     DateTime @default(now()) @map("assigned_at")

  apiKey       PlatformApiKey @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)
  organization Organization   @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([apiKeyId, organizationId])
  @@map("platform_api_key_assignments")
}
```

This replaces the single `organizationId` FK on PlatformApiKey to support multi-org assignment.

### 3. PlatformApiKey Model Update
Remove `organizationId` field, add relation to junction table:
```prisma
model PlatformApiKey {
  id           String    @id @default(uuid())
  provider     String    @default("anthropic")
  name         String
  encryptedKey String    @map("encrypted_key") @db.Text
  lastTestedAt DateTime? @map("last_tested_at")
  isActive     Boolean   @default(true) @map("is_active")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  assignments PlatformApiKeyAssignment[]

  @@index([provider])
  @@map("platform_api_keys")
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Recharts 2.x `Customized` component | Recharts 3.x custom components / render props | Recharts 3.0 (2024) | Use custom components, not `Customized` wrapper |
| react-table 7 (component-based) | @tanstack/react-table 8 (headless hooks) | TanStack Table 8.0 (2022) | No pre-built UI; define columns + use hooks |
| Super Admin flat nav list | Grouped nav sections (Management/Monitoring/Configuration) | Phase 5 decision | Mirrors org admin pattern for consistency |

**Deprecated/outdated:**
- `react-table` package (v7): Replaced by `@tanstack/react-table` v8. Different API entirely.
- Recharts `Customized` component: Deprecated in 3.0. Use custom components.

## Open Questions

1. **SANA-07 Error Tracking**: The current UsageRecord model does not have an error type field. AI errors would need to be tracked either by:
   - Adding an `errorType` field to UsageRecord (schema change)
   - Using the `metadata` JSON field to store error info
   - Parsing from a separate error log
   - **Recommendation:** Use UsageRecord metadata field `{ errorType: "rate_limit" | "overloaded" | "invalid_request" | null }` -- no schema change needed, just track in chat API response handler.

2. **SANA-09 API Key Consumption**: Currently UsageRecord does not track which PlatformApiKey was used for the request. Two options:
   - Add `platformApiKeyId` to UsageRecord (schema change)
   - Derive from org assignment (which key is assigned to the org at query time)
   - **Recommendation:** Derive from assignment. Since each org has assigned keys, aggregate usage by org and join with assignments. If an org has multiple keys, the exact key used is less important than per-org consumption.

3. **SANA-12 Feature Adoption**: What constitutes "feature adoption"? Possible metrics:
   - % of orgs using web search, file uploads, MCP tools, artifacts
   - Derived from UsageRecord metadata or Message content types
   - **Recommendation:** Count orgs with at least one usage of each feature in the time period, derive from existing data (no new tracking needed).

4. **PlatformSettings Enforcement Scope**: Phase 5 creates the settings UI and storage. Should feature toggles be enforced in the chat API during Phase 5, or just stored?
   - **Recommendation:** Store in Phase 5, enforce in a later phase. The chat API is a critical path and enforcement needs careful testing. Phase 5 focuses on the admin UI.

5. **Server-Side vs Client-Side Pagination for Audit Logs**: Audit logs can grow to thousands of entries. Server-side pagination is recommended.
   - **Recommendation:** Server-side pagination for audit logs only. All other tables (orgs, SAs, API keys) are small enough for client-side.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `prisma/schema.prisma`, `components/admin/admin-sidebar.tsx`, `app/admin/layout.tsx`, `app/org/[slug]/admin/usage/page.tsx` -- current code patterns
- `package.json` -- Recharts 3.7.0 already installed, TanStack Table not yet installed
- `05-CONTEXT.md` -- All user decisions and code context

### Secondary (MEDIUM confidence)
- [TanStack Table npm](https://www.npmjs.com/package/@tanstack/react-table) -- v8.21.3 latest, React 19 compatible
- [TanStack Table Installation Docs](https://tanstack.com/table/v8/docs/installation) -- React 19 confirmed with caveats about React Compiler
- [Recharts GitHub Issue #237](https://github.com/recharts/recharts/issues/237) -- No native heatmap support confirmed
- [Recharts 3.0 Migration Guide](https://github.com/recharts/recharts/wiki/3.0-migration-guide) -- Customized component deprecated

### Tertiary (LOW confidence)
- SANA-07 error tracking approach -- needs validation that metadata field is sufficient for error categorization
- SANA-12 feature adoption derivation -- assumes features can be detected from existing data

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - TanStack Table and Recharts are well-established; versions confirmed via npm
- Architecture: HIGH - Route restructure is mechanical; patterns established in Phase 3/4
- Schema changes: HIGH - PlatformSettings and junction table are standard Prisma patterns
- Analytics queries: MEDIUM - Raw SQL aggregation patterns established but new query complexity for multi-org/model grouping
- Pitfalls: HIGH - Based on codebase analysis and known schema/library constraints

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable libraries, no fast-moving changes expected)
