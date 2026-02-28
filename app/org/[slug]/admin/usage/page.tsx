"use client"

/**
 * Admin Usage Monitoring Dashboard
 *
 * Displays org-wide usage summary, trend chart, and per-user usage table
 * with progress bars, status badges, and filter tabs.
 *
 * Covers: OUSE-02, OUSE-03, OUSE-04, OUSE-05, OALT-01, OALT-02, OALT-03
 */

import { useEffect, useState, useMemo } from "react"
import { useParams } from "next/navigation"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import {
  Activity,
  MessageSquare,
  Coins,
  AlertTriangle,
  Ban,
  MoreVertical,
  LogOut,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

const AUTH_TOKEN_KEY = "llmatscale_auth_token"

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) : null
  return token ? { Authorization: `Bearer ${token}` } : {}
}

// ============================================
// Types
// ============================================

interface UsageSummary {
  requests: { last24h: number; last7d: number; last30d: number }
  tokens: { last24h: number; last7d: number; last30d: number }
  perModel: Array<{ model: string; requests: number; tokens: number }>
  trend: Array<{ date: string; requests: number; tokens: number }>
}

interface UserUsage {
  userId: string
  userName: string
  userEmail: string
  roleName: string
  requestCount24h: number
  tokenCount24h: number
  requestLimit: number | null
  tokenLimit: number | null
  requestPercentage: number
  tokenPercentage: number
  lastActiveAt: string | null
  status: "normal" | "warning" | "blocked" | "inactive"
}

type FilterTab = "all" | "warning" | "blocked" | "inactive"

// ============================================
// Utility functions
// ============================================

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toLocaleString()
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 30) return `${diffDays}d ago`
  return `${Math.floor(diffDays / 30)}mo ago`
}

// ============================================
// Sub-components
// ============================================

function SummaryCard({
  title,
  value,
  icon: Icon,
  description,
  variant = "default",
}: {
  title: string
  value: string
  icon: React.ElementType
  description?: string
  variant?: "default" | "warning" | "destructive"
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon
          className={cn(
            "h-4 w-4",
            variant === "warning" && "text-amber-500",
            variant === "destructive" && "text-red-500",
            variant === "default" && "text-muted-foreground"
          )}
        />
      </CardHeader>
      <CardContent className="pt-0">
        <div
          className={cn(
            "text-2xl font-bold",
            variant === "warning" && "text-amber-600 dark:text-amber-400",
            variant === "destructive" && "text-red-600 dark:text-red-400"
          )}
        >
          {value}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}

function UsageProgressBar({
  current,
  limit,
  percentage,
  label,
}: {
  current: number
  limit: number | null
  percentage: number
  label: string
}) {
  if (limit === null) {
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{label}</span>
          <span>{formatNumber(current)} / Unlimited</span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted">
          <div className="h-full rounded-full bg-muted-foreground/20" style={{ width: "0%" }} />
        </div>
      </div>
    )
  }

  const pct = Math.round(percentage * 100)
  const barColor =
    pct >= 100
      ? "bg-red-500"
      : pct >= 80
        ? "bg-amber-500"
        : "bg-emerald-500"

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span>
          {formatNumber(current)} / {formatNumber(limit)} ({pct}%)
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", barColor)}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: UserUsage["status"] }) {
  switch (status) {
    case "blocked":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800">
          Blocked
        </Badge>
      )
    case "warning":
      return (
        <Badge className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800">
          Warning
        </Badge>
      )
    case "inactive":
      return (
        <Badge className="bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700">
          Inactive
        </Badge>
      )
    default:
      return (
        <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800">
          Normal
        </Badge>
      )
  }
}

function UsageTrendChart({ data }: { data: Array<{ date: string; requests: number }> }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null
    return (
      <div className="rounded-lg border bg-background p-3 shadow-md">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-sm text-muted-foreground">
          {formatNumber(payload[0].value)} requests
        </p>
      </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-medium">Daily Requests (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => {
                  const d = new Date(value)
                  return `${d.getMonth() + 1}/${d.getDate()}`
                }}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatNumber(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="requests"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================
// Skeleton loaders
// ============================================

function SummarySkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="h-4 w-20 rounded bg-muted animate-pulse" />
            <div className="h-4 w-4 rounded bg-muted animate-pulse" />
          </CardHeader>
          <CardContent className="pt-0">
            <div className="h-8 w-16 rounded bg-muted animate-pulse" />
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="flex items-center gap-4 rounded-lg border p-4"
        >
          <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 rounded bg-muted animate-pulse" />
            <div className="h-3 w-48 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-6 w-16 rounded-full bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  )
}

// ============================================
// Main Component
// ============================================

