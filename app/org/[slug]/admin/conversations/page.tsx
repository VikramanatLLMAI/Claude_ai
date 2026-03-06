"use client"

/**
 * Org Admin Conversations Compliance Page
 *
 * Route: /org/[slug]/admin/conversations
 *
 * Features:
 * - Visibility toggle switch in header (calls PATCH visibility API)
 * - Filter bar: user dropdown, date range, model dropdown
 * - Server-side paginated table with conversation list
 * - Checkbox selection for bulk export
 * - "View" button opens ConversationViewer dialog
 * - "Export Selected" downloads JSON (single) or ZIP (multiple)
 *
 * Covers: OVIS-01 through OVIS-07
 */

import * as React from "react"
import { useParams } from "next/navigation"
import {
  Eye,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Search,
  EyeOff,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { ConversationViewer } from "@/components/admin/conversation-viewer"

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

interface ConversationRow {
  id: string
  title: string
  model: string
  userId: string
  userName: string
  userEmail: string
  messageCount: number
  lastMessageAt: string | null
  createdAt: string
  updatedAt: string
}

interface FilterMeta {
  members: Array<{ userId: string; name: string; email: string }>
  models: string[]
}

// ============================================
// Helpers
// ============================================

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + "..." : str
}

// ============================================
// Skeleton Row
// ============================================

