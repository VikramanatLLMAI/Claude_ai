"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Analytics Chart Components for Super Admin Dashboard
 *
 * All chart components use shadcn/ui Chart wrappers over recharts v3.7.0.
 * PeakUsageHeatmap uses a custom CSS grid (no native heatmap in Recharts).
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
import { EmptyState, formatTokens, formatDate, padSinglePointData, ERROR_COLORS } from "@/components/admin/chart-utils"
import { Tooltip as RadixTooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"

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
          <ChartContainer config={usageTrendConfig} className="min-h-[300px] w-full">
            <AreaChart data={padSinglePointData(data)} accessibilityLayer margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
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
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatDate(String(value))} />} />
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

  // Build dynamic ChartConfig from org names
  const chartVars = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
  const chartConfig: ChartConfig = Object.fromEntries(
    orgNames.map((name, i) => [
      name,
      { label: name, color: chartVars[i % chartVars.length] },
    ])
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Token Consumption by Organization</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <EmptyState message="No token data in this period" />
        ) : (
          <ChartContainer config={chartConfig} className="min-h-[300px] w-full">
            <AreaChart data={padSinglePointData(chartData)} accessibilityLayer margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
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
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatDate(String(value))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              {orgNames.map((orgName) => (
                <Area
                  key={orgName}
                  type="monotone"
                  dataKey={orgName}
                  stackId="1"
                  fill={`var(--color-${orgName})`}
                  fillOpacity={0.2}
                  stroke={`var(--color-${orgName})`}
                  strokeWidth={2}
                />
              ))}
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// TopOrgsChart (SANA-06)
// ============================================

const topOrgsConfig = {
  tokens: {
    label: "Tokens",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

interface TopOrgsChartProps {
  data: TopOrgUsage[]
}

export function TopOrgsChart({ data }: TopOrgsChartProps) {
  const chartData = [...data]
    .sort((a, b) => a.totalTokens - b.totalTokens)
    .map((d) => ({
      name: d.name.length > 20 ? d.name.slice(0, 20) + "\u2026" : d.name,
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
          <ChartContainer
            config={topOrgsConfig}
            className="min-h-[200px] w-full"
            style={{ height: Math.max(200, chartData.length * 40) }}
          >
            <BarChart
              data={chartData}
              layout="vertical"
              accessibilityLayer
              margin={{ top: 4, right: 80, bottom: 0, left: 8 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickFormatter={formatTokens} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
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
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// ErrorRateChart (SANA-07)
// ============================================

const errorChartConfig = {
  rate_limit: { label: "Rate Limit", color: ERROR_COLORS.rate_limit },
  context_length: { label: "Context Length", color: ERROR_COLORS.context_length },
  api_error: { label: "API Error", color: ERROR_COLORS.api_error },
  timeout: { label: "Timeout", color: ERROR_COLORS.timeout },
  other: { label: "Other", color: ERROR_COLORS.other },
} satisfies ChartConfig

interface ErrorRateChartProps {
  data: ErrorRateItem[]
}

export function ErrorRateChart({ data }: ErrorRateChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    fill: `var(--color-${item.type})`,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">AI Error Rate by Type</CardTitle>
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
                nameKey="type"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
              />
              <ChartLegend content={<ChartLegendContent nameKey="type" />} />
            </PieChart>
          </ChartContainer>
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
          <TooltipProvider delayDuration={0}>
            <div
              className="grid gap-0.5"
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
                <div key={`row-${dayIndex}`} className="contents">
                  <div className="h-7 flex items-center justify-end pr-2 text-xs text-muted-foreground">
                    {dayLabel}
                  </div>
                  {Array.from({ length: 24 }, (_, hour) => {
                    const count = lookup.get(`${dayIndex}-${hour}`) ?? 0
                    const intensity = maxCount > 0 ? count / maxCount : 0
                    const alpha = 0.08 + intensity * 0.85
                    return (
                      <RadixTooltip key={`cell-${dayIndex}-${hour}`}>
                        <TooltipTrigger asChild>
                          <div
                            className="h-7 rounded-sm cursor-default"
                            style={{
                              backgroundColor: `rgba(34, 197, 94, ${alpha})`,
                            }}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          {DAY_LABELS[dayIndex]} {hour}:00 -- {count} requests
                        </TooltipContent>
                      </RadixTooltip>
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
          </TooltipProvider>
        )}
      </CardContent>
    </Card>
  )
}

// ============================================
// ApiKeyConsumptionChart (SANA-09)
// ============================================

const apiKeyConfig = {
  tokens: {
    label: "Tokens",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

interface ApiKeyConsumptionChartProps {
  data: ApiKeyConsumptionItem[]
}

export function ApiKeyConsumptionChart({ data }: ApiKeyConsumptionChartProps) {
  const chartData = data
    .sort((a, b) => b.totalTokens - a.totalTokens)
    .map((d) => ({
      name:
        d.keyName.length > 18 ? d.keyName.slice(0, 18) + "\u2026" : d.keyName,
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
          <ChartContainer
            config={apiKeyConfig}
            className="min-h-[200px] w-full"
            style={{ height: Math.max(200, chartData.length * 44) }}
          >
            <BarChart
              data={chartData}
              layout="vertical"
              accessibilityLayer
              margin={{ top: 4, right: 80, bottom: 0, left: 8 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis type="number" tickFormatter={formatTokens} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
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
// McpUsageChart (SANA-10)
// ============================================

const mcpUsageConfig = {
  toolInvocations: {
    label: "Invocations",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

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
          <ChartContainer config={mcpUsageConfig} className="min-h-[260px] w-full">
            <AreaChart data={padSinglePointData(data)} accessibilityLayer margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatDate(String(value))} />} />
              <Area
                type="monotone"
                dataKey="toolInvocations"
                fill="var(--color-toolInvocations)"
                fillOpacity={0.2}
                stroke="var(--color-toolInvocations)"
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
// RegistrationTrendChart (SANA-11)
// ============================================

const registrationConfig = {
  newOrgs: {
    label: "New Organizations",
    color: "var(--chart-1)",
  },
  newUsers: {
    label: "New Users",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig

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
          <ChartContainer config={registrationConfig} className="min-h-[260px] w-full">
            <AreaChart data={padSinglePointData(data)} accessibilityLayer margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} />
              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <ChartTooltip content={<ChartTooltipContent labelFormatter={(value) => formatDate(String(value))} />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                type="monotone"
                dataKey="newOrgs"
                fill="var(--color-newOrgs)"
                fillOpacity={0.2}
                stroke="var(--color-newOrgs)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="newUsers"
                fill="var(--color-newUsers)"
                fillOpacity={0.2}
                stroke="var(--color-newUsers)"
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
// FeatureAdoptionChart (SANA-12)
// ============================================

const featureAdoptionConfig = {
  percentage: {
    label: "Adoption",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig

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
          <ChartContainer
            config={featureAdoptionConfig}
            className="min-h-[180px] w-full"
            style={{ height: Math.max(180, chartData.length * 48) }}
          >
            <BarChart
              data={chartData}
              layout="vertical"
              accessibilityLayer
              margin={{ top: 4, right: 80, bottom: 0, left: 8 }}
            >
              <CartesianGrid horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tickFormatter={(v: number) => `${v}%`}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="feature"
                width={160}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar
                dataKey="percentage"
                fill="var(--color-percentage)"
                radius={[0, 4, 4, 0]}
                label={{ position: "right", formatter: (v: number) => `${v}%`, fontSize: 11 } as any}
              />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
