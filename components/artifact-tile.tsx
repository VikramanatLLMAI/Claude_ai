"use client"

import { FileCode, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Artifact } from "@/lib/artifacts"

interface ArtifactTileProps {
  artifact: Artifact
  onClick?: () => void
  isActive?: boolean
}

export function ArtifactTile({ artifact, onClick, isActive = false }: ArtifactTileProps) {
  return (
    <div
      className={cn(
        "group relative mt-3 flex cursor-pointer items-center gap-4 rounded-lg border bg-card p-4 transition-all hover:border-primary hover:shadow-md",
        isActive && "border-primary shadow-md"
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
        <FileCode className="h-6 w-6 text-primary" />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold">{artifact.title}</h3>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {artifact.language}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {artifact.type} • Click to view
        </p>
      </div>

      {/* View Button */}
      <Button
        variant="outline"
        size="sm"
        className="gap-2 opacity-0 transition-opacity group-hover:opacity-100"
      >
        <Eye className="h-4 w-4" />
        View
      </Button>

      {/* Active Indicator */}
      {isActive && (
        <div className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary" />
      )}
    </div>
  )
}
