"use client"

/**
 * Org Admin Analytics Dashboard
 *
 * Route: /org/[slug]/admin/analytics
 *
 * Comprehensive analytics dashboard with:
 * - 4 KPI summary cards (Active Users, Conversations, Tokens, Near-Limit Users)
 * - Section-based loading with skeleton loaders
 * - Time range controls (7d, 30d, 90d, 1y, custom)
 * - Section anchor navigation
 * - Per-section CSV export
 * - 10+ chart/table sections covering all 15 OANA requirements
 *
 * Replaces the previous Usage page (/admin/usage).
 *
 * Covers: OUI-04, OANA-01 through OANA-15
 */

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import {
  Users,
  MessageSquare,
  Zap,
  AlertTriangle,
  RefreshCw,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { KpiCard } from "@/components/admin/kpi-card"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import {
  OrgUsageTrendChart,
  OrgTokensByUserChart,
  OrgModelDistributionChart,
  OrgTopUsersChart,
  OrgPerRoleUsageChart,
  OrgMcpUsageChart,
  OrgAvgResponseTimeChart,
  OrgErrorRateChart,
  OrgPeakUsageHeatmap,
  OrgInvitationStatusChart,
  OrgApiKeyUsageChart,
  OrgUsersNearLimitsTable,
  OrgInactiveUsersTable,
  type OrgUsageTrendPoint,
  type UserRoleModelUsage,
  type ModelDistributionItem,
  type TopUserItem,
  type PerRoleUsageItem,
  type OrgMcpUsagePoint,
  type AvgResponseTimeItem,
  type OrgErrorRateItem,
  type OrgPeakUsagePoint,
  type InvitationStatsItem,
  type ApiKeyUsageItem,
  type UserNearLimitItem,
  type InactiveUserItem,
} from "@/components/admin/org-analytics-charts"

// ============================================
// Constants
// ============================================

const AUTH_TOKEN_KEY = "llmatscale_auth_token"

type TimePreset = "7d" | "30d" | "90d" | "1y" | "custom"

interface TimeRange {
  startDate: string
  endDate: string
}

function getPresetRange(preset: Exclude<TimePreset, "custom">): TimeRange {
  const now = new Date()
  const end = now.toISOString().slice(0, 10)
  const start = new Date(now)

  switch (preset) {
    case "7d":
      start.setDate(start.getDate() - 7)
      break
    case "30d":
      start.setDate(start.getDate() - 30)
      break
    case "90d":
      start.setDate(start.getDate() - 90)
      break
    case "1y":
      start.setFullYear(start.getFullYear() - 1)
      break
  }

  return { startDate: start.toISOString().slice(0, 10), endDate: end }
}

function formatTokens(n: number): string {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

// ============================================
// Section Navigation
// ============================================

const SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "usage-trends", label: "Usage Trends" },
  { id: "user-analytics", label: "User Analytics" },
  { id: "model-mcp", label: "Model & MCP Usage" },
  { id: "operational", label: "Operational Metrics" },
] as const

// ============================================
// Analytics Data Types
// ============================================

interface OrgKpiSummary {
  activeMembers: number
  suspendedMembers: number
  pendingInvitations: number
  totalConversations: number
  totalMessages: number
  totalTokens: number
  usersNearLimits: number
}

interface SectionState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

// ============================================
// Chart Skeleton
// ============================================

function ChartSkeleton({ height = 300 }: { height?: number }) {
  return (
    <Card>
      <div className="p-6 pb-4">
        <Skeleton className="h-5 w-48" />
      </div>
      <CardContent className="pt-0">
        <Skeleton className="w-full rounded-lg" style={{ height }} />
      </CardContent>
    </Card>
  )
}

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <div className="p-6">
            <Skeleton className="mb-3 h-4 w-32" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="mt-2 h-3 w-40" />
          </div>
        </Card>
      ))}
    </div>
  )
}

// ============================================
// Main Page Component
// ============================================

export default function OrgAnalyticsDashboardPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const [activePreset, setActivePreset] = useState<TimePreset>("30d")
  const [customRange, setCustomRange] = useState<TimeRange>({
    startDate: getPresetRange("30d").startDate,
    endDate: getPresetRange("30d").endDate,
  })
  const [timeRange, setTimeRange] = useState<TimeRange>(getPresetRange("30d"))
  const [refreshing, setRefreshing] = useState(false)

  // Section-based state
  const [kpi, setKpi] = useState<SectionState<OrgKpiSummary>>({
    data: null, loading: true, error: null,
  })
  const [trends, setTrends] = useState<SectionState<OrgUsageTrendPoint[]>>({
    data: null, loading: true, error: null,
  })
  const [users, setUsers] = useState<SectionState<{
    topUsers: TopUserItem[]
    nearLimitUsers: UserNearLimitItem[]
    inactiveUsers: InactiveUserItem[]
  }>>({ data: null, loading: true, error: null })
  const [models, setModels] = useState<SectionState<{
    modelDistribution: ModelDistributionItem[]
    avgResponseTime: AvgResponseTimeItem[]
  }>>({ data: null, loading: true, error: null })
  const [roles, setRoles] = useState<SectionState<PerRoleUsageItem[]>>({
    data: null, loading: true, error: null,
  })
  const [usage, setUsage] = useState<SectionState<UserRoleModelUsage[]>>({
    data: null, loading: true, error: null,
  })
  const [mcp, setMcp] = useState<SectionState<OrgMcpUsagePoint[]>>({
    data: null, loading: true, error: null,
  })
  const [errors, setErrors] = useState<SectionState<OrgErrorRateItem[]>>({
    data: null, loading: true, error: null,
  })
  const [peak, setPeak] = useState<SectionState<OrgPeakUsagePoint[]>>({
    data: null, loading: true, error: null,
  })
  const [invitations, setInvitations] = useState<SectionState<InvitationStatsItem[]>>({
    data: null, loading: true, error: null,
  })
  const [apiKeys, setApiKeys] = useState<SectionState<ApiKeyUsageItem[]>>({
    data: null, loading: true, error: null,
  })

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

  function buildParams(section: string, range: TimeRange): URLSearchParams {
    return new URLSearchParams({
      section,
      startDate: range.startDate + "T00:00:00.000Z",
      endDate: range.endDate + "T23:59:59.999Z",
    })
  }

  async function fetchSection<T>(
    section: string,
    range: TimeRange,
  ): Promise<T> {
    const params = buildParams(section, range)
    const res = await fetch(
      `/api/org/${slug}/admin/analytics?${params.toString()}`,
      { headers: getAuthHeaders() }
    )
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || `HTTP ${res.status}`)
    }
    return res.json()
  }

  const fetchAllSections = useCallback(
    async (range: TimeRange, isRefresh = false) => {
      if (isRefresh) setRefreshing(true)

      // Reset all loading states
      const resetLoading = { loading: true, error: null }
      setKpi((s) => ({ ...s, ...resetLoading }))
      setTrends((s) => ({ ...s, ...resetLoading }))
      setUsers((s) => ({ ...s, ...resetLoading }))
      setModels((s) => ({ ...s, ...resetLoading }))
      setRoles((s) => ({ ...s, ...resetLoading }))
      setUsage((s) => ({ ...s, ...resetLoading }))
      setMcp((s) => ({ ...s, ...resetLoading }))
      setErrors((s) => ({ ...s, ...resetLoading }))
      setPeak((s) => ({ ...s, ...resetLoading }))
      setInvitations((s) => ({ ...s, ...resetLoading }))
      setApiKeys((s) => ({ ...s, ...resetLoading }))

      // Fetch KPI first (fast)
      try {
        const kpiData = await fetchSection<{ kpi: OrgKpiSummary }>("kpi", range)
        setKpi({ data: kpiData.kpi, loading: false, error: null })
      } catch (err) {
        setKpi({ data: null, loading: false, error: err instanceof Error ? err.message : "Failed" })
      }

      // Fetch remaining sections in parallel
      const sectionFetchers = [
        fetchSection<{ trends: OrgUsageTrendPoint[] }>("trends", range)
          .then((d) => setTrends({ data: d.trends, loading: false, error: null }))
          .catch((err) => setTrends({ data: null, loading: false, error: err.message })),

        fetchSection<{
          topUsers: TopUserItem[]
          nearLimitUsers: UserNearLimitItem[]
          inactiveUsers: InactiveUserItem[]
        }>("users", range)
          .then((d) => setUsers({ data: d, loading: false, error: null }))
          .catch((err) => setUsers({ data: null, loading: false, error: err.message })),

        fetchSection<{
          modelDistribution: ModelDistributionItem[]
          avgResponseTime: AvgResponseTimeItem[]
        }>("models", range)
          .then((d) => setModels({ data: d, loading: false, error: null }))
          .catch((err) => setModels({ data: null, loading: false, error: err.message })),

        fetchSection<{ roles: PerRoleUsageItem[] }>("roles", range)
          .then((d) => setRoles({ data: d.roles, loading: false, error: null }))
          .catch((err) => setRoles({ data: null, loading: false, error: err.message })),

        fetchSection<{ usage: UserRoleModelUsage[] }>("usage", range)
          .then((d) => setUsage({ data: d.usage, loading: false, error: null }))
          .catch((err) => setUsage({ data: null, loading: false, error: err.message })),

        fetchSection<{ mcp: OrgMcpUsagePoint[] }>("mcp", range)
          .then((d) => setMcp({ data: d.mcp, loading: false, error: null }))
          .catch((err) => setMcp({ data: null, loading: false, error: err.message })),

        fetchSection<{ errors: OrgErrorRateItem[] }>("errors", range)
          .then((d) => setErrors({ data: d.errors, loading: false, error: null }))
          .catch((err) => setErrors({ data: null, loading: false, error: err.message })),

        fetchSection<{ peak: OrgPeakUsagePoint[] }>("peak", range)
          .then((d) => setPeak({ data: d.peak, loading: false, error: null }))
          .catch((err) => setPeak({ data: null, loading: false, error: err.message })),

        fetchSection<{ invitations: InvitationStatsItem[] }>("invitations", range)
          .then((d) => setInvitations({ data: d.invitations, loading: false, error: null }))
          .catch((err) => setInvitations({ data: null, loading: false, error: err.message })),

        fetchSection<{ apiKeys: ApiKeyUsageItem[] }>("apiKeys", range)
          .then((d) => setApiKeys({ data: d.apiKeys, loading: false, error: null }))
          .catch((err) => setApiKeys({ data: null, loading: false, error: err.message })),
      ]

      await Promise.allSettled(sectionFetchers)
      if (isRefresh) setRefreshing(false)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slug]
  )

  useEffect(() => {
    fetchAllSections(timeRange)
  }, [timeRange, fetchAllSections])

  function handlePresetClick(preset: Exclude<TimePreset, "custom">) {
    setActivePreset(preset)
    const range = getPresetRange(preset)
    setTimeRange(range)
    setCustomRange(range)
  }

  function handleCustomToggle() {
    setActivePreset("custom")
  }

  function handleCustomApply() {
    if (customRange.startDate && customRange.endDate) {
      setTimeRange({ ...customRange })
    }
  }

  function handleRefresh() {
    fetchAllSections(timeRange, true)
  }

  function scrollToSection(id: string) {
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  // CSV export helper
  function handleExportSection(section: string) {
    const params = buildParams(section, timeRange)
    params.set("export", "csv")
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem(AUTH_TOKEN_KEY) || ""
        : ""

    fetch(`/api/org/${slug}/admin/analytics?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("Export failed")
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        const date = new Date().toISOString().slice(0, 10)
        a.href = url
        a.download = `org-analytics-${section}-${date}.csv`
        a.click()
        URL.revokeObjectURL(url)
      })
      .catch((err) => {
        console.error("[Analytics] CSV export error:", err)
      })
  }

  // Section error display
  function SectionError({ message }: { message: string }) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-sm text-destructive">{message}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <AdminPageHeader
        title="Analytics"
        description="Organization usage analytics"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {(["7d", "30d", "90d", "1y"] as const).map((preset) => (
              <Button
                key={preset}
                variant={activePreset === preset ? "default" : "outline"}
                size="sm"
                onClick={() => handlePresetClick(preset)}
              >
                {preset}
              </Button>
            ))}

            <Button
              variant={activePreset === "custom" ? "default" : "outline"}
              size="sm"
              onClick={handleCustomToggle}
            >
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
              Custom
            </Button>

            {activePreset === "custom" && (
              <div className="flex items-center gap-1.5">
                <Input
                  type="date"
                  className="h-8 w-36 text-sm"
                  value={customRange.startDate}
                  max={customRange.endDate}
                  onChange={(e) =>
                    setCustomRange((r) => ({ ...r, startDate: e.target.value }))
                  }
                />
                <span className="text-muted-foreground text-sm">to</span>
                <Input
                  type="date"
                  className="h-8 w-36 text-sm"
                  value={customRange.endDate}
                  min={customRange.startDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) =>
                    setCustomRange((r) => ({ ...r, endDate: e.target.value }))
                  }
                />
                <Button size="sm" onClick={handleCustomApply}>
                  Apply
                </Button>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="ml-1.5">Refresh</span>
            </Button>
          </div>
        }
      />

      {/* Section navigation */}
      <div className="border-b px-6">
        <div className="flex gap-1 overflow-x-auto">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => scrollToSection(section.id)}
              className="whitespace-nowrap px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {section.label}
            </button>
          ))}
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">

        {/* ========== OVERVIEW ========== */}
        <div id="overview">
          {kpi.loading ? (
            <KpiSkeleton />
          ) : kpi.error ? (
            <SectionError message={kpi.error} />
          ) : kpi.data ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Active Users"
                value={formatCount(kpi.data.activeMembers)}
                subtitle={`+${kpi.data.suspendedMembers} suspended, ${kpi.data.pendingInvitations} pending`}
                icon={Users}
              />
              <KpiCard
                title="Total Conversations"
                value={formatCount(kpi.data.totalConversations)}
                subtitle={`${formatCount(kpi.data.totalMessages)} messages`}
                icon={MessageSquare}
              />
              <KpiCard
                title="Total Tokens Used"
                value={formatTokens(kpi.data.totalTokens)}
                icon={Zap}
              />
              <KpiCard
                title="Users Near Limits"
                value={String(kpi.data.usersNearLimits)}
                subtitle="At 80%+ of daily limits"
                icon={AlertTriangle}
              />
            </div>
          ) : null}
        </div>

        {/* ========== USAGE TRENDS (OANA-07) ========== */}
        <div id="usage-trends">
          <h2 className="text-lg font-semibold mb-4">Usage Trends</h2>
          {trends.loading ? (
            <ChartSkeleton height={300} />
          ) : trends.error ? (
            <SectionError message={trends.error} />
          ) : trends.data ? (
            <OrgUsageTrendChart
              data={trends.data}
              onExport={() => handleExportSection("trends")}
            />
          ) : null}
        </div>

        {/* ========== USER ANALYTICS ========== */}
        <div id="user-analytics" className="space-y-6">
          <h2 className="text-lg font-semibold">User Analytics</h2>

          {/* Top Users (OANA-05) */}
          {users.loading ? (
            <ChartSkeleton height={360} />
          ) : users.error ? (
            <SectionError message={users.error} />
          ) : users.data ? (
            <OrgTopUsersChart
              data={users.data.topUsers}
              onExport={() => handleExportSection("users")}
            />
          ) : null}

          {/* Per-Role Usage (OANA-06) + Tokens by User (OANA-03) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {roles.loading ? (
              <ChartSkeleton height={300} />
            ) : roles.error ? (
              <SectionError message={roles.error} />
            ) : roles.data ? (
              <OrgPerRoleUsageChart
                data={roles.data}
                onExport={() => handleExportSection("roles")}
              />
            ) : null}

            {usage.loading ? (
              <ChartSkeleton height={300} />
            ) : usage.error ? (
              <SectionError message={usage.error} />
            ) : usage.data ? (
              <OrgTokensByUserChart
                data={usage.data}
                onExport={() => handleExportSection("usage")}
              />
            ) : null}
          </div>

          {/* Users Near Limits (OANA-14) */}
          {users.loading ? (
            <ChartSkeleton height={200} />
          ) : users.error ? (
            <SectionError message={users.error} />
          ) : users.data ? (
            <OrgUsersNearLimitsTable
              data={users.data.nearLimitUsers}
              onExport={() => handleExportSection("users")}
            />
          ) : null}

          {/* Inactive Users (OANA-15) */}
          {users.loading ? (
            <ChartSkeleton height={200} />
          ) : users.error ? null : users.data ? (
            <OrgInactiveUsersTable
              data={users.data.inactiveUsers}
              onExport={() => handleExportSection("users")}
            />
          ) : null}
        </div>

        {/* ========== MODEL & MCP USAGE ========== */}
        <div id="model-mcp" className="space-y-6">
          <h2 className="text-lg font-semibold">Model & MCP Usage</h2>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Model Distribution (OANA-04) */}
            {models.loading ? (
              <ChartSkeleton height={300} />
            ) : models.error ? (
              <SectionError message={models.error} />
            ) : models.data ? (
              <OrgModelDistributionChart
                data={models.data.modelDistribution}
                onExport={() => handleExportSection("models")}
              />
            ) : null}

            {/* Avg Response Time (OANA-09) */}
            {models.loading ? (
              <ChartSkeleton height={300} />
            ) : models.error ? (
              <SectionError message={models.error} />
            ) : models.data ? (
              <OrgAvgResponseTimeChart
                data={models.data.avgResponseTime}
                onExport={() => handleExportSection("models")}
              />
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* MCP Usage (OANA-08) */}
            {mcp.loading ? (
              <ChartSkeleton height={260} />
            ) : mcp.error ? (
              <SectionError message={mcp.error} />
            ) : mcp.data ? (
              <OrgMcpUsageChart
                data={mcp.data}
                onExport={() => handleExportSection("mcp")}
              />
            ) : null}

            {/* API Key Usage (OANA-13) */}
            {apiKeys.loading ? (
              <ChartSkeleton height={260} />
            ) : apiKeys.error ? (
              <SectionError message={apiKeys.error} />
            ) : apiKeys.data ? (
              <OrgApiKeyUsageChart
                data={apiKeys.data}
                onExport={() => handleExportSection("apiKeys")}
              />
            ) : null}
          </div>
        </div>

        {/* ========== OPERATIONAL METRICS ========== */}
        <div id="operational" className="space-y-6">
          <h2 className="text-lg font-semibold">Operational Metrics</h2>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Error Rate (OANA-10) */}
            {errors.loading ? (
              <ChartSkeleton height={260} />
            ) : errors.error ? (
              <SectionError message={errors.error} />
            ) : errors.data ? (
              <OrgErrorRateChart
                data={errors.data}
                onExport={() => handleExportSection("errors")}
              />
            ) : null}

            {/* Peak Usage Heatmap (OANA-11) */}
            {peak.loading ? (
              <ChartSkeleton height={260} />
            ) : peak.error ? (
              <SectionError message={peak.error} />
            ) : peak.data ? (
              <OrgPeakUsageHeatmap
                data={peak.data}
                onExport={() => handleExportSection("peak")}
              />
            ) : null}

            {/* Invitation Status (OANA-12) */}
            {invitations.loading ? (
              <ChartSkeleton height={260} />
            ) : invitations.error ? (
              <SectionError message={invitations.error} />
            ) : invitations.data ? (
              <OrgInvitationStatusChart
                data={invitations.data}
                onExport={() => handleExportSection("invitations")}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  )
}
