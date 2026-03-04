"use client"

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
  Plus,
  MoreVertical,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
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
const AUTH_SESSION_KEY = "llmatscale_auth_session"

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

function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null
  try {
    const session = localStorage.getItem(AUTH_SESSION_KEY)
    if (!session) return null
    const parsed = JSON.parse(session)
    return parsed.user?.id || null
  } catch {
    return null
  }
}

// ---- Types ----

interface SuperAdmin {
  id: string
  name: string
  email: string
  createdAt: string
  lastLogin: string | null
}

type CreateFormData = {
  name: string
  email: string
  password: string
}

type EditFormData = {
  name: string
}

// ---- Create Dialog ----

interface CreateSuperAdminDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: CreateFormData) => Promise<void>
}

function CreateSuperAdminDialog({ open, onOpenChange, onSubmit }: CreateSuperAdminDialogProps) {
  const [form, setForm] = React.useState<CreateFormData>({ name: "", email: "", password: "" })
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setForm({ name: "", email: "", password: "" })
      setError(null)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.")
      return
    }
    setSaving(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create Super Admin.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Create Super Admin</DialogTitle>
          <DialogDescription>
            Add a new Super Admin account to the platform.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="sa-name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="sa-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Jane Smith"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sa-email">Email <span className="text-destructive">*</span></Label>
            <Input
              id="sa-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              placeholder="admin@llmatscale.ai"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sa-password">Password <span className="text-destructive">*</span></Label>
            <Input
              id="sa-password"
              type="password"
              value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              placeholder="Min. 8 characters"
              required
              minLength={8}
            />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Super Admin"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---- Edit Dialog ----

interface EditSuperAdminDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  admin: SuperAdmin | null
  onSubmit: (data: EditFormData) => Promise<void>
}

function EditSuperAdminDialog({ open, onOpenChange, admin, onSubmit }: EditSuperAdminDialogProps) {
  const [form, setForm] = React.useState<EditFormData>({ name: "" })
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open && admin) {
      setForm({ name: admin.name || "" })
      setError(null)
    }
  }, [open, admin])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await onSubmit(form)
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update Super Admin.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Edit Super Admin</DialogTitle>
          <DialogDescription>
            Update name for {admin?.email}.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {error && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="edit-sa-name">Name <span className="text-destructive">*</span></Label>
            <Input
              id="edit-sa-name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Jane Smith"
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              value={admin?.email || ""}
              disabled
              className="opacity-60"
            />
            <p className="text-xs text-muted-foreground">Email cannot be changed here.</p>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// ---- Main Page ----

/**
 * Super Admins management page for Super Admin.
 *
 * Route: /super-admin/super-admins
 *
 * Lists all Super Admin users with create/edit/delete CRUD via DataTable.
 * Safety rules enforced in UI:
 * - SAFE-01: Current user cannot delete themselves
 * - SAFE-06: Cannot delete the last Super Admin
 */
export default function SuperAdminsPage() {
  const [admins, setAdmins] = React.useState<SuperAdmin[]>([])
  const [loading, setLoading] = React.useState(true)
  const currentUserId = React.useMemo(() => getCurrentUserId(), [])

  // Modal state
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editingAdmin, setEditingAdmin] = React.useState<SuperAdmin | null>(null)
  const [editOpen, setEditOpen] = React.useState(false)

  // Confirmation
  const [deleteTarget, setDeleteTarget] = React.useState<SuperAdmin | null>(null)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

  // ---- Data fetching ----

  const fetchAdmins = React.useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/super-admins", {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to load Super Admins (${res.status})`)
      }
      const data = await res.json()
      setAdmins(Array.isArray(data) ? data : data.admins || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load Super Admins.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchAdmins()
  }, [fetchAdmins])

  // ---- CRUD handlers ----

  const handleCreate = async (formData: CreateFormData) => {
    const res = await fetch("/api/super-admin/super-admins", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(formData),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Failed to create Super Admin.")
    }
    toast.success("Super Admin created.")
    await fetchAdmins()
  }

  const handleEdit = async (formData: EditFormData) => {
    if (!editingAdmin) return
    const res = await fetch(`/api/super-admin/super-admins/${editingAdmin.id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(formData),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      throw new Error(data.error || "Failed to update Super Admin.")
    }
    toast.success("Super Admin updated.")
    await fetchAdmins()
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/super-admin/super-admins/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete Super Admin.")
      }
      toast.success("Super Admin deleted.")
      await fetchAdmins()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete Super Admin.")
    } finally {
      setDeleteLoading(false)
      setDeleteTarget(null)
    }
  }

  // ---- Column definitions ----

  const columns: ColumnDef<SuperAdmin>[] = [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Name" />
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-medium">
            {row.original.name}
            {row.original.id === currentUserId && (
              <span className="ml-2 text-xs text-muted-foreground">(you)</span>
            )}
          </div>
          <div className="text-xs text-muted-foreground">{row.original.email}</div>
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Email" />
      ),
      cell: ({ row }) => (
        <span className="text-sm">{row.original.email}</span>
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
        const admin = row.original
        const isCurrentUser = admin.id === currentUserId
        const isLastAdmin = admins.length <= 1

        // SAFE-01 + SAFE-06: disable delete for self or last admin
        const canDelete = !isCurrentUser && !isLastAdmin
        const deleteTooltip = isCurrentUser
          ? "Cannot delete yourself"
          : isLastAdmin
          ? "Must have at least 1 Super Admin"
          : undefined

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
              <DropdownMenuItem
                onClick={() => {
                  setEditingAdmin(admin)
                  setEditOpen(true)
                }}
              >
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {canDelete ? (
                <DropdownMenuItem
                  onClick={() => setDeleteTarget(admin)}
                  className="text-destructive focus:text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  disabled
                  className="text-muted-foreground cursor-not-allowed"
                  title={deleteTooltip}
                >
                  Delete
                </DropdownMenuItem>
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
            <Shield className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">Super Admins</h1>
          </div>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Create Super Admin
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">Loading Super Admins...</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={admins}
            searchColumn="name"
            searchPlaceholder="Search Super Admins..."
          />
        )}
      </div>

      {/* Create Dialog */}
      <CreateSuperAdminDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={handleCreate}
      />

      {/* Edit Dialog */}
      <EditSuperAdminDialog
        open={editOpen}
        onOpenChange={(open) => {
          setEditOpen(open)
          if (!open) setEditingAdmin(null)
        }}
        admin={editingAdmin}
        onSubmit={handleEdit}
      />

      {/* Delete confirmation */}
      <ConfirmationDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Super Admin?"
        description={`"${deleteTarget?.name}" (${deleteTarget?.email}) will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  )
}
