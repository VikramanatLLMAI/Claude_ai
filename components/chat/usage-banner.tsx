"use client"

/**
 * UsageBanner - Warning and blocked banners for chat UI
 *
 * Polls GET /api/org/[slug]/usage-status every 60 seconds to display:
 * - Amber warning banner at 80-99% of daily limit (dismissible)
 * - Red blocked banner at 100% of daily limit (not dismissible, disables input)
 *
 * Covers: OUSE-02, OUSE-03, UCHAT-03, UCHAT-04
 */

import { useEffect, useState, useCallback, useRef } from "react"
import { AlertTriangle, Ban, X } from "lucide-react"
import { cn } from "@/lib/utils"

const AUTH_TOKEN_KEY = "llmatscale_auth_token"
const POLL_INTERVAL_MS = 60_000 // 60 seconds

interface UsageStatus {
  current: number
  limit: number
  percentage: number
}

interface UsageStatusResponse {
  requestStatus: UsageStatus | null
  tokenStatus: UsageStatus | null
  resetAt: string | null
  warning: boolean
  blocked: boolean
}

interface UsageBannerProps {
  orgSlug: string
  onBlockedChange?: (blocked: boolean) => void
}

function formatResetTime(resetAt: string | null): string {
  if (!resetAt) return "soon"
  const resetDate = new Date(resetAt)
  const now = new Date()
  const diffMs = resetDate.getTime() - now.getTime()

  if (diffMs <= 0) return "soon"

  const diffMinutes = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours > 0) {
    const remainingMinutes = diffMinutes % 60
    return remainingMinutes > 0
      ? `${diffHours}h ${remainingMinutes}m`
      : `${diffHours}h`
  }
  return `${diffMinutes}m`
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`
  return num.toString()
}

export function UsageBanner({ orgSlug, onBlockedChange }: UsageBannerProps) {
  const [status, setStatus] = useState<UsageStatusResponse | null>(null)
  const [dismissed, setDismissed] = useState(false)
  const previousBlockedRef = useRef<boolean>(false)
  const dismissedAtPercentageRef = useRef<number>(0)

  const fetchUsageStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY)
      if (!token) return

      const response = await fetch(`/api/org/${orgSlug}/usage-status`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) return

      const data: UsageStatusResponse = await response.json()
      setStatus(data)

      // Notify parent of blocked state changes
      if (data.blocked !== previousBlockedRef.current) {
        previousBlockedRef.current = data.blocked
        onBlockedChange?.(data.blocked)
      }

      // Reset dismissal if usage crosses a new threshold (e.g., went from 85% to 95%)
      if (dismissed && data.warning) {
        const currentMaxPercentage = Math.max(
          data.requestStatus?.percentage ?? 0,
          data.tokenStatus?.percentage ?? 0
        )
        // If percentage increased by more than 10% since dismissal, re-show
        if (currentMaxPercentage - dismissedAtPercentageRef.current > 0.1) {
          setDismissed(false)
        }
      }

      // Reset dismissal if no longer warning (went below 80%)
      if (dismissed && !data.warning && !data.blocked) {
        setDismissed(false)
        dismissedAtPercentageRef.current = 0
      }
    } catch {
      // Silently fail - banner is non-critical
    }
  }, [orgSlug, onBlockedChange, dismissed])

  useEffect(() => {
    fetchUsageStatus()
    const interval = setInterval(fetchUsageStatus, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [fetchUsageStatus])

  // Nothing to show: no limits, no status, below 80%, or dismissed warning
  if (!status) return null
  if (!status.warning && !status.blocked) return null
  if (status.warning && dismissed) return null

  const isBlocked = status.blocked
  const resetTimeStr = formatResetTime(status.resetAt)

  // Build the display text
  const primaryStatus = status.requestStatus ?? status.tokenStatus
  const isRequestBased = !!status.requestStatus
  const label = isRequestBased ? "requests" : "tokens"
  const currentFormatted = primaryStatus ? formatNumber(primaryStatus.current) : ""
  const limitFormatted = primaryStatus ? formatNumber(primaryStatus.limit) : ""
  const percentage = primaryStatus ? Math.round(primaryStatus.percentage * 100) : 0

  if (isBlocked) {
    return (
      <div
        role="alert"
        className={cn(
          "mx-auto max-w-3xl px-4 py-3 mb-2 rounded-lg border flex items-start gap-3 text-sm",
          "bg-red-50 border-red-200 text-red-800",
          "dark:bg-red-950/50 dark:border-red-800 dark:text-red-200"
        )}
      >
        <Ban className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <p className="font-medium">Daily usage limit reached</p>
          <p className="mt-0.5 text-red-700 dark:text-red-300">
            You have used {currentFormatted} of {limitFormatted} daily {label}.
            Chat is disabled until the limit resets (in {resetTimeStr}).
          </p>
        </div>
      </div>
    )
  }

  // Warning state (80-99%)
  return (
    <div
      role="status"
      className={cn(
        "mx-auto max-w-3xl px-4 py-3 mb-2 rounded-lg border flex items-start gap-3 text-sm",
        "bg-amber-50 border-amber-200 text-amber-800",
        "dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-200"
      )}
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p>
          You have used {currentFormatted} of {limitFormatted} daily {label} ({percentage}%).
          Limit resets in {resetTimeStr}.
        </p>
      </div>
      <button
        onClick={() => {
          setDismissed(true)
          dismissedAtPercentageRef.current = Math.max(
            status.requestStatus?.percentage ?? 0,
            status.tokenStatus?.percentage ?? 0
          )
        }}
        className={cn(
          "flex-shrink-0 rounded-md p-1 transition-colors",
          "hover:bg-amber-100 dark:hover:bg-amber-900/50"
        )}
        aria-label="Dismiss usage warning"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
