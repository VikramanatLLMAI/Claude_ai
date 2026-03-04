"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Analytics Chart Components for Super Admin Dashboard
 *
 * All chart components use recharts v3.7.0 (already installed).
 * PeakUsageHeatmap uses a custom CSS grid (no native heatmap in Recharts).
 *
 * Note: Recharts v3 has strict TypeScript types for Tooltip formatters/labelFormatters.
 * We use `as any` casts on those props to stay compatible with both the type-checker
 * and the runtime API. This is the established pattern for recharts v3 + React 19.
 *
 * Exports:
 * - UsageTrendChart: Stacked area chart for daily token usage (SANA-05)
 * - TokensByOrgChart: Stacked area chart for usage by org (SANA-04)
 * - TopOrgsChart: Horizontal bar chart for top orgs (SANA-06)
 * - ErrorRateChart: Donut/pie chart for error types (SANA-07)
 * - PeakUsageHeatmap: CSS grid heatmap for hour x day usage (SANA-08)
 * - ApiKeyConsumptionChart: Bar chart for API key consumption (SANA-09)
 * - McpUsageChart: Area chart for MCP tool invocations (SANA-10)
 * - RegistrationTrendChart: Area chart for new orgs and users (SANA-11)
 * - FeatureAdoptionChart: Horizontal bar chart for feature adoption (SANA-12)
 */

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

// ============================================
// Color Palette
// ============================================

const CHART_COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#8b5cf6", // violet-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#06b6d4", // cyan-500
  "#ec4899", // pink-500
  "#84cc16", // lime-500
  "#f97316", // orange-500
  "#6366f1", // indigo-500
]

const ERROR_COLORS: Record<string, string> = {
  rate_limit: "#ef4444",
  context_length: "#f59e0b",
  api_error: "#8b5cf6",
  timeout: "#06b6d4",
  other: "#94a3b8",
}

// ============================================
// Formatters
// ============================================

