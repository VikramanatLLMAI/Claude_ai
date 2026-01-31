"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ExternalLink, Globe, FileText, Newspaper } from "lucide-react"
import { motion } from "motion/react"

interface Source {
  /** The title of the source */
  title: string
  /** The URL of the source */
  url: string
  /** Optional snippet/description from the source */
  snippet?: string
  /** Optional favicon URL */
  favicon?: string
  /** Optional source type for icon selection */
  type?: "web" | "document" | "article"
}

interface SourceCardProps extends React.HTMLAttributes<HTMLAnchorElement> {
  source: Source
  index?: number
}

function getSourceIcon(type?: Source["type"]) {
  switch (type) {
    case "document":
      return <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
    case "article":
      return <Newspaper className="h-4 w-4 shrink-0 text-muted-foreground" />
    case "web":
    default:
      return <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
  }
}

function getDomain(url: string): string {
  try {
    const domain = new URL(url).hostname
    return domain.replace(/^www\./, "")
  } catch {
    return url
  }
}

const SourceCard = React.forwardRef<HTMLAnchorElement, SourceCardProps>(
  ({ source, index = 0, className }, ref) => {
    return (
      <motion.a
        ref={ref}
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
        className={cn(
          "group flex items-start gap-3 rounded-lg border border-border bg-card p-3 transition-colors hover:border-primary/50 hover:bg-muted/50",
          className
        )}
      >
        {/* Favicon or type icon */}
        <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted">
          {source.favicon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={source.favicon}
              alt=""
              className="h-4 w-4 rounded-sm object-contain"
              onError={(e) => {
                // Fallback to type icon if favicon fails to load
                e.currentTarget.style.display = "none"
              }}
            />
          ) : (
            getSourceIcon(source.type)
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h4 className="truncate text-sm font-medium text-foreground group-hover:text-primary">
              {source.title}
            </h4>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {getDomain(source.url)}
          </p>
          {source.snippet && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {source.snippet}
            </p>
          )}
        </div>
      </motion.a>
    )
  }
)

SourceCard.displayName = "SourceCard"

interface SourceListProps extends React.HTMLAttributes<HTMLDivElement> {
  sources: Source[]
  title?: string
  maxVisible?: number
}

const SourceList = React.forwardRef<HTMLDivElement, SourceListProps>(
  ({ sources, title = "Sources", maxVisible, className, ...props }, ref) => {
    const [showAll, setShowAll] = React.useState(false)
    const displayedSources = maxVisible && !showAll
      ? sources.slice(0, maxVisible)
      : sources
    const hasMore = maxVisible && sources.length > maxVisible

    if (sources.length === 0) {
      return null
    }

    return (
      <div ref={ref} className={cn("my-3", className)} {...props}>
        {title && (
          <div className="mb-2 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Globe className="h-3.5 w-3.5" />
            <span>{title}</span>
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
              {sources.length}
            </span>
          </div>
        )}
        <div className="space-y-2">
          {displayedSources.map((source, index) => (
            <SourceCard key={`${source.url}-${index}`} source={source} index={index} />
          ))}
        </div>
        {hasMore && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-2 text-xs text-primary hover:underline"
          >
            {showAll ? "Show less" : `Show ${sources.length - (maxVisible ?? 0)} more`}
          </button>
        )}
      </div>
    )
  }
)

SourceList.displayName = "SourceList"

// Compact inline source chips
interface SourceChipsProps extends React.HTMLAttributes<HTMLDivElement> {
  sources: Source[]
}

const SourceChips = React.forwardRef<HTMLDivElement, SourceChipsProps>(
  ({ sources, className, ...props }, ref) => {
    if (sources.length === 0) {
      return null
    }

    return (
      <div ref={ref} className={cn("flex flex-wrap gap-1.5", className)} {...props}>
        {sources.map((source, index) => (
          <motion.a
            key={`${source.url}-${index}`}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            className="group inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-0.5 text-xs transition-colors hover:border-primary/50 hover:bg-muted"
          >
            <span className="max-w-[120px] truncate text-muted-foreground group-hover:text-foreground">
              {getDomain(source.url)}
            </span>
            <ExternalLink className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100" />
          </motion.a>
        ))}
      </div>
    )
  }
)

SourceChips.displayName = "SourceChips"

export { SourceCard, SourceList, SourceChips, type Source }
