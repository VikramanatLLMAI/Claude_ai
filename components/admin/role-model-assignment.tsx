"use client"

import * as React from "react"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, Save, AlertCircle, RefreshCw } from "lucide-react"
import { toast } from "@/components/ui/toast"

/**
 * Model from the platform Model Registry.
 * Subset of fields needed for the assignment UI.
 */
interface RegistryModel {
  id: string
  modelId: string
  displayName: string
  generationGroup: string
  status: string
  sortOrder: number
}

interface RoleModelAssignmentProps {
  roleId: string
  roleName?: string
  orgSlug: string
  allowedModels: string[]
  onSave: (modelIds: string[]) => Promise<void>
}

/**
 * RoleModelAssignment component - model assignment UI per MODL-07 and CONTEXT.md.
 *
 * Displays available models grouped by generation (Claude 4.6, Claude 4.5, Claude 4).
 * Each group has a 3-state checkbox (checked, unchecked, indeterminate/mixed).
 * Clicking a group checkbox toggles all models in that group.
 * Individual model checkboxes toggle single models.
 * Save button is disabled when no models are selected.
 *
 * Fetches models from the org-scoped admin endpoint: /api/org/[slug]/admin/models
 */
export function RoleModelAssignment({
  roleId,
  roleName,
  orgSlug,
  allowedModels,
  onSave,
}: RoleModelAssignmentProps) {
  const [availableModels, setAvailableModels] = React.useState<RegistryModel[]>([])
  const [selectedModels, setSelectedModels] = React.useState<Set<string>>(
    new Set(allowedModels)
  )
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Sync with parent when allowedModels prop changes
  React.useEffect(() => {
    setSelectedModels(new Set(allowedModels))
  }, [allowedModels])

  // Fetch active models from the org-scoped admin models endpoint
  const fetchModels = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("llmatscale_auth_token")
      const res = await fetch(`/api/org/${orgSlug}/admin/models`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error("Failed to fetch models")
      }

      const data: RegistryModel[] = await res.json()
      setAvailableModels(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load models")
    } finally {
      setLoading(false)
    }
  }, [orgSlug])

  React.useEffect(() => {
    fetchModels()
  }, [fetchModels])

  // Group models by generationGroup
  const groupedModels = React.useMemo(() => {
    const groups: Record<string, RegistryModel[]> = {}
    for (const model of availableModels) {
      const group = model.generationGroup
      if (!groups[group]) {
        groups[group] = []
      }
      groups[group].push(model)
    }
    // Sort groups in a natural order (Claude 4.6 first, then 4.5, then 4)
    const sortedEntries = Object.entries(groups).sort((a, b) => {
      // Extract version numbers for comparison
      const versionA = parseFloat(a[0].replace(/[^0-9.]/g, "")) || 0
      const versionB = parseFloat(b[0].replace(/[^0-9.]/g, "")) || 0
      return versionB - versionA // Descending: newest first
    })
    return sortedEntries
  }, [availableModels])

  // Determine group checkbox state: checked, unchecked, or indeterminate
  const getGroupState = React.useCallback(
    (models: RegistryModel[]): boolean | "indeterminate" => {
      const selectedCount = models.filter((m) => selectedModels.has(m.modelId)).length
      if (selectedCount === 0) return false
      if (selectedCount === models.length) return true
      return "indeterminate"
    },
    [selectedModels]
  )

  // Toggle all models in a group
  const toggleGroup = React.useCallback(
    (models: RegistryModel[]) => {
      const groupState = getGroupState(models)
      setSelectedModels((prev) => {
        const next = new Set(prev)
        if (groupState === true) {
          // All selected -> deselect all in group
          for (const m of models) {
            next.delete(m.modelId)
          }
        } else {
          // None or partial -> select all in group
          for (const m of models) {
            next.add(m.modelId)
          }
        }
        return next
      })
    },
    [getGroupState]
  )

  // Toggle individual model
  const toggleModel = React.useCallback((modelId: string) => {
    setSelectedModels((prev) => {
      const next = new Set(prev)
      if (next.has(modelId)) {
        next.delete(modelId)
      } else {
        next.add(modelId)
      }
      return next
    })
  }, [])

  // Handle save
  const handleSave = React.useCallback(async () => {
    const modelIds = Array.from(selectedModels)
    if (modelIds.length === 0) return

    setSaving(true)
    setError(null)
    try {
      await onSave(modelIds)
      toast.success(
        roleName
          ? `Models saved for ${roleName}`
          : "Models saved successfully"
      )
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save models"
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }, [selectedModels, onSave, roleName])

  // Check if selection has changed from original
  const hasChanges = React.useMemo(() => {
    const originalSet = new Set(allowedModels)
    if (originalSet.size !== selectedModels.size) return true
    for (const id of selectedModels) {
      if (!originalSet.has(id)) return true
    }
    return false
  }, [allowedModels, selectedModels])

  // Suppress unused variable warning for roleId (used for identity tracking)
  void roleId

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-6 w-48 animate-pulse rounded bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (error && availableModels.length === 0) {
    return (
      <Card className="border-destructive/50 bg-destructive/5 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div className="flex-1 space-y-2">
            <p className="text-sm font-medium text-destructive">
              Failed to load models
            </p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchModels}
              className="mt-1"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Retry
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {groupedModels.map(([groupName, models]) => {
        const groupState = getGroupState(models)

        return (
          <div key={groupName} className="space-y-2">
            {/* Group-level checkbox */}
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={groupState}
                onCheckedChange={() => toggleGroup(models)}
              />
              <span className="text-sm font-medium text-foreground">
                {groupName}
              </span>
              <span className="text-xs text-muted-foreground">
                ({models.filter((m) => selectedModels.has(m.modelId)).length}/{models.length})
              </span>
            </label>

            {/* Individual model checkboxes */}
            <div className="ml-6 space-y-1.5">
              {models.map((model) => (
                <label key={model.modelId} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedModels.has(model.modelId)}
                    onCheckedChange={() => toggleModel(model.modelId)}
                  />
                  <span className="text-sm text-foreground">
                    {model.displayName}
                  </span>
                  <span className="text-xs font-mono text-muted-foreground">
                    {model.modelId}
                  </span>
                </label>
              ))}
            </div>
          </div>
        )
      })}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={selectedModels.size === 0 || saving || !hasChanges}
        >
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Models
        </Button>
        {selectedModels.size === 0 && (
          <span className="text-xs text-destructive">
            At least one model must be enabled
          </span>
        )}
      </div>
    </div>
  )
}
