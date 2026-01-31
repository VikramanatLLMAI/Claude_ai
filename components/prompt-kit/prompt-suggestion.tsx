"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { motion } from "motion/react"
import { Sparkles, ArrowRight, Star } from "lucide-react"

interface Suggestion {
  label: string
  description?: string
  highlighted?: boolean
  icon?: React.ReactNode
}

interface PromptSuggestionProps {
  className?: string
  suggestions: Suggestion[]
  onSelect: (suggestion: Suggestion) => void
  title?: string
  columns?: 1 | 2 | 3 | 4
  showTitle?: boolean
}

const PromptSuggestion = React.forwardRef<HTMLDivElement, PromptSuggestionProps>(
  (
    {
      className,
      suggestions,
      onSelect,
      title = "Try asking",
      columns = 2,
      showTitle = false,
    },
    ref
  ) => {
    const gridCols = {
      1: "grid-cols-1",
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
    }

    return (
      <div ref={ref} className={cn("w-full", className)}>
        {showTitle && title && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-3 flex items-center gap-2 text-sm text-muted-foreground"
          >
            <Sparkles className="h-4 w-4 text-primary/60" />
            <span>{title}</span>
          </motion.div>
        )}
        <div className={cn("grid gap-2", gridCols[columns])}>
          {suggestions.map((suggestion, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.05,
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(suggestion)}
              className={cn(
                "group relative flex flex-col items-start gap-1 rounded-xl border border-border bg-card p-3.5 text-left",
                "transition-all duration-200",
                "hover:border-primary/40 hover:bg-muted/30 hover:shadow-md hover:shadow-primary/5",
                suggestion.highlighted && "border-primary/30 bg-gradient-to-br from-primary/5 to-transparent"
              )}
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />

              <div className="relative flex w-full items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {suggestion.icon && (
                    <span className="text-muted-foreground shrink-0 group-hover:text-primary/70 transition-colors">
                      {suggestion.icon}
                    </span>
                  )}
                  <span
                    className={cn(
                      "text-sm font-medium truncate",
                      suggestion.highlighted && "text-primary"
                    )}
                  >
                    {suggestion.label}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {suggestion.highlighted && (
                    <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      <Star className="h-2.5 w-2.5 fill-primary" />
                      Top
                    </span>
                  )}
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-200 group-hover:translate-x-0.5" />
                </div>
              </div>
              {suggestion.description && (
                <span className="relative text-xs text-muted-foreground line-clamp-2 group-hover:text-muted-foreground/80 transition-colors">
                  {suggestion.description}
                </span>
              )}
            </motion.button>
          ))}
        </div>
      </div>
    )
  }
)

PromptSuggestion.displayName = "PromptSuggestion"

// Chip-style variant for inline suggestions with enhanced styling
interface PromptSuggestionChipsProps {
  className?: string
  suggestions: string[]
  onSelect: (suggestion: string) => void
}

const PromptSuggestionChips = React.forwardRef<
  HTMLDivElement,
  PromptSuggestionChipsProps
>(({ className, suggestions, onSelect }, ref) => (
  <div ref={ref} className={cn("flex flex-wrap gap-2", className)}>
    {suggestions.map((suggestion, index) => (
      <motion.button
        key={index}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{
          delay: index * 0.03,
          type: "spring",
          stiffness: 400,
          damping: 25,
        }}
        whileHover={{ scale: 1.05, y: -1 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => onSelect(suggestion)}
        className={cn(
          "rounded-full border border-border bg-card px-3.5 py-1.5 text-sm",
          "transition-all duration-150",
          "hover:border-primary/40 hover:bg-primary/5 hover:text-primary hover:shadow-sm"
        )}
      >
        {suggestion}
      </motion.button>
    ))}
  </div>
))

PromptSuggestionChips.displayName = "PromptSuggestionChips"

// Quick action pills - smaller, more compact suggestions
interface QuickActionProps {
  className?: string
  actions: Array<{ label: string; icon?: React.ReactNode; onClick: () => void }>
}

const QuickActions = React.forwardRef<HTMLDivElement, QuickActionProps>(
  ({ className, actions }, ref) => (
    <div ref={ref} className={cn("flex flex-wrap gap-1.5", className)}>
      {actions.map((action, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.02 }}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={action.onClick}
          className={cn(
            "flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1 text-xs font-medium",
            "transition-all duration-150",
            "hover:bg-primary/10 hover:text-primary"
          )}
        >
          {action.icon}
          {action.label}
        </motion.button>
      ))}
    </div>
  )
)

QuickActions.displayName = "QuickActions"

export {
  PromptSuggestion,
  PromptSuggestionChips,
  QuickActions,
  type Suggestion,
  type QuickActionProps,
}
