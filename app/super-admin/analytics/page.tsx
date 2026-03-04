"use client"

/**
 * Super Admin Platform Analytics Dashboard
 *
 * Route: /super-admin/analytics
 *
 * Single scrolling page with:
 * - KPI summary cards at top (4 cards: orgs, users, conversations, tokens)
 * - Time range controls (7d, 30d, 90d, 1y, custom)
 * - 9 chart sections covering all SANA requirements
 * - Skeleton loaders per section
 * - Manual refresh button
 *
 * Covers: SUI-04, SANA-01 through SANA-12
 */

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  Building2,
  Users,
  MessageSquare,
  Cpu,
  RefreshCw,
  Calendar,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { KpiCard } from "@/components/admin/kpi-card"
import {
  UsageTrendChart,
  TokensByOrgChart,
  TopOrgsChart,
  ErrorRateChart,
  PeakUsageHeatmap,
  ApiKeyConsumptionChart,
  McpUsageChart,
  RegistrationTrendChart,
  FeatureAdoptionChart,
  type UsageTrendPoint,
  type OrgModelUsagePoint,
  type TopOrgUsage,
  type ErrorRateItem,
  type PeakUsagePoint,
  type ApiKeyConsumptionItem,
  type McpUsageTrendPoint,
  type RegistrationTrendPoint,
  type FeatureAdoptionItem,
} from "@/components/admin/analytics-charts"
import { SidebarTrigger } from "@/components/ui/sidebar"

// ============================================
// Constants
// ============================================

const AUTH_TOKEN_KEY = "llmatscale_auth_token"

type TimePreset = "7d" | "30d" | "90d" | "1y" | "custom"

interface TimeRange {
  startDate: string // ISO date string YYYY-MM-DD
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
// Analytics Data Types
// ============================================

interface KpiSummary {
  totalOrgs: number
  activeOrgs: number
  suspendedOrgs: number
  totalUsers: number
  activeUsers: number
  suspendedUsers: number
  totalConversations: number
  totalMessages: number
  totalTokens: number
}

interface AnalyticsData {
  kpi: KpiSummary
  trends: UsageTrendPoint[]
  tokensByOrgModel: OrgModelUsagePoint[]
  topOrgs: TopOrgUsage[]
  errors: ErrorRateItem[]
  peakHours: PeakUsagePoint[]
  apiKeys: ApiKeyConsumptionItem[]
  mcp: McpUsageTrendPoint[]
  registrations: RegistrationTrendPoint[]
  adoption: FeatureAdoptionItem[]
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

// ============================================
// Main Page Component
// ============================================

export default function AnalyticsDashboardPage() {
  const [activePreset, setActivePreset] = useState<TimePreset>("30d")
  const [customRange, setCustomRange] = useState<TimeRange>({
    startDate: getPresetRange("30d").startDate,
    endDate: getPresetRange("30d").endDate,
  })
  const [timeRange, setTimeRange] = useState<TimeRange>(getPresetRange("30d"))
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

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

  const fetchData = useCallback(
    async (range: TimeRange, isRefresh = false) => {
      if (isRefresh) setRefreshing(true)
      else setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams({
          startDate: range.startDate + "T00:00:00.000Z",
          endDate: range.endDate + "T23:59:59.999Z",
          section: "all",
        })
        const res = await fetch(
          `/api/super-admin/analytics?${params.toString()}`,
          { headers: getAuthHeaders() }
        )

        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `HTTP ${res.status}`)
        }

        const json = await res.json()
        setData(json)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load analytics")
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    []
  )

  // Fetch on mount and when time range changes
  useEffect(() => {
    fetchData(timeRange)
  }, [timeRange, fetchData])

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
    fetchData(timeRange, true)
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Page header */}
      <div className="flex items-center gap-3 border-b px-6 py-4">
        <SidebarTrigger className="-ml-1" />
        <div className="flex flex-1 items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">Platform Analytics</h1>

          <div className="flex flex-wrap items-center gap-2">
            {/* Preset buttons */}
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

            {/* Custom date range */}
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

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading || refreshing}
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`}
              />
              <span className="ml-1.5">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Error banner */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* ─── KPI Summary Cards ─── */}
        {loading ? (
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
        ) : data ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Total Organizations"
              value={formatCount(data.kpi.totalOrgs)}
              subtitle={`${data.kpi.activeOrgs} active, ${data.kpi.suspendedOrgs} suspended`}
              icon={Building2}
            />
            <KpiCard
              title="Total Users"
              value={formatCount(data.kpi.totalUsers)}
              subtitle={`${data.kpi.activeUsers} active, ${data.kpi.suspendedUsers} suspended`}
              icon={Users}
            />
            <KpiCard
              title="Total Conversations"
              value={formatCount(data.kpi.totalConversations)}
              icon={MessageSquare}
            />
            <KpiCard
              title="Total Tokens Used"
              value={formatTokens(data.kpi.totalTokens)}
              subtitle="All time cumulative"
              icon={Cpu}
            />
          </div>
        ) : null}

        {/* ─── Usage Trends (SANA-05) ─── */}
        {loading ? (
          <ChartSkeleton height={300} />
        ) : data ? (
          <UsageTrendChart data={data.trends} />
        ) : null}

        {/* ─── Token Consumption by Org (SANA-04) ─── */}
        {loading ? (
          <ChartSkeleton height={300} />
        ) : data ? (
          <TokensByOrgChart data={data.tokensByOrgModel} />
        ) : null}

        {/* ─── Top Organizations by Usage (SANA-06) ─── */}
        {loading ? (
          <ChartSkeleton height={260} />
        ) : data ? (
          <TopOrgsChart data={data.topOrgs} />
        ) : null}

        {/* Two-column row: Error Rate + Peak Usage Heatmap */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ─── AI Error Rate (SANA-07) ─── */}
          {loading ? (
            <ChartSkeleton height={260} />
          ) : data ? (
            <ErrorRateChart data={data.errors} />
          ) : null}

          {/* ─── Peak Usage Hours (SANA-08) ─── */}
          {loading ? (
            <ChartSkeleton height={260} />
          ) : data ? (
            <PeakUsageHeatmap data={data.peakHours} />
          ) : null}
        </div>

        {/* ─── API Key Consumption (SANA-09) ─── */}
        {loading ? (
          <ChartSkeleton height={240} />
        ) : data ? (
          <ApiKeyConsumptionChart data={data.apiKeys} />
        ) : null}

        {/* ─── MCP Tool Usage (SANA-10) ─── */}
        {loading ? (
          <ChartSkeleton height={260} />
        ) : data ? (
          <McpUsageChart data={data.mcp} />
        ) : null}

        {/* Two-column row: Registrations + Feature Adoption */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* ─── New Registrations (SANA-11) ─── */}
          {loading ? (
            <ChartSkeleton height={260} />
          ) : data ? (
            <RegistrationTrendChart data={data.registrations} />
          ) : null}

          {/* ─── Feature Adoption (SANA-12) ─── */}
          {loading ? (
            <ChartSkeleton height={260} />
          ) : data ? (
            <FeatureAdoptionChart data={data.adoption} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
