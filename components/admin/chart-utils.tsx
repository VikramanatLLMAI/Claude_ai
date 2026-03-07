"use client"

import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

// ============================================
// Formatters
// ============================================

export function formatTokens(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return String(value)
}

export function formatDate(date: string): string {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })
}

export function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms)}ms`
}

// ============================================
// Semantic Color Constants
// ============================================

export const ERROR_COLORS: Record<string, string> = {
  rate_limit: "#ef4444",
  context_length: "#f59e0b",
  api_error: "#8b5cf6",
  timeout: "#06b6d4",
  other: "#94a3b8",
}

export const INVITATION_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  ACCEPTED: "#10b981",
  EXPIRED: "#94a3b8",
  REVOKED: "#ef4444",
}

// ============================================
// EmptyState Component
// ============================================

export function EmptyState({
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

// ============================================
// ExportButton Component
// ============================================

export function ExportButton({ onClick }: { onClick: () => void }) {
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
