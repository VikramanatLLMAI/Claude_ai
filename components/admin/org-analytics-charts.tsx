"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Org Analytics Chart Components for Org Admin Dashboard
 *
 * All chart components use shadcn/ui Chart wrappers over recharts v3.7.0.
 * PeakUsageHeatmap uses a custom CSS grid (no native heatmap in Recharts).
 *
 * Exports:
 * - OrgUsageTrendChart: Stacked area chart for daily token usage (OANA-07)
 * - OrgTokensByUserChart: Stacked bar chart for token breakdown by user (OANA-03)
 * - OrgModelDistributionChart: Horizontal bar chart for model usage (OANA-04)
 * - OrgTopUsersChart: Horizontal bar chart + table for top users (OANA-05)
 * - OrgPerRoleUsageChart: Bar chart for per-role token usage (OANA-06)
 * - OrgMcpUsageChart: Area chart for MCP tool calls (OANA-08)
 * - OrgAvgResponseTimeChart: Horizontal bar chart for avg response per model (OANA-09)
 * - OrgErrorRateChart: Donut pie chart for error types (OANA-10)
 * - OrgPeakUsageHeatmap: CSS grid heatmap for hour x day (OANA-11)
 * - OrgInvitationStatusChart: Donut pie chart for invitation statuses (OANA-12)
 * - OrgApiKeyUsageChart: Horizontal bar chart for API key usage (OANA-13)
 * - OrgUsersNearLimitsTable: Table for users near limits (OANA-14)
 * - OrgInactiveUsersTable: Table for inactive users (OANA-15)
 */

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  type ChartConfig,
} from "@/components/ui/chart"
import {
  EmptyState,
  ExportButton,
  formatTokens,
  formatDate,
  formatMs,
  ERROR_COLORS,
  INVITATION_COLORS,
} from "@/components/admin/chart-utils"

// ============================================
// Types (matching org-analytics-service)
// ============================================

export interface OrgUsageTrendPoint {
  date: string
  inputTokens: number
  outputTokens: number
  thinkingTokens: number
}

export interface UserRoleModelUsage {
  userName: string
  roleName: string
  modelId: string
  inputTokens: number
  outputTokens: number
}

export interface ModelDistributionItem {
  modelId: string
  totalTokens: number
  requestCount: number
}

export interface TopUserItem {
  userId: string
  userName: string
  roleName: string
  totalTokens: number
  messageCount: number
}

export interface PerRoleUsageItem {
  roleId: string
  roleName: string
  totalTokens: number
  requestCount: number
  userCount: number
}

export interface OrgMcpUsagePoint {
  date: string
  toolCallCount: number
}

export interface AvgResponseTimeItem {
  modelId: string
  avgDurationMs: number
}

export interface OrgErrorRateItem {
  errorType: string
  count: number
}

export interface OrgPeakUsagePoint {
  hour: number
  dayOfWeek: number
  count: number
}

export interface InvitationStatsItem {
  status: string
  count: number
}

export interface ApiKeyUsageItem {
  keyName: string
  maskedKey: string
  totalTokens: number
  requestCount: number
}

export interface UserNearLimitItem {
  userId: string
  userName: string
  roleName: string
  usagePercent: number
  limitType: "requests" | "tokens"
}

export interface InactiveUserItem {
  userId: string
  userName: string
  email: string
  roleName: string
  lastActiveAt: string | null
  daysSinceActive: number
}

// ============================================
// 1. OrgUsageTrendChart (OANA-07)
// ============================================