export default function UsageDashboardPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const [summary, setSummary] = useState<UsageSummary | null>(null)
  const [users, setUsers] = useState<UserUsage[]>([])
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all")

  // Force-logout dialog state
  const [forceLogoutUser, setForceLogoutUser] = useState<UserUsage | null>(null)
  const [forceLogoutLoading, setForceLogoutLoading] = useState(false)

  // Fetch org-wide usage
  useEffect(() => {
    async function fetchSummary() {
      try {
        const res = await fetch(`/api/org/${slug}/admin/usage`, {
          headers: getAuthHeaders(),
        })
        if (res.ok) {
          const data = await res.json()
          setSummary(data)
        }
      } catch (error) {
        console.error("[UsageDashboard] Failed to fetch summary:", error)
      } finally {
        setLoadingSummary(false)
      }
    }
    fetchSummary()
  }, [slug])

  // Fetch per-user usage
  useEffect(() => {
    async function fetchUsers() {
      try {
        const res = await fetch(`/api/org/${slug}/admin/usage/users`, {
          headers: getAuthHeaders(),
        })
        if (res.ok) {
          const data = await res.json()
          setUsers(data.users ?? [])
        }
      } catch (error) {
        console.error("[UsageDashboard] Failed to fetch users:", error)
      } finally {
        setLoadingUsers(false)
      }
    }
    fetchUsers()
  }, [slug])

  // Compute filter counts
  const filterCounts = useMemo(() => {
    const counts = { all: users.length, warning: 0, blocked: 0, inactive: 0 }
    for (const u of users) {
      if (u.status === "warning") counts.warning++
      else if (u.status === "blocked") counts.blocked++
      else if (u.status === "inactive") counts.inactive++
    }
    return counts
  }, [users])

  // Filtered user list
  const filteredUsers = useMemo(() => {
    if (activeFilter === "all") return users
    return users.filter((u) => u.status === activeFilter)
  }, [users, activeFilter])

  // Force-logout handler
  const handleForceLogout = async () => {
    if (!forceLogoutUser) return
    setForceLogoutLoading(true)
    try {
      const res = await fetch(
        `/api/org/${slug}/admin/users/${forceLogoutUser.userId}/force-logout`,
        {
          method: "POST",
          headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        }
      )
      if (res.ok) {
        const data = await res.json()
        toast.success(
          `${forceLogoutUser.userName} logged out. ${data.revokedCount ?? 0} session(s) revoked.`
        )
      } else {
        const data = await res.json().catch(() => ({ error: "Unknown error" }))
        toast.error(data.error || "Failed to force logout user")
      }
    } catch {
      toast.error("Failed to force logout user")
    } finally {
      setForceLogoutLoading(false)
      setForceLogoutUser(null)
    }
  }

  return (
    <div className="flex-1 space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Usage Monitoring</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor organization-wide usage and per-user activity
        </p>
      </div>

      {/* Summary Cards */}
      {loadingSummary ? (
        <SummarySkeleton />
      ) : summary ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            title="Requests (24h)"
            value={formatNumber(summary.requests.last24h)}
            icon={MessageSquare}
            description={`${formatNumber(summary.requests.last7d)} last 7 days`}
          />
          <SummaryCard
            title="Tokens (24h)"
            value={formatNumber(summary.tokens.last24h)}
            icon={Coins}
            description={`${formatNumber(summary.tokens.last7d)} last 7 days`}
          />
          <SummaryCard
            title="Approaching Limits"
            value={String(filterCounts.warning)}
            icon={AlertTriangle}
            variant={filterCounts.warning > 0 ? "warning" : "default"}
            description="Users at 80%+ usage"
          />
          <SummaryCard
            title="Blocked Users"
            value={String(filterCounts.blocked)}
            icon={Ban}
            variant={filterCounts.blocked > 0 ? "destructive" : "default"}
            description="Users at 100% usage"
          />
        </div>
      ) : null}

      {/* Trend Chart */}
      {summary && summary.trend.length > 0 && (
        <UsageTrendChart data={summary.trend} />
      )}

      {/* Per-User Usage Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Per-User Usage</h2>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1 border-b">
          {(["all", "warning", "blocked", "inactive"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={cn(
                "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px capitalize",
                activeFilter === tab
                  ? "border-foreground text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              )}
            >
              {tab}
              {filterCounts[tab] > 0 && (
                <span
                  className={cn(
                    "ml-1.5 inline-flex items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                    tab === "blocked" && "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
                    tab === "warning" && "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
                    tab === "inactive" && "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
                    tab === "all" && "bg-muted text-muted-foreground"
                  )}
                >
                  {filterCounts[tab]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* User Table */}
        {loadingUsers ? (
          <TableSkeleton />
        ) : filteredUsers.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {activeFilter === "all"
              ? "No users found"
              : `No ${activeFilter} users`}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((user) => (
              <div
                key={user.userId}
                className={cn(
                  "flex items-center gap-4 rounded-lg border p-4 transition-colors",
                  user.status === "inactive" && "opacity-60"
                )}
              >
                {/* User info */}
                <div className="flex-shrink-0 h-10 w-10 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                  {user.userName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </div>

                <div className="flex-1 min-w-0 space-y-2">
                  {/* Name, email, role, status */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">
                      {user.userName}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user.userEmail}
                    </span>
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                      {user.roleName}
                    </Badge>
                    <StatusBadge status={user.status} />
                  </div>

                  {/* Progress bars */}
                  <div className="grid gap-2 sm:grid-cols-2">
                    <UsageProgressBar
                      current={user.requestCount24h}
                      limit={user.requestLimit}
                      percentage={user.requestPercentage}
                      label="Requests"
                    />
                    <UsageProgressBar
                      current={user.tokenCount24h}
                      limit={user.tokenLimit}
                      percentage={user.tokenPercentage}
                      label="Tokens"
                    />
                  </div>
                </div>

                {/* Last active + actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatRelativeTime(user.lastActiveAt)}
                  </span>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                        <span className="sr-only">Actions for {user.userName}</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setForceLogoutUser(user)}
                        className="text-destructive focus:text-destructive"
                      >
                        <LogOut className="mr-2 h-4 w-4" />
                        Force Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Force Logout Confirmation Dialog */}
      <ConfirmationDialog
        open={!!forceLogoutUser}
        onOpenChange={(open) => {
          if (!open) setForceLogoutUser(null)
        }}
        title={`Force logout ${forceLogoutUser?.userName ?? "user"}?`}
        description="This will revoke all their active sessions. They will need to log in again."
        confirmLabel="Force Logout"
        variant="warning"
        onConfirm={handleForceLogout}
        loading={forceLogoutLoading}
      />
    </div>
  )
}
