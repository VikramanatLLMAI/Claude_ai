"use client"

import * as React from "react"
import { Plus, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import {
  ModelRegistryTable,
  type ModelData,
} from "@/components/admin/model-registry-table"
import {
  ModelRegistryForm,
  type ModelSubmitPayload,
} from "@/components/admin/model-registry-form"

const AUTH_TOKEN_KEY = "llmatscale_auth_token"

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(AUTH_TOKEN_KEY) || ""
      : ""
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

/**
 * Model Registry management page for Super Admin.
 *
 * Route: /super-admin/models
 *
 * Displays all platform models grouped by generation.
 * Supports add, edit, deprecate, and delete operations.
 * Uses TanStack Table with sorting, filtering, and pagination.
 */
export default function ModelRegistryPage() {
  const [models, setModels] = React.useState<ModelData[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingModel, setEditingModel] = React.useState<ModelData | null>(null)

  const fetchModels = React.useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/super-admin/models", {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to load models (${res.status})`)
      }
      const data = await res.json()
      // API returns array directly, or wrapped in { models: [...] }
      setModels(Array.isArray(data) ? data : data.models || [])
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load models."
      )
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchModels()
  }, [fetchModels])

  const handleCreate = async (payload: ModelSubmitPayload) => {
    const res = await fetch("/api/super-admin/models", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Failed to create model.")
    }
    await fetchModels()
  }

  const handleEdit = async (payload: ModelSubmitPayload) => {
    if (!editingModel) return
    const res = await fetch(`/api/super-admin/models/${editingModel.id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Failed to update model.")
    }
    await fetchModels()
  }

  const handleDeprecate = async (model: ModelData) => {
    try {
      setError(null)
      const res = await fetch(`/api/super-admin/models/${model.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: "DEPRECATED" }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to deprecate model.")
      }
      await fetchModels()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to deprecate model."
      )
    }
  }

  const handleDelete = async (model: ModelData) => {
    try {
      setError(null)
      const res = await fetch(`/api/super-admin/models/${model.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(
          data.error ||
            "Failed to delete model. It may be referenced by existing roles."
        )
      }
      await fetchModels()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete model."
      )
    }
  }

  const openCreateForm = () => {
    setEditingModel(null)
    setFormOpen(true)
  }

  const openEditForm = (model: ModelData) => {
    setEditingModel(model)
    setFormOpen(true)
  }

  return (
    <div className="flex h-screen flex-col">
      <AdminPageHeader
        title="Model Registry"
        description="Manage AI models available on the platform"
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setLoading(true)
                fetchModels()
              }}
              disabled={loading}
            >
              <RefreshCw
                className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
            <Button size="sm" onClick={openCreateForm}>
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add Model
            </Button>
          </>
        }
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Error banner */}
        {error && (
          <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-xs underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && models.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Loading models...
            </p>
          </div>
        ) : (
          <ModelRegistryTable
            models={models}
            onEdit={openEditForm}
            onDeprecate={handleDeprecate}
            onDelete={handleDelete}
            onRefresh={fetchModels}
          />
        )}
      </div>

      {/* Form dialog */}
      <ModelRegistryForm
        open={formOpen}
        onOpenChange={setFormOpen}
        model={editingModel}
        onSubmit={editingModel ? handleEdit : handleCreate}
      />
    </div>
  )
}