const usageTrendConfig = {
  inputTokens: {
    label: "Input",
    color: "var(--chart-1)",
  },
  outputTokens: {
    label: "Output",
    color: "var(--chart-2)",
  },
  thinkingTokens: {
    label: "Thinking",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

interface OrgUsageTrendChartProps {
  data: OrgUsageTrendPoint[]
  onExport?: () => void
}

export function OrgUsageTrendChart({ data, onExport }: OrgUsageTrendChartProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Usage Trends</CardTitle>
        {onExport && <ExportButton onClick={onExport} />}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No usage data for this period" />
        ) : (
          <ChartContainer config={usageTrendConfig} className="min-h-[300px] w-full">
            <AreaChart data={data} accessibilityLayer margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={formatTokens}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="inputTokens"
                stackId="1"
                fill="var(--color-inputTokens)"
                fillOpacity={0.2}
                stroke="var(--color-inputTokens)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="outputTokens"
                stackId="1"
                fill="var(--color-outputTokens)"
                fillOpacity={0.2}
                stroke="var(--color-outputTokens)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="thinkingTokens"
                stackId="1"
                fill="var(--color-thinkingTokens)"
                fillOpacity={0.2}
                stroke="var(--color-thinkingTokens)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 2. OrgTokensByUserChart (OANA-03)
// ============================================

const tokensByUserConfig = {
  inputTokens: {
    label: "Input",
    color: "var(--chart-1)",
  },
  outputTokens: {
    label: "Output",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

interface OrgTokensByUserChartProps {
  data: UserRoleModelUsage[]
  onExport?: () => void
}

export function OrgTokensByUserChart({ data, onExport }: OrgTokensByUserChartProps) {
  // Pivot: group by userName, sum input+output tokens
  const userMap = new Map<string, { input: number; output: number }>()
  for (const row of data) {
    const existing = userMap.get(row.userName) ?? { input: 0, output: 0 }
    existing.input += row.inputTokens
    existing.output += row.outputTokens
    userMap.set(row.userName, existing)
  }

  const chartData = Array.from(userMap.entries())
    .map(([name, tokens]) => ({
      name: name.length > 18 ? name.slice(0, 18) + "..." : name,
      inputTokens: tokens.input,
      outputTokens: tokens.output,
    }))
    .sort((a, b) => (b.inputTokens + b.outputTokens) - (a.inputTokens + a.outputTokens))
    .slice(0, 10)

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Tokens by User</CardTitle>
        {onExport && <ExportButton onClick={onExport} />}
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyState message="No token usage data for this period" />
        ) : (
          <ChartContainer config={tokensByUserConfig} className="w-full" style={{ minHeight: Math.max(200, chartData.length * 40) }}>
            <BarChart
              data={chartData}
              layout="vertical"
              accessibilityLayer
              margin={{ top: 4, right: 80, bottom: 0, left: 8 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickFormatter={formatTokens} tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={120}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="inputTokens" stackId="1" fill="var(--color-inputTokens)" radius={[0, 0, 0, 0]} />
              <Bar dataKey="outputTokens" stackId="1" fill="var(--color-outputTokens)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 3. OrgModelDistributionChart (OANA-04)
// ============================================

const modelDistConfig = {
  tokens: {
    label: "Tokens",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

interface OrgModelDistributionChartProps {
  data: ModelDistributionItem[]
  onExport?: () => void
}

export function OrgModelDistributionChart({ data, onExport }: OrgModelDistributionChartProps) {
  const chartData = [...data]
    .sort((a, b) => a.totalTokens - b.totalTokens)
    .map((d) => ({
      name: d.modelId.replace(/^claude-/, "").replace(/-\d{8}$/, ""),
      tokens: d.totalTokens,
      requests: d.requestCount,
    }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Model Distribution</CardTitle>
        {onExport && <ExportButton onClick={onExport} />}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No model usage data for this period" />
        ) : (
          <ChartContainer config={modelDistConfig} className="w-full" style={{ minHeight: Math.max(200, chartData.length * 44) }}>
            <BarChart
              data={chartData}
              layout="vertical"
              accessibilityLayer
              margin={{ top: 4, right: 80, bottom: 0, left: 8 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickFormatter={formatTokens} tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="tokens"
                fill="var(--color-tokens)"
                radius={[0, 4, 4, 0]}
                label={{ position: "right", formatter: (v: number) => formatTokens(v), fontSize: 11 } as any}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 4. OrgTopUsersChart (OANA-05)
// ============================================

const topUsersConfig = {
  tokens: {
    label: "Tokens",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

interface OrgTopUsersChartProps {
  data: TopUserItem[]
  onExport?: () => void
}

export function OrgTopUsersChart({ data, onExport }: OrgTopUsersChartProps) {
  const chartData = [...data]
    .sort((a, b) => a.totalTokens - b.totalTokens)
    .map((d) => ({
      name: d.userName.length > 18 ? d.userName.slice(0, 18) + "..." : d.userName,
      tokens: d.totalTokens,
      messages: d.messageCount,
      role: d.roleName,
    }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Top Users by Token Usage</CardTitle>
        {onExport && <ExportButton onClick={onExport} />}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No user usage data for this period" />
        ) : (
          <>
            <ChartContainer config={topUsersConfig} className="w-full" style={{ minHeight: Math.max(200, chartData.length * 36) }}>
              <BarChart
                data={chartData}
                layout="vertical"
                accessibilityLayer
                margin={{ top: 4, right: 80, bottom: 0, left: 8 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickFormatter={formatTokens} tick={{ fontSize: 11 }} tickLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar
                  dataKey="tokens"
                  fill="var(--color-tokens)"
                  radius={[0, 4, 4, 0]}
                  label={{ position: "right", formatter: (v: number) => formatTokens(v), fontSize: 11 } as any}
                />
              </BarChart>
            </ChartContainer>
            {/* Data table */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium">Role</th>
                    <th className="pb-2 font-medium text-right">Messages</th>
                    <th className="pb-2 font-medium text-right">Tokens</th>
                  </tr>
                </thead>
                <tbody>
                  {data.slice(0, 10).map((user) => (
                    <tr key={user.userId} className="border-b border-border/50">
                      <td className="py-2">{user.userName}</td>
                      <td className="py-2 text-muted-foreground">{user.roleName}</td>
                      <td className="py-2 text-right">{user.messageCount.toLocaleString()}</td>
                      <td className="py-2 text-right">{formatTokens(user.totalTokens)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 5. OrgPerRoleUsageChart (OANA-06)
// ============================================

const perRoleConfig = {
  tokens: {
    label: "Total Tokens",
    color: "var(--chart-1)",
  },
  requests: {
    label: "Requests",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

interface OrgPerRoleUsageChartProps {
  data: PerRoleUsageItem[]
  onExport?: () => void
}

export function OrgPerRoleUsageChart({ data, onExport }: OrgPerRoleUsageChartProps) {
  const chartData = data.map((d) => ({
    name: d.roleName,
    tokens: d.totalTokens,
    requests: d.requestCount,
    users: d.userCount,
  }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Usage by Role</CardTitle>
        {onExport && <ExportButton onClick={onExport} />}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No role usage data for this period" />
        ) : (
          <ChartContainer config={perRoleConfig} className="min-h-[300px] w-full">
            <BarChart data={chartData} accessibilityLayer margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tickFormatter={formatTokens} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="tokens" fill="var(--color-tokens)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="requests" fill="var(--color-requests)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 6. OrgMcpUsageChart (OANA-08)
// ============================================

const mcpUsageConfig = {
  toolCallCount: {
    label: "Tool Calls",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

interface OrgMcpUsageChartProps {
  data: OrgMcpUsagePoint[]
  onExport?: () => void
}

export function OrgMcpUsageChart({ data, onExport }: OrgMcpUsageChartProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">MCP Tool Usage</CardTitle>
        {onExport && <ExportButton onClick={onExport} />}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No MCP tool usage in this period" />
        ) : (
          <ChartContainer config={mcpUsageConfig} className="min-h-[260px] w-full">
            <AreaChart data={data} accessibilityLayer margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Area
                type="monotone"
                dataKey="toolCallCount"
                fill="var(--color-toolCallCount)"
                fillOpacity={0.2}
                stroke="var(--color-toolCallCount)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 7. OrgAvgResponseTimeChart (OANA-09)
// ============================================

const avgResponseConfig = {
  duration: {
    label: "Avg Response",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

interface OrgAvgResponseTimeChartProps {
  data: AvgResponseTimeItem[]
  onExport?: () => void
}

export function OrgAvgResponseTimeChart({ data, onExport }: OrgAvgResponseTimeChartProps) {
  const chartData = [...data]
    .sort((a, b) => a.avgDurationMs - b.avgDurationMs)
    .map((d) => ({
      name: d.modelId.replace(/^claude-/, "").replace(/-\d{8}$/, ""),
      duration: d.avgDurationMs,
    }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Avg Response Time by Model</CardTitle>
        {onExport && <ExportButton onClick={onExport} />}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No response time data for this period" />
        ) : (
          <ChartContainer config={avgResponseConfig} className="w-full" style={{ minHeight: Math.max(200, chartData.length * 44) }}>
            <BarChart
              data={chartData}
              layout="vertical"
              accessibilityLayer
              margin={{ top: 4, right: 80, bottom: 0, left: 8 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={(v: number) => formatMs(v)}
                tick={{ fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="duration"
                fill="var(--color-duration)"
                radius={[0, 4, 4, 0]}
                label={{ position: "right", formatter: (v: number) => formatMs(v), fontSize: 11 } as any}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 8. OrgErrorRateChart (OANA-10)
// ============================================

const errorChartConfig = {
  rate_limit: { label: "Rate Limit", color: ERROR_COLORS.rate_limit },
  context_length: { label: "Context Length", color: ERROR_COLORS.context_length },
  api_error: { label: "API Error", color: ERROR_COLORS.api_error },
  timeout: { label: "Timeout", color: ERROR_COLORS.timeout },
  other: { label: "Other", color: ERROR_COLORS.other },
} satisfies ChartConfig

interface OrgErrorRateChartProps {
  data: OrgErrorRateItem[]
  onExport?: () => void
}

export function OrgErrorRateChart({ data, onExport }: OrgErrorRateChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    fill: `var(--color-${item.errorType})`,
  }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Error Rate by Type</CardTitle>
        {onExport && <ExportButton onClick={onExport} />}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No errors recorded in this period" icon="check" />
        ) : (
          <ChartContainer config={errorChartConfig} className="min-h-[260px] w-full">
            <PieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="errorType"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
              />
              <ChartLegend content={<ChartLegendContent nameKey="errorType" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 9. OrgPeakUsageHeatmap (OANA-11)
// ============================================

interface OrgPeakUsageHeatmapProps {
  data: OrgPeakUsagePoint[]
  onExport?: () => void
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

export function OrgPeakUsageHeatmap({ data, onExport }: OrgPeakUsageHeatmapProps) {
  const lookup = new Map<string, number>()
  let maxCount = 0

  for (const point of data) {
    const key = `${point.dayOfWeek}-${point.hour}`
    lookup.set(key, point.count)
    if (point.count > maxCount) maxCount = point.count
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Peak Usage Hours</CardTitle>
        {onExport && <ExportButton onClick={onExport} />}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No usage data for this period" />
        ) : (
          <div className="overflow-x-auto">
            <div
              className="grid gap-0.5 min-w-[600px]"
              style={{ gridTemplateColumns: "48px repeat(24, 1fr)" }}
            >
              {/* Header row: hour labels */}
              <div className="h-6" />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="h-6 flex items-center justify-center text-[10px] text-muted-foreground">
                  {h}
                </div>
              ))}

              {/* Data rows: day x hour */}
              {DAY_LABELS.map((dayLabel, dayIndex) => (
                <div key={`row-${dayIndex}`} className="contents">
                  <div className="h-7 flex items-center justify-end pr-2 text-xs text-muted-foreground">
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
                        title={`${DAY_LABELS[dayIndex]} ${hour}:00 - ${count} requests`}
                      />
                    )
                  })}
                </div>
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
// 10. OrgInvitationStatusChart (OANA-12)
// ============================================

const invitationChartConfig = {
  PENDING: { label: "Pending", color: INVITATION_COLORS.PENDING },
  ACCEPTED: { label: "Accepted", color: INVITATION_COLORS.ACCEPTED },
  EXPIRED: { label: "Expired", color: INVITATION_COLORS.EXPIRED },
  REVOKED: { label: "Revoked", color: INVITATION_COLORS.REVOKED },
} satisfies ChartConfig

interface OrgInvitationStatusChartProps {
  data: InvitationStatsItem[]
  onExport?: () => void
}

export function OrgInvitationStatusChart({ data, onExport }: OrgInvitationStatusChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    fill: `var(--color-${item.status})`,
  }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Invitation Status</CardTitle>
        {onExport && <ExportButton onClick={onExport} />}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No invitation data available" />
        ) : (
          <ChartContainer config={invitationChartConfig} className="min-h-[260px] w-full">
            <PieChart accessibilityLayer>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
              />
              <ChartLegend content={<ChartLegendContent nameKey="status" />} />
            </PieChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 11. OrgApiKeyUsageChart (OANA-13)
// ============================================

const apiKeyUsageConfig = {
  tokens: {
    label: "Tokens",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

interface OrgApiKeyUsageChartProps {
  data: ApiKeyUsageItem[]
  onExport?: () => void
}

export function OrgApiKeyUsageChart({ data, onExport }: OrgApiKeyUsageChartProps) {
  const chartData = [...data]
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .map((d) => ({
      name: d.keyName.length > 18 ? d.keyName.slice(0, 18) + "..." : d.keyName,
      tokens: d.totalTokens,
      requests: d.requestCount,
    }))

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">API Key Usage</CardTitle>
        {onExport && <ExportButton onClick={onExport} />}
      </CardHeader>
      <CardContent>
        {chartData.every((d) => d.tokens === 0) || chartData.length === 0 ? (
          <EmptyState message="No API key usage data for this period" />
        ) : (
          <ChartContainer config={apiKeyUsageConfig} className="w-full" style={{ minHeight: Math.max(200, chartData.length * 44) }}>
            <BarChart
              data={chartData}
              layout="vertical"
              accessibilityLayer
              margin={{ top: 4, right: 80, bottom: 0, left: 8 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickFormatter={formatTokens} tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis
                type="category"
                dataKey="name"
                width={130}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="tokens"
                fill="var(--color-tokens)"
                radius={[0, 4, 4, 0]}
                label={{ position: "right", formatter: (v: number) => formatTokens(v), fontSize: 11 } as any}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 12. OrgUsersNearLimitsTable (OANA-14)
// ============================================

interface OrgUsersNearLimitsTableProps {
  data: UserNearLimitItem[]
  onExport?: () => void
}

export function OrgUsersNearLimitsTable({ data, onExport }: OrgUsersNearLimitsTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Users Near Limits</CardTitle>
        {onExport && <ExportButton onClick={onExport} />}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="No users are near their usage limits" icon="check" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium text-right">Usage %</th>
                  <th className="pb-2 font-medium">Limit Type</th>
                </tr>
              </thead>
              <tbody>
                {data.map((user) => (
                  <tr key={user.userId} className="border-b border-border/50">
                    <td className="py-2">{user.userName}</td>
                    <td className="py-2 text-muted-foreground">{user.roleName}</td>
                    <td className="py-2 text-right">
                      <span
                        className={
                          user.usagePercent >= 95
                            ? "text-destructive font-medium"
                            : user.usagePercent >= 80
                            ? "text-amber-600 dark:text-amber-400 font-medium"
                            : ""
                        }
                      >
                        {user.usagePercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-2 capitalize text-muted-foreground">{user.limitType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 13. OrgInactiveUsersTable (OANA-15)
// ============================================

interface OrgInactiveUsersTableProps {
  data: InactiveUserItem[]
  onExport?: () => void
}

export function OrgInactiveUsersTable({ data, onExport }: OrgInactiveUsersTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Inactive Users (30+ Days)</CardTitle>
        {onExport && <ExportButton onClick={onExport} />}
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState message="All users have been active recently" icon="check" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Name</th>
                  <th className="pb-2 font-medium">Email</th>
                  <th className="pb-2 font-medium">Role</th>
                  <th className="pb-2 font-medium text-right">Last Active</th>
                  <th className="pb-2 font-medium text-right">Days Inactive</th>
                </tr>
              </thead>
              <tbody>
                {data.map((user) => (
                  <tr key={user.userId} className="border-b border-border/50">
                    <td className="py-2">{user.userName}</td>
                    <td className="py-2 text-muted-foreground">{user.email}</td>
                    <td className="py-2 text-muted-foreground">{user.roleName}</td>
                    <td className="py-2 text-right text-muted-foreground">
                      {user.lastActiveAt
                        ? new Date(user.lastActiveAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "Never"}
                    </td>
                    <td className="py-2 text-right">
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        {user.daysSinceActive}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
