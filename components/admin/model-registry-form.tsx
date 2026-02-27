"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import type { ModelData } from "./model-registry-table"

const GENERATION_OPTIONS = ["Claude 4.6", "Claude 4.5", "Claude 4"]
const THINKING_TYPE_OPTIONS = [
  { value: "", label: "None" },
  { value: "adaptive", label: "Adaptive" },
  { value: "extended", label: "Extended" },
]
const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "DEPRECATED", label: "Deprecated" },
]

interface ModelFormData {
  modelId: string
  displayName: string
  generationGroup: string
  inputPricePerMTok: string
  outputPricePerMTok: string
  thinkingPricePerMTok: string
  cacheWritePricePerMTok: string
  cacheReadPricePerMTok: string
  supportsThinking: boolean
  thinkingType: string
  supportsVision: boolean
  supportsTools: boolean
  maxOutputTokens: string
  contextWindow: string
  status: string
  sortOrder: string
}

function createInitialFormData(model?: ModelData | null): ModelFormData {
  if (!model) {
    return {
      modelId: "",
      displayName: "",
      generationGroup: "Claude 4.6",
      inputPricePerMTok: "",
      outputPricePerMTok: "",
      thinkingPricePerMTok: "",
      cacheWritePricePerMTok: "",
      cacheReadPricePerMTok: "",
      supportsThinking: false,
      thinkingType: "",
      supportsVision: true,
      supportsTools: true,
      maxOutputTokens: "",
      contextWindow: "200000",
      status: "ACTIVE",
      sortOrder: "0",
    }
  }

  // Convert per-token pricing to per-MTok for display
  const toMTok = (perToken: string | number) => {
    const v = typeof perToken === "string" ? parseFloat(perToken) : perToken
    if (isNaN(v) || v === 0) return "0"
    return String(v * 1_000_000)
  }

  return {
    modelId: model.modelId,
    displayName: model.displayName,
    generationGroup: model.generationGroup,
    inputPricePerMTok: toMTok(model.inputPricePerToken),
    outputPricePerMTok: toMTok(model.outputPricePerToken),
    thinkingPricePerMTok: toMTok(model.thinkingPricePerToken),
    cacheWritePricePerMTok: toMTok(model.cacheWritePricePerToken),
    cacheReadPricePerMTok: toMTok(model.cacheReadPricePerToken),
    supportsThinking: model.supportsThinking,
    thinkingType: model.thinkingType || "",
    supportsVision: model.supportsVision,
    supportsTools: model.supportsTools,
    maxOutputTokens: String(model.maxOutputTokens),
    contextWindow: String(model.contextWindow),
    status: model.status,
    sortOrder: String(model.sortOrder),
  }
}

export interface ModelSubmitPayload {
  modelId: string
  displayName: string
  generationGroup: string
  inputPricePerToken: number
  outputPricePerToken: number
  thinkingPricePerToken: number
  cacheWritePricePerToken: number
  cacheReadPricePerToken: number
  supportsThinking: boolean
  thinkingType: string | null
  supportsVision: boolean
  supportsTools: boolean
  maxOutputTokens: number
  contextWindow: number
  status: string
  sortOrder: number
}

interface ModelRegistryFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  model?: ModelData | null
  onSubmit: (data: ModelSubmitPayload) => Promise<void>
}

