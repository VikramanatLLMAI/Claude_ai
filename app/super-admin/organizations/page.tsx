"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
  Plus,
  MoreVertical,
  Building2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { DataTable } from "@/components/admin/data-table"
import { DataTableColumnHeader } from "@/components/admin/data-table-column-header"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { toast } from "@/components/ui/toast"

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

// ---- Types ----

interface Organization {
  id: string
  name: string
  slug: string
  status: "ACTIVE" | "SUSPENDED" | "DELETED"
  userCount: number
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  daysRemaining: number | null
  monthlyRequestCeiling: number | null
  monthlyTokenCeiling: number | null
}

type OrgFormData = {
  name: string
  slug: string
  monthlyRequestCeiling: string
  monthlyTokenCeiling: string
}

// ---- Status badge helper ----

function StatusBadge({ status }: { status: Organization["status"] }) {
  if (status === "ACTIVE") {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
        Active
      </Badge>
    )
  }
  if (status === "SUSPENDED") {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800">
        Suspended
      </Badge>
    )
  }
  return (
    <Badge variant="destructive">
      Deleted
    </Badge>
  )
}

// ---- Org Form Dialog ----

interface OrgFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  org: Organization | null
  onSubmit: (data: OrgFormData) => Promise<void>
}

function OrgFormDialog({ open, onOpenChange, org, onSubmit }: OrgFormDialogProps) {
  const isEdit = !!org
  const [form, setForm] = React.useState<OrgFormData>({
    name: "",
    slug: "",
    monthlyRequestCeiling: "",
    monthlyTokenCeiling: "",
  })
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Reset form when opening
  React.useEffect(() => {
    if (open) {
      setForm({
        name: org?.name || "",
        slug: org?.slug || "",
        monthlyRequestCeiling: org?.monthlyRequestCeiling != null ? String(org.monthlyRequestCeiling) : "",
        monthlyTokenCeiling: org?.monthlyTokenCeiling != null ? String(org.monthlyTokenCeiling) : "",
      })
      setError(null)
    }
  }, [open, org])

  // Auto-generate slug from name (only for create)
  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      name,
      // Only auto-generate slug when creating (not editing)
      ...(!isEdit && { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }),
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save organization.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Organization" : "Create Organization"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update organization details and usage limits."
              : "Create a new organization on the platform."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="org-name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="org-name"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Acme Corp"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-slug">Slug <span className="text-destructive">*</span></Label>
            <Input
              id="org-slug"
              value={form.slug}
              onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))}
              placeholder="acme-corp"
              required
              disabled={isEdit}
              className={isEdit ? "opacity-60" : ""}
            />
            {isEdit && (
              <p className="text-xs text-muted-foreground">Slug cannot be changed after creation.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="org-req-ceiling">Monthly Request Ceiling</Label>
              <Input
                id="org-req-ceiling"
                type="number"
                min={1}
                value={form.monthlyRequestCeiling}
                onChange={(e) => setForm((p) => ({ ...p, monthlyRequestCeiling: e.target.value }))}
                placeholder="Unlimited"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-tok-ceiling">Monthly Token Ceiling</Label>
              <Input
                id="org-tok-ceiling"
                type="number"
                min={1}
                value={form.monthlyTokenCeiling}
                onChange={(e) => setForm((p) => ({ ...p, monthlyTokenCeiling: e.target.value }))}
                placeholder="Unlimited"
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Organization"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---- Main Page ----

/**
 * Organizations management page for Super Admin.
 *
 * Route: /super-admin/organizations
 *
 * Displays all platform organizations with full CRUD operations.
 * Uses TanStack DataTable with sorting, filtering, and pagination.
 * Row actions: Edit, Suspend/Activate, Delete (with safety guards).
 * Deleted orgs show Restore action instead.
 */
export default function OrganizationsPage() {
  const [orgs, setOrgs] = React.useState<Organization[]>([])
  const [loading, setLoading] = React.useState(true)

  // Modal state
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingOrg, setEditingOrg] = React.useState<Organization | null>(null)

  // Confirmation dialogs
  const [suspendTarget, setSuspendTarget] = React.useState<Organization | null>(null)
  const [activateTarget, setActivateTarget] = React.useState<Organization | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<Organization | null>(null)
  const [restoreTarget, setRestoreTarget] = React.useState<Organization | null>(null)
  const [actionLoading, setActionLoading] = React.useState(false)

  // ---- Data fetching ----

  const fetchOrgs = React.useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/organizations", {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to load organizations (${res.status})`)
      }
      const data = await res.json()
      setOrgs(Array.isArray(data) ? data : data.organizations || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load organizations.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchOrgs()
  }, [fetchOrgs])

  // ---- CRUD handlers ----

  const handleCreate = async (formData: OrgFormData) => {
    const body: Record<string, unknown> = {
      name: formData.name,
      slug: formData.slug,
    }
    if (formData.monthlyRequestCeiling) body.monthlyRequestCeiling = Number(formData.monthlyRequestCeiling)
    if (formData.monthlyTokenCeiling) body.monthlyTokenCeiling = Number(formData.monthlyTokenCeiling)

    const res = await fetch("/api/super-admin/organizations", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Failed to create organization.")
    }
    toast.success("Organization created.")
    await fetchOrgs()
  }

  const handleEdit = async (formData: OrgFormData) => {
    if (!editingOrg) return
    const body: Record<string, unknown> = { name: formData.name }
    body.monthlyRequestCeiling = formData.monthlyRequestCeiling
      ? Number(formData.monthlyRequestCeiling)
      : null
    body.monthlyTokenCeiling = formData.monthlyTokenCeiling
      ? Number(formData.monthlyTokenCeiling)
      : null

    const res = await fetch(`/api/super-admin/organizations/${editingOrg.id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Failed to update organization.")
    }
    toast.success("Organization updated.")
    await fetchOrgs()
  }

  const handleSuspend = async () => {
    if (!suspendTarget) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/super-admin/organizations/${suspendTarget.id}/suspend`, {
        method: "POST",
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to suspend organization.")
      }
      toast.success("Organization suspended.")
      await fetchOrgs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to suspend organization.")
    } finally {
      setActionLoading(false)
      setSuspendTarget(null)
    }
  }

  const handleActivate = async () => {
    if (!activateTarget) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/super-admin/organizations/${activateTarget.id}/activate`, {
        method: "POST",
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to activate organization.")
      }
      toast.success("Organization activated.")
      await fetchOrgs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to activate organization.")
    } finally {
      setActionLoading(false)
      setActivateTarget(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/super-admin/organizations/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete organization.")
      }
      toast.success("Organization scheduled for deletion (30-day grace period).")
      await fetchOrgs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete organization.")
    } finally {
      setActionLoading(false)
      setDeleteTarget(null)
    }
  }

  const handleRestore = async () => {
    if (!restoreTarget) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/super-admin/organizations/${restoreTarget.id}/restore`, {
        method: "POST",
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to restore organization.")
      }
      toast.success("Organization restored.")
      await fetchOrgs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to restore organization.")
    } finally {
      setActionLoading(false)
      setRestoreTarget(null)
    }
  }

  // ---- Column definitions ----

  const columns: ColumnDef<Organization>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.name}</div>
          <div className="text-xs text-muted-foreground">{row.original.slug}</div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => {
        const org = row.original
        return (
          <div>
            <StatusBadge status={org.status} />
            {org.status === "DELETED" && org.daysRemaining != null && (
              <div className="mt-1 text-xs text-muted-foreground">
                {org.daysRemaining}d remaining
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: "userCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Users" enableFilter={false} />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.userCount}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Created" enableFilter={false} />
      ),
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.original.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      enableColumnFilter: false,
      cell: ({ row }) => {
        const org = row.original
        const isDeleted = org.status === "DELETED"
        const isSuspended = org.status === "SUSPENDED"

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="Open actions"
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {isDeleted ? (
                // Deleted org: only Restore
                <DropdownMenuItem
                  onClick={() => setRestoreTarget(org)}
                >
                  Restore
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuItem onClick={() => {
                    setEditingOrg(org)
                    setFormOpen(true)
                  }}>
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {isSuspended ? (
                    <DropdownMenuItem onClick={() => setActivateTarget(org)}>
                      Activate
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem
                      onClick={() => setSuspendTarget(org)}
                      className="text-amber-600 focus:text-amber-600"
                    >
                      Suspend
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteTarget(org)}
                    className="text-destructive focus:text-destructive"
                  >
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  return (
    <div className="flex h-screen flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">Organizations</h1>
          </div>
        </div>
        <Button
          size="sm"
          onClick={() => {
            setEditingOrg(null)
            setFormOpen(true)
          }}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Create Organization
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Loading organizations...</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={orgs}
            searchColumn="name"
            searchPlaceholder="Search organizations..."
          />
        )}
      </div>

      {/* Create/Edit Dialog */}
      <OrgFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open)
          if (!open) setEditingOrg(null)
        }}
        org={editingOrg}
        onSubmit={editingOrg ? handleEdit : handleCreate}
      />

      {/* Suspend confirmation */}
      <ConfirmationDialog
        open={!!suspendTarget}
        onOpenChange={(open) => !open && setSuspendTarget(null)}
        title="Suspend Organization?"
        description={`Suspending "${suspendTarget?.name}" will immediately invalidate all active sessions for its members.`}
        confirmLabel="Suspend"
        variant="warning"
        onConfirm={handleSuspend}
        loading={actionLoading}
      />

      {/* Activate confirmation */}
      <ConfirmationDialog
        open={!!activateTarget}
        onOpenChange={(open) => !open && setActivateTarget(null)}
        title="Activate Organization?"
        description={`Re-activate "${activateTarget?.name}" and restore access for its members.`}
        confirmLabel="Activate"
        variant="warning"
        onConfirm={handleActivate}
        loading={actionLoading}
      />

      {/* Delete confirmation */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Organization?"
        description={`"${deleteTarget?.name}" will be scheduled for deletion. Data will be permanently removed after 30 days. This can be undone within the grace period.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={actionLoading}
      />

      {/* Restore confirmation */}
      <ConfirmationDialog
        open={!!restoreTarget}
        onOpenChange={(open) => !open && setRestoreTarget(null)}
        title="Restore Organization?"
        description={`Restore "${restoreTarget?.name}" and re-activate access for its members.`}
        confirmLabel="Restore"
        variant="warning"
        onConfirm={handleRestore}
        loading={actionLoading}
      />
    </div>
  )
}
