"use client"

import * as React from "react"
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Ban,
  Brain,
  Eye,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"

export interface ModelData {
  id: string
  modelId: string
  displayName: string
  generationGroup: string
  inputPricePerToken: string | number
  outputPricePerToken: string | number
  thinkingPricePerToken: string | number
  cacheWritePricePerToken: string | number
  cacheReadPricePerToken: string | number
  supportsThinking: boolean
  supportsVision: boolean
  supportsTools: boolean
  thinkingType: string | null
  maxOutputTokens: number
  contextWindow: number
  status: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

interface ModelRegistryTableProps {
  models: ModelData[]
  onEdit: (model: ModelData) => void
  onDeprecate: (model: ModelData) => void
  onDelete: (model: ModelData) => void
  onRefresh: () => void
}

function formatTokenCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(0)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function formatPricePerMTok(pricePerToken: string | number): string {
  const perToken = typeof pricePerToken === "string" ? parseFloat(pricePerToken) : pricePerToken
  if (isNaN(perToken) || perToken === 0) return "$0"
  const perMTok = perToken * 1_000_000
  if (perMTok >= 1) return `$${perMTok.toFixed(0)}`
  return `$${perMTok.toFixed(2)}`
}

function groupModelsByGeneration(
  models: ModelData[]
): Record<string, ModelData[]> {
  const groups: Record<string, ModelData[]> = {}
  for (const model of models) {
    const group = model.generationGroup || "Other"
    if (!groups[group]) groups[group] = []
    groups[group].push(model)
  }
  // Sort groups: Claude 4.6 first, then 4.5, then 4, then others
  const sortedKeys = Object.keys(groups).sort((a, b) => {
    const order = ["Claude 4.6", "Claude 4.5", "Claude 4"]
    const aIdx = order.indexOf(a)
    const bIdx = order.indexOf(b)
    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx
    if (aIdx !== -1) return -1
    if (bIdx !== -1) return 1
    return a.localeCompare(b)
  })
  const sorted: Record<string, ModelData[]> = {}
  for (const key of sortedKeys) {
    sorted[key] = groups[key].sort((a, b) => a.sortOrder - b.sortOrder)
  }
  return sorted
}

export function ModelRegistryTable({
  models,
  onEdit,
  onDeprecate,
  onDelete,
}: ModelRegistryTableProps) {
  const [expandedGroups, setExpandedGroups] = React.useState<Set<string>>(
    new Set()
  )
  const [deleteTarget, setDeleteTarget] = React.useState<ModelData | null>(null)
  const [deprecateTarget, setDeprecateTarget] = React.useState<ModelData | null>(null)
  const grouped = groupModelsByGeneration(models)

  // Expand all groups by default
  React.useEffect(() => {
    setExpandedGroups(new Set(Object.keys(grouped)))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [models.length])

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) {
        next.delete(group)
      } else {
        next.add(group)
      }
      return next
    })
  }

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      onDelete(deleteTarget)
      setDeleteTarget(null)
    }
  }

  const handleDeprecateConfirm = () => {
    if (deprecateTarget) {
      onDeprecate(deprecateTarget)
      setDeprecateTarget(null)
    }
  }

  if (models.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <p className="text-sm">No models found.</p>
        <p className="text-xs mt-1">Click &ldquo;Add Model&rdquo; to register your first model.</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {Object.entries(grouped).map(([group, groupModels]) => {
          const isExpanded = expandedGroups.has(group)
          return (
            <div
              key={group}
              className="rounded-lg border border-border overflow-hidden"
            >
              <button
                onClick={() => toggleGroup(group)}
                className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
                <span className="text-sm font-semibold text-foreground">
                  {group}
                </span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {groupModels.length} model{groupModels.length !== 1 ? "s" : ""}
                </Badge>
              </button>

              {isExpanded && (
                <div className="border-t border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30">
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                            Model
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                            Model ID
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                            Status
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                            Pricing ($/MTok)
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                            Limits
                          </th>
                          <th className="px-4 py-2 text-left font-medium text-muted-foreground">
                            Capabilities
                          </th>
                          <th className="px-4 py-2 text-right font-medium text-muted-foreground">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupModels.map((model) => (
                          <tr
                            key={model.id}
                            className="border-b border-border last:border-b-0 hover:bg-muted/20 transition-colors"
                          >
                            <td className="px-4 py-3 font-medium text-foreground">
                              {model.displayName}
                            </td>
                            <td className="px-4 py-3">
                              <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-muted-foreground">
                                {model.modelId}
                              </code>
                            </td>
                            <td className="px-4 py-3">
                              <Badge
                                variant={
                                  model.status === "ACTIVE"
                                    ? "default"
                                    : "secondary"
                                }
                                className={
                                  model.status === "ACTIVE"
                                    ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20"
                                }
                              >
                                {model.status === "ACTIVE"
                                  ? "Active"
                                  : "Deprecated"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              <span>
                                In: {formatPricePerMTok(model.inputPricePerToken)}
                              </span>
                              <span className="mx-1">/</span>
                              <span>
                                Out: {formatPricePerMTok(model.outputPricePerToken)}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              <div>
                                Max: {formatTokenCount(model.maxOutputTokens)}
                              </div>
                              <div>
                                Ctx: {formatTokenCount(model.contextWindow)}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-wrap gap-1">
                                {model.supportsThinking && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] gap-0.5 px-1.5 py-0"
                                  >
                                    <Brain className="h-3 w-3" />
                                    {model.thinkingType || "thinking"}
                                  </Badge>
                                )}
                                {model.supportsVision && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] gap-0.5 px-1.5 py-0"
                                  >
                                    <Eye className="h-3 w-3" />
                                    vision
                                  </Badge>
                                )}
                                {model.supportsTools && (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] gap-0.5 px-1.5 py-0"
                                  >
                                    <Wrench className="h-3 w-3" />
                                    tools
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => onEdit(model)}
                                  title="Edit model"
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                {model.status === "ACTIVE" && (
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => setDeprecateTarget(model)}
                                    title="Deprecate model"
                                  >
                                    <Ban className="h-3.5 w-3.5 text-amber-600" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => setDeleteTarget(model)}
                                  title="Delete model"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Model</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.displayName}</strong>? This action cannot be
              undone. If the model is referenced by any roles, deletion will fail
              -- consider deprecating instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deprecate confirmation dialog */}
      <Dialog
        open={!!deprecateTarget}
        onOpenChange={(open) => !open && setDeprecateTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deprecate Model</DialogTitle>
            <DialogDescription>
              Are you sure you want to deprecate{" "}
              <strong>{deprecateTarget?.displayName}</strong>? The model will
              be marked as deprecated and hidden from new role assignments.
              Existing roles that reference this model will continue to work.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeprecateTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="default"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={handleDeprecateConfirm}
            >
              Deprecate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