export function ModelRegistryForm({
  open,
  onOpenChange,
  model,
  onSubmit,
}: ModelRegistryFormProps) {
  const isEditing = !!model
  const [formData, setFormData] = React.useState<ModelFormData>(() =>
    createInitialFormData(model)
  )
  const [useCustomGeneration, setUseCustomGeneration] = React.useState(false)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Reset form when model changes or dialog opens
  React.useEffect(() => {
    if (open) {
      const initial = createInitialFormData(model)
      setFormData(initial)
      setUseCustomGeneration(
        !!model && !GENERATION_OPTIONS.includes(model.generationGroup)
      )
      setError(null)
    }
  }, [open, model])

  const updateField = <K extends keyof ModelFormData>(
    key: K,
    value: ModelFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Basic validation
    if (!formData.modelId.trim()) {
      setError("Model ID is required.")
      return
    }
    if (!formData.displayName.trim()) {
      setError("Display Name is required.")
      return
    }

    const parsedMaxOutput = parseInt(formData.maxOutputTokens, 10)
    const parsedContextWindow = parseInt(formData.contextWindow, 10)

    if (isNaN(parsedMaxOutput) || parsedMaxOutput <= 0) {
      setError("Max output tokens must be a positive number.")
      return
    }
    if (isNaN(parsedContextWindow) || parsedContextWindow <= 0) {
      setError("Context window must be a positive number.")
      return
    }

    // Convert MTok prices to per-token by dividing by 1,000,000
    const toPerToken = (mtokStr: string) => {
      const v = parseFloat(mtokStr)
      if (isNaN(v)) return 0
      return v / 1_000_000
    }

    const payload: ModelSubmitPayload = {
      modelId: formData.modelId.trim(),
      displayName: formData.displayName.trim(),
      generationGroup: formData.generationGroup,
      inputPricePerToken: toPerToken(formData.inputPricePerMTok),
      outputPricePerToken: toPerToken(formData.outputPricePerMTok),
      thinkingPricePerToken: toPerToken(formData.thinkingPricePerMTok),
      cacheWritePricePerToken: toPerToken(formData.cacheWritePricePerMTok),
      cacheReadPricePerToken: toPerToken(formData.cacheReadPricePerMTok),
      supportsThinking: formData.supportsThinking,
      thinkingType: formData.thinkingType || null,
      supportsVision: formData.supportsVision,
      supportsTools: formData.supportsTools,
      maxOutputTokens: parsedMaxOutput,
      contextWindow: parsedContextWindow,
      status: formData.status,
      sortOrder: parseInt(formData.sortOrder, 10) || 0,
    }

    try {
      setSubmitting(true)
      await onSubmit(payload)
      onOpenChange(false)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save model."
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Model" : "Add Model"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update model configuration and metadata."
              : "Register a new AI model in the platform registry."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {/* Core Fields */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Core Information
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="modelId">Model ID</Label>
                <Input
                  id="modelId"
                  value={formData.modelId}
                  onChange={(e) => updateField("modelId", e.target.value)}
                  placeholder="e.g., claude-opus-4-6"
                  readOnly={isEditing}
                  className={isEditing ? "bg-muted cursor-not-allowed" : ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="displayName">Display Name</Label>
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) =>
                    updateField("displayName", e.target.value)
                  }
                  placeholder="e.g., Claude 4.6 Opus"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="generationGroup">Generation Group</Label>
              <div className="flex gap-2">
                {!useCustomGeneration ? (
                  <select
                    id="generationGroup"
                    value={formData.generationGroup}
                    onChange={(e) =>
                      updateField("generationGroup", e.target.value)
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {GENERATION_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id="generationGroup"
                    value={formData.generationGroup}
                    onChange={(e) =>
                      updateField("generationGroup", e.target.value)
                    }
                    placeholder="Custom generation group"
                  />
                )}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => {
                    setUseCustomGeneration((prev) => !prev)
                    if (!useCustomGeneration) {
                      updateField("generationGroup", "")
                    } else {
                      updateField("generationGroup", "Claude 4.6")
                    }
                  }}
                >
                  {useCustomGeneration ? "Use Preset" : "Custom"}
                </Button>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Pricing ($ per million tokens)
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="inputPrice">Input Price</Label>
                <Input
                  id="inputPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.inputPricePerMTok}
                  onChange={(e) =>
                    updateField("inputPricePerMTok", e.target.value)
                  }
                  placeholder="e.g., 3"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="outputPrice">Output Price</Label>
                <Input
                  id="outputPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.outputPricePerMTok}
                  onChange={(e) =>
                    updateField("outputPricePerMTok", e.target.value)
                  }
                  placeholder="e.g., 15"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="thinkingPrice">Thinking Price</Label>
                <Input
                  id="thinkingPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.thinkingPricePerMTok}
                  onChange={(e) =>
                    updateField("thinkingPricePerMTok", e.target.value)
                  }
                  placeholder="e.g., 15"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cacheWritePrice">Cache Write Price</Label>
                <Input
                  id="cacheWritePrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cacheWritePricePerMTok}
                  onChange={(e) =>
                    updateField("cacheWritePricePerMTok", e.target.value)
                  }
                  placeholder="e.g., 3.75"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cacheReadPrice">Cache Read Price</Label>
                <Input
                  id="cacheReadPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.cacheReadPricePerMTok}
                  onChange={(e) =>
                    updateField("cacheReadPricePerMTok", e.target.value)
                  }
                  placeholder="e.g., 0.30"
                />
              </div>
            </div>
          </div>

          {/* Capabilities */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Capabilities
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="supportsThinking" className="cursor-pointer">
                  Thinking Support
                </Label>
                <Switch
                  id="supportsThinking"
                  checked={formData.supportsThinking}
                  onCheckedChange={(checked) =>
                    updateField("supportsThinking", checked)
                  }
                />
              </div>
              {formData.supportsThinking && (
                <div className="ml-4 space-y-2">
                  <Label htmlFor="thinkingType">Thinking Type</Label>
                  <select
                    id="thinkingType"
                    value={formData.thinkingType}
                    onChange={(e) =>
                      updateField("thinkingType", e.target.value)
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {THINKING_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex items-center justify-between">
                <Label htmlFor="supportsVision" className="cursor-pointer">
                  Vision Support
                </Label>
                <Switch
                  id="supportsVision"
                  checked={formData.supportsVision}
                  onCheckedChange={(checked) =>
                    updateField("supportsVision", checked)
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="supportsTools" className="cursor-pointer">
                  Tool Support
                </Label>
                <Switch
                  id="supportsTools"
                  checked={formData.supportsTools}
                  onCheckedChange={(checked) =>
                    updateField("supportsTools", checked)
                  }
                />
              </div>
            </div>
          </div>

          {/* Limits */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Limits</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maxOutputTokens">Max Output Tokens</Label>
                <Input
                  id="maxOutputTokens"
                  type="number"
                  min="1"
                  value={formData.maxOutputTokens}
                  onChange={(e) =>
                    updateField("maxOutputTokens", e.target.value)
                  }
                  placeholder="e.g., 128000"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contextWindow">Context Window</Label>
                <Input
                  id="contextWindow"
                  type="number"
                  min="1"
                  value={formData.contextWindow}
                  onChange={(e) =>
                    updateField("contextWindow", e.target.value)
                  }
                  placeholder="e.g., 200000"
                  required
                />
              </div>
            </div>
          </div>

          {/* Status & Sort (only when editing) */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Configuration
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {isEditing && (
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <select
                    id="status"
                    value={formData.status}
                    onChange={(e) =>
                      updateField("status", e.target.value)
                    }
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="sortOrder">Sort Order</Label>
                <Input
                  id="sortOrder"
                  type="number"
                  min="0"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    updateField("sortOrder", e.target.value)
                  }
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting
                ? "Saving..."
                : isEditing
                  ? "Save Changes"
                  : "Add Model"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
