"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Org Analytics Chart Components for Org Admin Dashboard
 *
 * All chart components use recharts v3.7.0 (already installed).
 * PeakUsageHeatmap uses a custom CSS grid (no native heatmap in Recharts).
 *
 * Note: Recharts v3 has strict TypeScript types for Tooltip formatters/labelFormatters.
 * We use `as any` casts on those props to stay compatible with both the type-checker
 * and the runtime API. This is the established pattern for recharts v3 + React 19.
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
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

// ============================================
// Color Palette (consistent with Super Admin charts)
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

const INVITATION_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  ACCEPTED: "#10b981",
  EXPIRED: "#94a3b8",
  REVOKED: "#ef4444",
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

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

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
// Shared Components
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

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-7 w-7"
      onClick={onClick}
      title="Export as CSV"
    >
      <Download className="h-3.5 w-3.5" />
    </Button>
  )
}

// ============================================
// 1. OrgUsageTrendChart (OANA-07)
// ============================================

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
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="orgInputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="orgOutputGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="orgThinkingGrad" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#orgInputGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="outputTokens"
                stackId="1"
                stroke="#10b981"
                fill="url(#orgOutputGrad)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="thinkingTokens"
                stackId="1"
                stroke="#8b5cf6"
                fill="url(#orgThinkingGrad)"
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
// 2. OrgTokensByUserChart (OANA-03)
// ============================================

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
                formatter={((value: number, name: string) => [
                  formatTokens(value),
                  name === "inputTokens" ? "Input" : "Output",
                ]) as any}
              />
              <Legend
                formatter={(value: string) =>
                  value === "inputTokens" ? "Input Tokens" : "Output Tokens"
                }
              />
              <Bar dataKey="inputTokens" stackId="1" fill="#3b82f6" radius={[0, 0, 0, 0]} />
              <Bar dataKey="outputTokens" stackId="1" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 3. OrgModelDistributionChart (OANA-04)
// ============================================

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
              <Bar
                dataKey="tokens"
                fill="#8b5cf6"
                radius={[0, 4, 4, 0]}
                label={{ position: "right", formatter: (v: number) => formatTokens(v), fontSize: 11 } as any}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 4. OrgTopUsersChart (OANA-05)
// ============================================

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
            <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 36)}>
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
                <Bar
                  dataKey="tokens"
                  fill="#3b82f6"
                  radius={[0, 4, 4, 0]}
                  label={{ position: "right", formatter: (v: number) => formatTokens(v), fontSize: 11 } as any}
                />
              </BarChart>
            </ResponsiveContainer>
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
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tickFormatter={formatTokens} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <Tooltip
                formatter={((value: number, name: string) => [
                  name === "tokens" ? formatTokens(value) : value,
                  name === "tokens" ? "Tokens" : "Requests",
                ]) as any}
              />
              <Legend
                formatter={(value: string) =>
                  value === "tokens" ? "Total Tokens" : "Requests"
                }
              />
              <Bar dataKey="tokens" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="requests" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 6. OrgMcpUsageChart (OANA-08)
// ============================================

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
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="orgMcpGrad" x1="0" y1="0" x2="0" y2="1">
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
                formatter={((value: number) => [value, "Tool Calls"]) as any}
                labelFormatter={((label: string) => formatDate(label)) as any}
              />
              <Area
                type="monotone"
                dataKey="toolCallCount"
                stroke="#06b6d4"
                fill="url(#orgMcpGrad)"
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
// 7. OrgAvgResponseTimeChart (OANA-09)
// ============================================

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
          <ResponsiveContainer width="100%" height={Math.max(200, chartData.length * 44)}>
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 80, bottom: 0, left: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border/50" />
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
              <Tooltip
                formatter={((value: number) => [formatMs(value), "Avg Duration"]) as any}
              />
              <Bar
                dataKey="duration"
                fill="#f59e0b"
                radius={[0, 4, 4, 0]}
                label={{ position: "right", formatter: (v: number) => formatMs(v), fontSize: 11 } as any}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// 8. OrgErrorRateChart (OANA-10)
// ============================================

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

interface OrgErrorRateChartProps {
  data: OrgErrorRateItem[]
  onExport?: () => void
}

export function OrgErrorRateChart({ data, onExport }: OrgErrorRateChartProps) {
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
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="errorType"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                labelLine={false}
                label={renderCustomLabel as any}
              >
                {data.map((entry, i) => (
                  <Cell
                    key={entry.errorType}
                    fill={ERROR_COLORS[entry.errorType] ?? CHART_COLORS[i % CHART_COLORS.length]}
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

interface OrgInvitationStatusChartProps {
  data: InvitationStatsItem[]
  onExport?: () => void
}

export function OrgInvitationStatusChart({ data, onExport }: OrgInvitationStatusChartProps) {
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
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                labelLine={false}
                label={renderCustomLabel as any}
              >
                {data.map((entry, i) => (
                  <Cell
                    key={entry.status}
                    fill={INVITATION_COLORS[entry.status] ?? CHART_COLORS[i % CHART_COLORS.length]}
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
// 11. OrgApiKeyUsageChart (OANA-13)
// ============================================

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
              <Bar
                dataKey="tokens"
                fill="#6366f1"
                radius={[0, 4, 4, 0]}
                label={{ position: "right", formatter: (v: number) => formatTokens(v), fontSize: 11 } as any}
              />
            </BarChart>
          </ResponsiveContainer>
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
