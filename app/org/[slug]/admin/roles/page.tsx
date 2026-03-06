"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Shield, Plus } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { Button } from "@/components/ui/button"
import { RoleCard, type RoleData } from "@/components/admin/role-card"
import { RoleFormModal } from "@/components/admin/role-form-modal"
import { toast } from "@/components/ui/toast"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"

const AUTH_SESSION_KEY = "llmatscale_auth_session"
const AUTH_TOKEN_KEY = "llmatscale_auth_token"

function hasValidSession() {
  if (typeof window === "undefined") return false
  const session = window.localStorage.getItem(AUTH_SESSION_KEY)
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
  return !!(session && token)
}

/**
 * Org Admin Roles Page
 *
 * Refactored from inline editing to read-only card grid with modal-based create/edit.
 * - Read-only RoleCard grid (responsive: 1 col mobile, 2 cols md, 3 cols lg)
 * - Create Role button opens RoleFormModal in create mode
 * - Edit button on card opens RoleFormModal in edit mode
 * - Delete button on card opens confirmation dialog
 *
 * Route: /org/[slug]/admin/roles
 */
export default function OrgAdminRolesPage() {
  const router = useRouter()
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  const [roles, setRoles] = React.useState<RoleData[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false)
  const [modalMode, setModalMode] = React.useState<"create" | "edit">("create")
  const [editingRole, setEditingRole] = React.useState<RoleData | undefined>(undefined)

  // Delete confirmation state
  const [deleteDialog, setDeleteDialog] = React.useState<{
    open: boolean
    role: RoleData | null
  }>({ open: false, role: null })
  const [deleting, setDeleting] = React.useState(false)

  // Session check
  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (!hasValidSession()) {
      router.replace(`/org/${slug}/login`)
    }
  }, [router, slug])

  // Fetch roles
  const fetchRoles = React.useCallback(async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem(AUTH_TOKEN_KEY)
      const res = await fetch(`/api/org/${slug}/admin/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        throw new Error("Failed to fetch roles")
      }

      const data: RoleData[] = await res.json()
      setRoles(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roles")
    } finally {
      setLoading(false)
    }
  }, [slug])

  React.useEffect(() => {
    fetchRoles()
  }, [fetchRoles])

  // Open create modal
  const handleCreate = React.useCallback(() => {
    setModalMode("create")
    setEditingRole(undefined)
    setModalOpen(true)
  }, [])

  // Open edit modal
  const handleEdit = React.useCallback((role: RoleData) => {
    setModalMode("edit")
    setEditingRole(role)
    setModalOpen(true)
  }, [])

  // Open delete confirmation
  const handleDeleteRequest = React.useCallback((role: RoleData) => {
    setDeleteDialog({ open: true, role })
  }, [])

  // Confirm delete
  const handleDeleteConfirm = React.useCallback(async () => {
    const role = deleteDialog.role
    if (!role) return

    setDeleting(true)
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY)
      const res = await fetch(`/api/org/${slug}/admin/roles/${role.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete role")
      }

      toast.success(`Role "${role.name}" deleted`)
      setDeleteDialog({ open: false, role: null })
      fetchRoles()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to delete role"
      toast.error(message)
    } finally {
      setDeleting(false)
    }
  }, [slug, deleteDialog.role, fetchRoles])

  // Modal success callback
  const handleModalSuccess = React.useCallback(() => {
    fetchRoles()
  }, [fetchRoles])

  // Loading state: skeleton cards
  if (loading) {
    return (
      <div className="flex h-screen flex-col">
        <AdminPageHeader
          title="Roles"
          description="Manage roles and permissions"
        />
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-6xl">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-52 animate-pulse rounded-2xl border bg-muted/30" />
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">{error}</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <AdminPageHeader
        title="Roles"
        description="Manage roles and permissions"
        actions={
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create Role
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-6xl">
      {/* Role Grid */}
      {roles.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              role={role}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Shield className="mx-auto mb-3 h-12 w-12 opacity-30" />
          <p className="text-sm">No roles configured for this organization.</p>
          <Button variant="outline" className="mt-4" onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Create First Role
          </Button>
        </div>
      )}

        </div>
      </div>

      {/* Role Create/Edit Modal */}
      <RoleFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        role={editingRole}
        orgSlug={slug}
        onSuccess={handleModalSuccess}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((prev) => ({ ...prev, open }))}
        title={`Delete "${deleteDialog.role?.name}" role?`}
        description="This action cannot be undone. The role will be permanently deleted."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleting}
      />
    </div>
  )
}