function formatTokens(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

// ============================================
// Types (matching platform-analytics-service)
// ============================================

export interface UsageTrendPoint {
  date: string
  inputTokens: number
  outputTokens: number
  thinkingTokens: number
  totalTokens: number
}

export interface OrgModelUsagePoint {
  date: string
  orgId: string
  orgName: string
  model: string
  tokens: number
}

export interface TopOrgUsage {
  orgId: string
  name: string
  slug: string
  totalTokens: number
  totalMessages: number
  totalConversations: number
}

export interface ErrorRateItem {
  type: string
  count: number
}

export interface PeakUsagePoint {
  hour: number
  day: number
  count: number
}

export interface ApiKeyConsumptionItem {
  keyId: string
  keyName: string
  orgId: string | null
  orgName: string | null
  totalTokens: number
  totalRequests: number
}

export interface McpUsageTrendPoint {
  date: string
  toolInvocations: number
}

export interface RegistrationTrendPoint {
  date: string
  newOrgs: number
  newUsers: number
}

export interface FeatureAdoptionItem {
  feature: string
  orgCount: number
  percentage: number
}

// ============================================
// UsageTrendChart (SANA-05)
// ============================================

interface UsageTrendChartProps {
  data: UsageTrendPoint[]
}

export function UsageTrendChart({ data }: UsageTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Usage Trends</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No usage data in this period" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="inputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="outputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="thinkingGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatTokens}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={((value: number, name: string) => [
                  formatTokens(value),
                  name === "inputTokens"
                    ? "Input"
                    : name === "outputTokens"
                    ? "Output"
                    : "Thinking",
                ]) as any}
                labelFormatter={((label: string) => formatDate(label)) as any}
              />
              <Legend
                formatter={(value: string) =>
                  value === "inputTokens"
                    ? "Input"
                    : value === "outputTokens"
                    ? "Output"
                    : "Thinking"
                }
              />
              <Area
                type="monotone"
                dataKey="inputTokens"
                stackId="1"
                stroke="#3b82f6"
                fill="url(#inputGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="outputTokens"
                stackId="1"
                stroke="#10b981"
                fill="url(#outputGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="thinkingTokens"
                stackId="1"
                stroke="#8b5cf6"
                fill="url(#thinkingGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// TokensByOrgChart (SANA-04)
// ============================================

interface TokensByOrgChartProps {
  data: OrgModelUsagePoint[]
}

export function TokensByOrgChart({ data }: TokensByOrgChartProps) {
  // Pivot: group by date, summing tokens per org
  const orgNames = Array.from(new Set(data.map((d) => d.orgName))).slice(0, 10)
  const dateMap = new Map<string, Record<string, number>>()

  for (const point of data) {
    const existing = dateMap.get(point.date) ?? {}
    existing[point.orgName] = (existing[point.orgName] ?? 0) + point.tokens
    dateMap.set(point.date, existing)
  }

  const chartData = Array.from(dateMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, orgTokens]) => ({ date, ...orgTokens }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Token Consumption by Organization</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyState message="No token data in this period" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatTokens}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={((value: number, name: string) => [formatTokens(value), name]) as any}
                labelFormatter={((label: string) => formatDate(label)) as any}
              />
              <Legend />
              {orgNames.map((orgName, i) => (
                <Area
                  key={orgName}
                  type="monotone"
                  dataKey={orgName}
                  stackId="1"
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// TopOrgsChart (SANA-06)
// ============================================

interface TopOrgsChartProps {
  data: TopOrgUsage[]
}

export function TopOrgsChart({ data }: TopOrgsChartProps) {
  const chartData = [...data]
    .sort((a, b) => a.totalTokens - b.totalTokens)
    .map((d) => ({
      name: d.name.length > 20 ? d.name.slice(0, 20) + "…" : d.name,
      tokens: d.totalTokens,
      messages: d.totalMessages,
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top Organizations by Usage</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No usage data in this period" />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 40)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 80, bottom: 0, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/50" />
              <XAxis type="number" tickFormatter={formatTokens} tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={((value: number) => [formatTokens(value), "Tokens"]) as any}
              />
              <Bar dataKey="tokens" fill="#3b82f6" radius={[0, 4, 4, 0]} label={{ position: "right", formatter: (v: number) => formatTokens(v), fontSize: 11 } as any} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// ErrorRateChart (SANA-07)
// ============================================

interface ErrorRateChartProps {
  data: ErrorRateItem[]
}

const RADIAN = Math.PI / 180
function renderCustomLabel({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
}) {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)
  if (percent < 0.05) return null
  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={12}
      fontWeight={600}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

export function ErrorRateChart({ data }: ErrorRateChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI Error Rate by Type</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No errors recorded in this period" icon="check" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="type"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                labelLine={false}
                label={renderCustomLabel as any}
              >
                {data.map((entry, i) => (
                  <Cell
                    key={entry.type}
                    fill={ERROR_COLORS[entry.type] ?? CHART_COLORS[i % CHART_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={((value: number, name: string) => [value, name]) as any} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// PeakUsageHeatmap (SANA-08) - CSS Grid
// ============================================

interface PeakUsageHeatmapProps {
  data: PeakUsagePoint[]
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function PeakUsageHeatmap({ data }: PeakUsageHeatmapProps) {
  // Build lookup: day -> hour -> count
  const lookup = new Map<string, number>()
  let maxCount = 0

  for (const point of data) {
    const key = `${point.day}-${point.hour}`
    lookup.set(key, point.count)
    if (point.count > maxCount) maxCount = point.count
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Peak Usage Hours</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No usage data in this period" />
        ) : (
          <div className="overflow-x-auto">
            <div
              className="grid gap-0.5 min-w-[600px]"
              style={{ gridTemplateColumns: "48px repeat(24, 1fr)" }}
            >
              {/* Header row: hour labels */}
              <div className="h-6" /> {/* empty corner */}
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="h-6 flex items-center justify-center text-[10px] text-muted-foreground">
                  {h}
                </div>
              ))}

              {/* Data rows: day x hour */}
              {DAY_LABELS.map((dayLabel, dayIndex) => (
                <>
                  <div
                    key={`label-${dayIndex}`}
                    className="h-7 flex items-center justify-end pr-2 text-xs text-muted-foreground"
                  >
                    {dayLabel}
                  </div>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const count = lookup.get(`${dayIndex}-${hour}`) ?? 0
                    const intensity = maxCount > 0 ? count / maxCount : 0
                    const alpha = 0.08 + intensity * 0.85
                    return (
                      <div
                        key={`cell-${dayIndex}-${hour}`}
                        className="h-7 rounded-sm cursor-default"
                        style={{
                          backgroundColor: `rgba(34, 197, 94, ${alpha})`,
                        }}
                        title={`${DAY_LABELS[dayIndex]} ${hour}:00 — ${count} requests`}
                      />
                    )
                  })}
                </>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <span>Low</span>
              <div className="flex gap-0.5">
                {[0.08, 0.3, 0.5, 0.7, 0.93].map((alpha, i) => (
                  <div
                    key={i}
                    className="h-3 w-5 rounded-sm"
                    style={{ backgroundColor: `rgba(34, 197, 94, ${alpha})` }}
                  />
                ))}
              </div>
              <span>High</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// ApiKeyConsumptionChart (SANA-09)
// ============================================

interface ApiKeyConsumptionChartProps {
  data: ApiKeyConsumptionItem[]
}

export function ApiKeyConsumptionChart({ data }: ApiKeyConsumptionChartProps) {
  const chartData = data
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .map((d) => ({
      name:
        d.keyName.length > 18 ? d.keyName.slice(0, 18) + "…" : d.keyName,
      org: d.orgName ?? "Unassigned",
      tokens: d.totalTokens,
      requests: d.totalRequests,
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">API Key Consumption</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.every((d) => d.tokens === 0) ? (
          <EmptyState message="No API key usage data in this period" />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 44)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 80, bottom: 0, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/50" />
              <XAxis type="number" tickFormatter={formatTokens} tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={((value: number, field: string) => [
                  field === "tokens" ? formatTokens(value) : value,
                  field === "tokens" ? "Tokens" : "Requests",
                ]) as any}
              />
              <Bar dataKey="tokens" fill="#6366f1" radius={[0, 4, 4, 0]} label={{ position: "right", formatter: (v: number) => formatTokens(v), fontSize: 11 } as any} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// McpUsageChart (SANA-10)
// ============================================

interface McpUsageChartProps {
  data: McpUsageTrendPoint[]
}

export function McpUsageChart({ data }: McpUsageChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">MCP Tool Usage</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No MCP tool usage in this period" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="mcpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={((value: number) => [value, "Tool Invocations"]) as any}
                labelFormatter={((label: string) => formatDate(label)) as any}
              />
              <Area
                type="monotone"
                dataKey="toolInvocations"
                stroke="#06b6d4"
                fill="url(#mcpGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// RegistrationTrendChart (SANA-11)
// ============================================

interface RegistrationTrendChartProps {
  data: RegistrationTrendPoint[]
}

export function RegistrationTrendChart({ data }: RegistrationTrendChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">New Registrations</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No new registrations in this period" />
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="orgRegGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="userRegGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <Tooltip
                formatter={((value: number, name: string) => [
                  value,
                  name === "newOrgs" ? "New Orgs" : "New Users",
                ]) as any}
                labelFormatter={((label: string) => formatDate(label)) as any}
              />
              <Legend
                formatter={(value: string) =>
                  value === "newOrgs" ? "New Organizations" : "New Users"
                }
              />
              <Area
                type="monotone"
                dataKey="newOrgs"
                stroke="#3b82f6"
                fill="url(#orgRegGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="newUsers"
                stroke="#10b981"
                fill="url(#userRegGrad)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// FeatureAdoptionChart (SANA-12)
// ============================================

interface FeatureAdoptionChartProps {
  data: FeatureAdoptionItem[]
}

export function FeatureAdoptionChart({ data }: FeatureAdoptionChartProps) {
  const chartData = [...data].sort((a, b) => a.percentage - b.percentage)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Feature Adoption</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No feature adoption data available" />
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 48)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 80, bottom: 0, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/50" />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="feature"
                width={160}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={((value: number, _name: string, item: any) => [
                  `${value}% (${item?.payload?.orgCount ?? 0} orgs)`,
                  "Adoption",
                ]) as any}
              />
              <Bar
                dataKey="percentage"
                fill="#10b981"
                radius={[0, 4, 4, 0]}
                label={{ position: "right", formatter: (v: number) => `${v}%`, fontSize: 11 } as any}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// Shared Empty State
// ============================================

function EmptyState({
  message,
  icon = "chart",
}: {
  message: string
  icon?: "chart" | "check"
}) {
  return (
    <div className="flex h-48 flex-col items-center justify-center gap-2 text-muted-foreground">
      {icon === "check" ? (
        <svg
          className="h-10 w-10 text-emerald-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ) : (
        <svg
          className="h-10 w-10"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      )}
      <p className="text-sm">{message}</p>
    </div>
  )
}
