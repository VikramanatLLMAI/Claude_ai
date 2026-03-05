"use client"

/**
 * Org Admin Audit Logs Page
 *
 * Route: /org/[slug]/admin/audit-logs
 *
 * Mirrors Super Admin audit logs page exactly with key differences:
 * 1. Uses requireOrgAdmin auth (via API calls to /api/org/{slug}/admin/audit-logs)
 * 2. No organization filter dropdown (already org-scoped)
 * 3. User filter dropdown only shows users from this org
 * 4. API URLs point to /api/org/{slug}/admin/audit-logs
 *
 * Features:
 * - Filter bar: date range with presets + action type dropdown + user dropdown + clear
 * - Server-side paginated table (page/pageSize/sortBy/sortOrder)
 * - Color-coded action badges
 * - Row click detail modal with full metadata JSON
 * - Pagination controls (page size: 10/25/50, page navigation)
 * - Export buttons: CSV and JSON
 * - Loading skeleton during data fetch
 * - Empty state when no audit logs match filters
 */

import * as React from "react"
import { useParams } from "next/navigation"
import {
  FileText,
  RefreshCw,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ChevronUp,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const AUTH_TOKEN_KEY = "llmatscale_auth_token"

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(AUTH_TOKEN_KEY) || ""
      : ""
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

// ============================================
// Types
// ============================================

interface AuditLogOrg {
  name: string
  slug: string
}

interface AuditLogUser {
  name: string
  email: string
}

interface AuditLogRow {
  id: string
  createdAt: string
  action: string
  targetType: string | null
  targetId: string | null
  ipAddress: string | null
  metadata: Record<string, unknown>
  organizationId: string | null
  userId: string | null
  organization: AuditLogOrg | null
  user: AuditLogUser | null
}

interface AuditLogListResult {
  logs: AuditLogRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

interface FilterMeta {
  actions: string[]
  users: Array<{ userId: string; name: string; email: string }>
}

type SortColumn = "createdAt" | "action"
type SortOrder = "asc" | "desc"

// ============================================
// Action Badge Color Coding
// ============================================

function getActionBadgeClass(action: string): string {
  const lower = action.toLowerCase()

  // Green: created, activated, restored
  if (/\.(created|activated|restored|added|enabled)$/.test(lower)) {
    return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
  }
  // Red: deleted, suspended, revoked
  if (/\.(deleted|suspended|revoked|removed|disabled|blocked)$/.test(lower)) {
    return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20"
  }
  // Amber: updated, assigned
  if (/\.(updated|assigned|changed|reset|modified)$/.test(lower)) {
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
  }
  // Blue: tested, exported, imported, viewed
  if (/\.(tested|exported|imported|viewed|accessed)$/.test(lower)) {
    return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
  }
  // Default/gray
  return "bg-muted text-muted-foreground border-border"
}

// ============================================
// Date Formatting
// ============================================

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

function toISODateLocal(d: Date): string {
  return d.toISOString().slice(0, 16)
}

// ============================================
// Skeleton Row
// ============================================

function SkeletonRows({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b">
          {Array.from({ length: 6 }).map((__, j) => (
            <td key={j} className="px-4 py-3">
              <div className="h-4 rounded bg-muted animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

// ============================================
// Metadata Modal
// ============================================

function MetadataModal({
  log,
  onClose,
}: {
  log: AuditLogRow | null
  onClose: () => void
}) {
  return (
    <Dialog open={!!log} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Audit Log Details</DialogTitle>
          <DialogDescription className="sr-only">
            Detailed information about the selected audit log entry
          </DialogDescription>
        </DialogHeader>
        {log && (
          <div className="space-y-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-medium text-muted-foreground">Action</span>
                <p className="mt-0.5 font-mono text-xs">{log.action}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Date</span>
                <p className="mt-0.5">{formatDateTime(log.createdAt)}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">Target</span>
                <p className="mt-0.5">
                  {log.targetType ? `${log.targetType} / ${log.targetId ?? "\u2014"}` : "\u2014"}
                </p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">IP Address</span>
                <p className="mt-0.5 font-mono text-xs">{log.ipAddress ?? "\u2014"}</p>
              </div>
              <div>
                <span className="font-medium text-muted-foreground">User</span>
                <p className="mt-0.5">
                  {log.user ? `${log.user.name} (${log.user.email})` : "System"}
                </p>
              </div>
            </div>
            <div>
              <span className="font-medium text-muted-foreground">Metadata</span>
              <pre className="mt-1 rounded-md bg-muted p-3 text-xs overflow-auto max-h-64 font-mono">
                {JSON.stringify(log.metadata, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Main Page
// ============================================

export default function OrgAuditLogsPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const apiBase = `/api/org/${slug}/admin/audit-logs`

  // --- Data state ---
  const [result, setResult] = React.useState<AuditLogListResult | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [filterMeta, setFilterMeta] = React.useState<FilterMeta>({
    actions: [],
    users: [],
  })

  // --- Filter state ---
  const [startDate, setStartDate] = React.useState("")
  const [endDate, setEndDate] = React.useState("")
  const [actionFilter, setActionFilter] = React.useState("")
  const [userFilter, setUserFilter] = React.useState("")

  // --- Pagination & sort state ---
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState<10 | 25 | 50>(25)
  const [sortBy, setSortBy] = React.useState<SortColumn>("createdAt")
  const [sortOrder, setSortOrder] = React.useState<SortOrder>("desc")

  // --- Export state ---
  const [exportingCsv, setExportingCsv] = React.useState(false)
  const [exportingJson, setExportingJson] = React.useState(false)

  // --- Detail modal ---
  const [detailLog, setDetailLog] = React.useState<AuditLogRow | null>(null)

  // ---- Fetch filter meta (actions, users) once ----
  React.useEffect(() => {
    async function fetchMeta() {
      try {
        const res = await fetch(`${apiBase}?meta=true`, {
          headers: getAuthHeaders(),
        })
        if (res.ok) {
          const data = await res.json()
          setFilterMeta(data)
        }
      } catch {
        // Non-critical - dropdowns just won't be populated
      }
    }
    fetchMeta()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  // ---- Build query params from current state ----
  const buildParams = React.useCallback(
    (overrides: Partial<{ page: number; pageSize: number }> = {}) => {
      const params = new URLSearchParams()
      params.set("page", String(overrides.page ?? page))
      params.set("pageSize", String(overrides.pageSize ?? pageSize))
      params.set("sortBy", sortBy)
      params.set("sortOrder", sortOrder)
      if (startDate) params.set("startDate", new Date(startDate).toISOString())
      if (endDate) params.set("endDate", new Date(endDate).toISOString())
      if (actionFilter) params.set("action", actionFilter)
      if (userFilter) params.set("userId", userFilter)
      return params
    },
    [page, pageSize, sortBy, sortOrder, startDate, endDate, actionFilter, userFilter]
  )

  // ---- Fetch logs ----
  const fetchLogs = React.useCallback(
    async (overrides: Partial<{ page: number; pageSize: number }> = {}) => {
      setLoading(true)
      setError(null)
      try {
        const params = buildParams(overrides)
        const res = await fetch(`${apiBase}?${params.toString()}`, {
          headers: getAuthHeaders(),
        })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error || `Failed to load audit logs (${res.status})`)
        }
        const data = await res.json()
        setResult(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load audit logs.")
      } finally {
        setLoading(false)
      }
    },
    [apiBase, buildParams]
  )

  // ---- Initial load and re-fetch when filters/sort change ----
  React.useEffect(() => {
    fetchLogs({ page: 1 })
    setPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, sortOrder, startDate, endDate, actionFilter, userFilter, pageSize])

  // ---- Page change ----
  const goToPage = React.useCallback(
    (newPage: number) => {
      setPage(newPage)
      fetchLogs({ page: newPage })
    },
    [fetchLogs]
  )

  // ---- Sort toggle ----
  const toggleSort = (col: SortColumn) => {
    if (sortBy === col) {
      setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
    } else {
      setSortBy(col)
      setSortOrder("desc")
    }
  }

  // ---- Export ----
  const buildExportUrl = (format: "csv" | "json") => {
    const params = new URLSearchParams()
    params.set("format", format)
    params.set("sortBy", sortBy)
    params.set("sortOrder", sortOrder)
    if (startDate) params.set("startDate", new Date(startDate).toISOString())
    if (endDate) params.set("endDate", new Date(endDate).toISOString())
    if (actionFilter) params.set("action", actionFilter)
    if (userFilter) params.set("userId", userFilter)
    return `/api/org/${slug}/admin/audit-logs/export?${params.toString()}`
  }

  const handleExport = async (format: "csv" | "json") => {
    const setSpin = format === "csv" ? setExportingCsv : setExportingJson
    setSpin(true)
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem(AUTH_TOKEN_KEY) || ""
          : ""
      const res = await fetch(buildExportUrl(format), {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      const disposition = res.headers.get("Content-Disposition") ?? ""
      const match = disposition.match(/filename="(.+)"/)
      a.download = match?.[1] ?? `audit-logs.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      setError("Export failed. Please try again.")
    } finally {
      setSpin(false)
    }
  }

  // ---- Clear filters ----
  const clearFilters = () => {
    setStartDate("")
    setEndDate("")
    setActionFilter("")
    setUserFilter("")
  }

  const hasFilters = startDate || endDate || actionFilter || userFilter

  // ---- Pagination display ----
  const total = result?.total ?? 0
  const totalPages = result?.totalPages ?? 1
  const currentPage = result?.page ?? page
  const start = total === 0 ? 0 : (currentPage - 1) * pageSize + 1
  const end = Math.min(currentPage * pageSize, total)

  // ---- Sort icon ----
  const SortIcon = ({ col }: { col: SortColumn }) => {
    if (sortBy !== col) return <ChevronsUpDown className="inline h-3.5 w-3.5 text-muted-foreground/60 ml-1" />
    if (sortOrder === "asc") return <ChevronUp className="inline h-3.5 w-3.5 ml-1" />
    return <ChevronDown className="inline h-3.5 w-3.5 ml-1" />
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">Audit Logs</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchLogs({ page })}
            disabled={loading}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            disabled={exportingCsv}
          >
            {exportingCsv ? (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("json")}
            disabled={exportingJson}
          >
            {exportingJson ? (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="mr-1.5 h-3.5 w-3.5" />
            )}
            Export JSON
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-xs underline hover:no-underline ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Filter bar */}
        <div className="rounded-lg border border-border p-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Date range */}
            <div className="flex items-end gap-2">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Start Date
                </label>
                <input
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  max={endDate || toISODateLocal(new Date())}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  End Date
                </label>
                <input
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  min={startDate}
                  max={toISODateLocal(new Date())}
                />
              </div>
            </div>

            {/* Preset date range buttons */}
            <div className="flex items-end gap-1 pb-0">
              {[
                { label: "Today", days: 0 },
                { label: "7d", days: 7 },
                { label: "30d", days: 30 },
                { label: "90d", days: 90 },
                { label: "1y", days: 365 },
              ].map(({ label, days }) => (
                <Button
                  key={label}
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    const now = new Date()
                    const s = new Date(now)
                    s.setDate(s.getDate() - days)
                    s.setHours(0, 0, 0, 0)
                    setStartDate(toISODateLocal(s))
                    setEndDate(toISODateLocal(now))
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>

            {/* Action type filter */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Action Type
              </label>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-w-[160px]"
              >
                <option value="">All Actions</option>
                {filterMeta.actions.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>

            {/* User filter */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                User
              </label>
              <select
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring min-w-[160px]"
              >
                <option value="">All Users</option>
                {filterMeta.users.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            {/* Clear filters */}
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground"
                onClick={clearFilters}
              >
                <X className="mr-1 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    <button
                      onClick={() => toggleSort("createdAt")}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Date
                      <SortIcon col="createdAt" />
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    User
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    <button
                      onClick={() => toggleSort("action")}
                      className="flex items-center hover:text-foreground transition-colors"
                    >
                      Action
                      <SortIcon col="action" />
                    </button>
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Target
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    IP Address
                  </th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows count={pageSize > 10 ? 10 : pageSize} />
                ) : result && result.logs.length > 0 ? (
                  result.logs.map((log) => (
                    <tr
                      key={log.id}
                      className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
                    >
                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap font-mono">
                        {formatDateTime(log.createdAt)}
                      </td>

                      {/* User */}
                      <td className="px-4 py-3">
                        {log.user ? (
                          <div>
                            <p className="text-sm font-medium text-foreground leading-tight">
                              {log.user.name}
                            </p>
                            <p className="text-xs text-muted-foreground leading-tight">
                              {log.user.email}
                            </p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">System</span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-xs font-mono ${getActionBadgeClass(log.action)}`}
                        >
                          {log.action}
                        </Badge>
                      </td>

                      {/* Target */}
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {log.targetType ? (
                          <div>
                            <p className="font-medium text-foreground">{log.targetType}</p>
                            {log.targetId && (
                              <p className="font-mono text-[10px] mt-0.5 truncate max-w-[120px]" title={log.targetId}>
                                {log.targetId}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground/60">{"\u2014"}</span>
                        )}
                      </td>

                      {/* IP Address */}
                      <td className="px-4 py-3">
                        {log.ipAddress ? (
                          <code className="text-xs font-mono text-muted-foreground">
                            {log.ipAddress}
                          </code>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs">{"\u2014"}</span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="px-4 py-3">
                        {log.metadata && Object.keys(log.metadata).length > 0 ? (
                          <button
                            onClick={() => setDetailLog(log)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            View details
                          </button>
                        ) : (
                          <span className="text-muted-foreground/60 text-xs">{"\u2014"}</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-16 text-center text-sm text-muted-foreground"
                    >
                      {hasFilters ? "No audit logs match the current filters." : "No audit logs found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          {/* Row count */}
          <p>
            {total === 0
              ? "No logs"
              : `Showing ${start}\u2013${end} of ${total.toLocaleString()} logs`}
          </p>

          {/* Right: page size + navigation */}
          <div className="flex items-center gap-3">
            {/* Page size selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs">Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value) as 10 | 25 | 50)
                  setPage(1)
                }}
                className="h-7 rounded-md border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>

            {/* Page info */}
            <span className="text-xs">
              Page {currentPage} of {totalPages}
            </span>

            {/* Prev / Next */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1 || loading}
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages || loading}
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata detail modal */}
      <MetadataModal log={detailLog} onClose={() => setDetailLog(null)} />
    </div>
  )
}
