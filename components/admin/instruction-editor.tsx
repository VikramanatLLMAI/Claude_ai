"use client"

import * as React from "react"
import { estimateTokenCount } from "@/lib/token-counter"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface InstructionEditorProps {
  value: string
  onChange: (value: string) => void
  onSave?: () => void
  saving?: boolean
  maxTokens: number
  label?: string
  description?: string
  placeholder?: string
  disabled?: boolean
  disabledMessage?: string
}

/**
 * Reusable textarea with live token counter, auto-growing height,
 * color-coded progress bar, and Ctrl+S keyboard shortcut.
 *
 * Used for org-level, role-level, and user-level system instructions.
 * Shows approximate token count vs limit with a color-coded progress bar.
 */
export function InstructionEditor({
  value,
  onChange,
  onSave,
  saving = false,
  maxTokens,
  label,
  description,
  placeholder,
  disabled = false,
  disabledMessage,
}: InstructionEditorProps) {
  const tokenCount = React.useMemo(() => estimateTokenCount(value), [value])
  const percentage = maxTokens > 0 ? (tokenCount / maxTokens) * 100 : 0

  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Color coding: green 0-60%, yellow 60-80%, red 80%+
  const progressColor =
    percentage > 100
      ? "bg-destructive"
      : percentage >= 80
        ? "bg-red-500"
        : percentage >= 60
          ? "bg-yellow-500"
          : "bg-green-500"

  const countColor =
    percentage > 100
      ? "text-destructive"
      : percentage >= 80
        ? "text-red-600 dark:text-red-400"
        : percentage >= 60
          ? "text-yellow-600 dark:text-yellow-400"
          : "text-muted-foreground"

  // Progress bar width: minimum 2% so there is always a visible baseline
  const progressWidth = tokenCount === 0 ? 0 : Math.max(Math.min(percentage, 100), 2)

  // Auto-grow textarea based on content
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    // Reset height to auto to measure scrollHeight accurately
    textarea.style.height = "auto"
    // Clamp between min 120px and max 400px
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 120), 400)
    textarea.style.height = `${newHeight}px`
  }, [value])

  // Ctrl+S / Cmd+S keyboard shortcut (scoped to editor container)
  React.useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        if (!disabled && !saving && onSave) {
          onSave()
        }
      }
    }

    container.addEventListener("keydown", handler)
    return () => container.removeEventListener("keydown", handler)
  }, [disabled, saving, onSave])

  return (
    <div className="space-y-2" ref={containerRef}>
      <div className="flex items-center justify-between">
        {label && <label className="text-sm font-medium text-foreground">{label}</label>}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className={cn("text-xs tabular-nums cursor-help", countColor)}>
                ~{tokenCount} / {maxTokens} tokens
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[260px] text-xs">
              Token count is approximate. Actual token usage may vary slightly
              based on the model&apos;s tokenizer.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}

      <div className="relative">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder={
            disabled && disabledMessage
              ? disabledMessage
              : placeholder || "Enter system instructions..."
          }
          className={cn(
            "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 overflow-y-auto",
            disabled && "cursor-not-allowed opacity-50 bg-muted"
          )}
          style={{ minHeight: "120px", maxHeight: "400px", resize: "none" }}
        />
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all duration-300", progressColor)}
          style={{ width: `${progressWidth}%` }}
        />
      </div>
    </div>
  )
}
