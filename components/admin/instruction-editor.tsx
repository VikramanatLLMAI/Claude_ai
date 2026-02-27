"use client"

import * as React from "react"
import { estimateTokenCount } from "@/lib/token-counter"
import { cn } from "@/lib/utils"

interface InstructionEditorProps {
  value: string
  onChange: (value: string) => void
  maxTokens: number
  label: string
  description?: string
  disabled?: boolean
  disabledMessage?: string
}

/**
 * Reusable textarea with live token counter.
 *
 * Used for org-level, role-level, and user-level system instructions.
 * Shows approximate token count vs limit with a color-coded progress bar.
 */
export function InstructionEditor({
  value,
  onChange,
  maxTokens,
  label,
  description,
  disabled = false,
  disabledMessage,
}: InstructionEditorProps) {
  const tokenCount = React.useMemo(() => estimateTokenCount(value), [value])
  const percentage = maxTokens > 0 ? (tokenCount / maxTokens) * 100 : 0

  // Color coding: green < 80%, amber 80-100%, red > 100%
  const progressColor =
    percentage > 100
      ? "bg-destructive"
      : percentage >= 80
        ? "bg-amber-500"
        : "bg-emerald-500"

  const countColor =
    percentage > 100
      ? "text-destructive"
      : percentage >= 80
        ? "text-amber-600 dark:text-amber-400"
        : "text-muted-foreground"

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground">{label}</label>
        <span className={cn("text-xs tabular-nums", countColor)}>
          ~{tokenCount} / {maxTokens} tokens
        </span>
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={
            disabled && disabledMessage
              ? disabledMessage
              : "Enter system instructions..."
          }
          rows={6}
          className={cn(
            "w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
            disabled && "cursor-not-allowed opacity-50 bg-muted"
          )}
        />
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-300", progressColor)}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
    </div>
  )
}
