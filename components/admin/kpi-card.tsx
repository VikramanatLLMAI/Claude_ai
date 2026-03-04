"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface KpiCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  trend?: { value: number; positive: boolean }
  className?: string
}

/**
 * Reusable KPI summary card for analytics dashboards.
 *
 * Renders a card with:
 * - Icon in top-right corner
 * - Large bold value
 * - Muted subtitle text
 * - Optional trend indicator (green up / red down + percentage)
 */
export function KpiCard({ title, value, subtitle, icon: Icon, trend, className }: KpiCardProps) {
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {title}
          </CardTitle>
          <div className="rounded-md bg-muted p-2">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
        {trend !== undefined && (
          <div
            className={cn(
              "mt-2 flex items-center gap-1 text-xs font-medium",
              trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
            )}
          >
            {trend.positive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span>
              {trend.positive ? "+" : ""}
              {trend.value.toFixed(1)}% vs prior period
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