function SkeletonRows({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b">
          {Array.from({ length: 7 }).map((__, j) => (
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
// Main Page
// ============================================

export default function ConversationsPage() {
  const params = useParams()
  const slug = params.slug as string

  // State
  const [visibilityEnabled, setVisibilityEnabled] = React.useState<boolean | null>(null)
  const [conversations, setConversations] = React.useState<ConversationRow[]>([])
  const [total, setTotal] = React.useState(0)
  const [totalPages, setTotalPages] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(25)
  const [loading, setLoading] = React.useState(true)
  const [toggling, setToggling] = React.useState(false)

  // Filter state
  const [filterMeta, setFilterMeta] = React.useState<FilterMeta | null>(null)
  const [filterUserId, setFilterUserId] = React.useState("")
  const [filterModel, setFilterModel] = React.useState("")
  const [filterDateFrom, setFilterDateFrom] = React.useState("")
  const [filterDateTo, setFilterDateTo] = React.useState("")
  const [filterSearch, setFilterSearch] = React.useState("")

  // Selection state
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [exporting, setExporting] = React.useState(false)

  // Viewer state
  const [viewingId, setViewingId] = React.useState<string | null>(null)

  const apiBase = `/api/org/${slug}/admin`

  // ---- Load visibility state ----
  React.useEffect(() => {
    async function loadVisibility() {
      try {
        const res = await fetch(`${apiBase}/settings/visibility`, { headers: getAuthHeaders() })
        if (res.ok) {
          const data = await res.json()
          setVisibilityEnabled(data.conversationVisibility)
        }
      } catch {
        // ignore
      }
    }
    loadVisibility()
  }, [apiBase])

  // ---- Load filter meta ----
  React.useEffect(() => {
    if (!visibilityEnabled) return
    async function loadMeta() {
      try {
        const res = await fetch(`${apiBase}/conversations?meta=true`, { headers: getAuthHeaders() })
        if (res.ok) {
          setFilterMeta(await res.json())
        }
      } catch {
        // ignore
      }
    }
    loadMeta()
  }, [apiBase, visibilityEnabled])

  // ---- Load conversations ----
  const loadConversations = React.useCallback(async () => {
    if (!visibilityEnabled) return
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set("page", String(page))
      params.set("pageSize", String(pageSize))
      if (filterUserId) params.set("userId", filterUserId)
      if (filterModel) params.set("model", filterModel)
      if (filterDateFrom) params.set("dateFrom", filterDateFrom)
      if (filterDateTo) params.set("dateTo", filterDateTo)
      if (filterSearch) params.set("search", filterSearch)

      const res = await fetch(`${apiBase}/conversations?${params.toString()}`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setConversations(data.conversations)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [apiBase, visibilityEnabled, page, pageSize, filterUserId, filterModel, filterDateFrom, filterDateTo, filterSearch])

  React.useEffect(() => {
    loadConversations()
  }, [loadConversations])

  // ---- Toggle visibility ----
  const handleToggle = async (enabled: boolean) => {
    setToggling(true)
    try {
      const res = await fetch(`${apiBase}/settings/visibility`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ enabled }),
      })
      if (res.ok) {
        setVisibilityEnabled(enabled)
        if (enabled) {
          setPage(1)
        }
      }
    } catch {
      // ignore
    } finally {
      setToggling(false)
    }
  }

  // ---- Selection ----
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === conversations.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(conversations.map((c) => c.id)))
    }
  }

  // ---- Export ----
  const handleExport = async () => {
    if (selectedIds.size === 0) return
    setExporting(true)
    try {
      const res = await fetch(`${apiBase}/conversations/export`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ conversationIds: Array.from(selectedIds) }),
      })
      if (res.ok) {
        const contentType = res.headers.get("Content-Type") || ""
        const disposition = res.headers.get("Content-Disposition") || ""
        const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
        const filename = filenameMatch ? filenameMatch[1] : "export"

        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      // ignore
    } finally {
      setExporting(false)
    }
  }

  // ---- Clear filters ----
  const clearFilters = () => {
    setFilterUserId("")
    setFilterModel("")
    setFilterDateFrom("")
    setFilterDateTo("")
    setFilterSearch("")
    setPage(1)
  }

  const hasFilters = filterUserId || filterModel || filterDateFrom || filterDateTo || filterSearch

  // ---- Render ----

  // Loading visibility state
  if (visibilityEnabled === null) {
    return (
      <div className="flex h-full items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <AdminPageHeader
        title="Conversations"
        description="Manage and review conversations"
        actions={
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Visibility</span>
            <Switch
              checked={visibilityEnabled}
              onCheckedChange={handleToggle}
              disabled={toggling}
            />
          </div>
        }
      />

      {/* Disabled state */}
      {!visibilityEnabled && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
          <EyeOff className="h-12 w-12 text-muted-foreground/40" />
          <h2 className="text-lg font-medium text-muted-foreground">
            Conversation visibility is disabled
          </h2>
          <p className="max-w-md text-center text-sm text-muted-foreground/70">
            Enable conversation visibility to view and export user conversations
            for compliance purposes. This action will be logged in the audit log.
          </p>
          <Button
            onClick={() => handleToggle(true)}
            disabled={toggling}
          >
            {toggling ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Eye className="mr-2 h-4 w-4" />
            )}
            Enable Visibility
          </Button>
        </div>
      )}

      {/* Enabled state */}
      {visibilityEnabled && (
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3 border-b px-6 py-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search title..."
                value={filterSearch}
                onChange={(e) => { setFilterSearch(e.target.value); setPage(1) }}
                className="h-9 w-48 rounded-md border bg-background pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* User filter */}
            <select
              value={filterUserId}
              onChange={(e) => { setFilterUserId(e.target.value); setPage(1) }}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All Users</option>
              {filterMeta?.members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.name} ({m.email})
                </option>
              ))}
            </select>

            {/* Model filter */}
            <select
              value={filterModel}
              onChange={(e) => { setFilterModel(e.target.value); setPage(1) }}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="">All Models</option>
              {filterMeta?.models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Date from */}
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1) }}
              className="h-9 rounded-md border bg-background px-3 text-sm"
              title="From date"
            />

            {/* Date to */}
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => { setFilterDateTo(e.target.value); setPage(1) }}
              className="h-9 rounded-md border bg-background px-3 text-sm"
              title="To date"
            />

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            )}

            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={selectedIds.size === 0 || exporting}
              >
                <Download className="mr-2 h-4 w-4" />
                Export Selected ({selectedIds.size})
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={loadConversations}
                disabled={loading}
                title="Refresh"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-muted/50 backdrop-blur-sm">
                <tr className="border-b">
                  <th className="px-4 py-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={conversations.length > 0 && selectedIds.size === conversations.length}
                      onChange={toggleSelectAll}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Model</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Messages</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Activity</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <SkeletonRows />
                ) : conversations.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center text-muted-foreground">
                      {hasFilters
                        ? "No conversations match your filters."
                        : "No conversations found."}
                    </td>
                  </tr>
                ) : (
                  conversations.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{c.userName}</div>
                        <div className="text-xs text-muted-foreground">{c.userEmail}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span title={c.title}>{truncate(c.title, 50)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs font-mono">
                          {c.model}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">{c.messageCount}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.updatedAt ? formatDateTime(c.updatedAt) : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setViewingId(c.id)}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between border-t px-6 py-3">
            <div className="text-sm text-muted-foreground">
              {total > 0
                ? `Showing ${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} of ${total}`
                : "No results"}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pageSize}
                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1) }}
                className="h-8 rounded-md border bg-background px-2 text-sm"
              >
                <option value={10}>10 / page</option>
                <option value={25}>25 / page</option>
                <option value={50}>50 / page</option>
              </select>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages || 1}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Conversation Viewer Dialog */}
      {viewingId && (
        <ConversationViewer
          slug={slug}
          conversationId={viewingId}
          onClose={() => setViewingId(null)}
        />
      )}
    </div>
  )
}
