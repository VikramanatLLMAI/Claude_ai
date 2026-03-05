"use client"

/**
 * User Detail Side Panel
 *
 * Sheet-based slide-out panel for viewing user details and performing
 * management actions (suspend, activate, delete, change role, promote, edit name).
 *
 * Covers: OUSR-02 through OUSR-08, OUSR-10, OUSR-11, OUSR-12
 */

import * as React from "react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { toast } from "@/components/ui/toast"
import {
  Ban,
  CheckCircle,
  Trash2,
  ShieldAlert,
  LogOut,
  ShieldCheck,
  Pencil,
  ChevronDown,
  Calendar,
  Clock,
  Mail,
  User as UserIcon,
} from "lucide-react"

import type { UserRow, RoleOption } from "@/app/org/[slug]/admin/users/page"
import {
  UserAvatar,
  UserStatusBadge,
  relativeTime,
  getAuthHeaders,
  getCurrentUserId,
} from "@/app/org/[slug]/admin/users/page"

// ---- Props ----

interface UserDetailPanelProps {
  user: UserRow | null
  open: boolean
  onClose: () => void
  roles: RoleOption[]
  onUserUpdated: () => void
  orgSlug: string
}

export function UserDetailPanel({
  user,
  open,
  onClose,
  roles,
  onUserUpdated,
  orgSlug,
}: UserDetailPanelProps) {
  // Action confirmations
  const [suspendOpen, setSuspendOpen] = React.useState(false)
  const [activateOpen, setActivateOpen] = React.useState(false)
  const [deleteOpen, setDeleteOpen] = React.useState(false)
  const [forceLogoutOpen, setForceLogoutOpen] = React.useState(false)
  const [promoteOpen, setPromoteOpen] = React.useState(false)
  const [roleChangeTarget, setRoleChangeTarget] = React.useState<RoleOption | null>(null)
  const [actionLoading, setActionLoading] = React.useState(false)

  // Name edit dialog
  const [nameEditOpen, setNameEditOpen] = React.useState(false)
  const [editName, setEditName] = React.useState("")
  const [nameSaving, setNameSaving] = React.useState(false)

  const currentUserId = getCurrentUserId()
  const isSelf = user?.userId === currentUserId

  // ---- API action helpers ----

  const doAction = async (
    method: "PATCH" | "DELETE",
    body?: Record<string, unknown>,
    successMsg?: string,
    closePanel = false
  ) => {
    if (!user) return
    setActionLoading(true)
    try {
      const res = await fetch(`/api/org/${orgSlug}/admin/users/${user.userId}`, {
        method,
        headers: getAuthHeaders(),
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Action failed")
      }
      toast.success(successMsg || "Action completed")
      onUserUpdated()
      if (closePanel) onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed")
    } finally {
      setActionLoading(false)
    }
  }

  const handleSuspend = async () => {
    await doAction("PATCH", { action: "suspend" }, `${user?.name} suspended`, true)
    setSuspendOpen(false)
  }

  const handleActivate = async () => {
    await doAction("PATCH", { action: "activate" }, `${user?.name} activated`, true)
    setActivateOpen(false)
  }

  const handleDelete = async () => {
    await doAction("DELETE", undefined, `${user?.name} removed from organization`, true)
    setDeleteOpen(false)
  }

  const handleForceLogout = async () => {
    if (!user) return
    setActionLoading(true)
    try {
      const res = await fetch(
        `/api/org/${orgSlug}/admin/users/${user.userId}/force-logout`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Force logout failed")
      }
      toast.success(`${user.name} logged out`)
      onUserUpdated()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Force logout failed")
    } finally {
      setActionLoading(false)
      setForceLogoutOpen(false)
    }
  }

  const handlePromote = async () => {
    await doAction("PATCH", { action: "promote" }, `${user?.name} promoted to admin`)
    setPromoteOpen(false)
  }

  const handleChangeRole = async (role: RoleOption) => {
    await doAction(
      "PATCH",
      { action: "changeRole", roleId: role.id },
      `${user?.name} changed to ${role.name}`
    )
    setRoleChangeTarget(null)
  }

  const handleNameSave = async () => {
    if (!user || !editName.trim()) return
    setNameSaving(true)
    try {
      const res = await fetch(`/api/org/${orgSlug}/admin/users/${user.userId}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: "updateName", name: editName.trim() }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update name")
      }
      toast.success("Name updated")
      onUserUpdated()
      setNameEditOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update name")
    } finally {
      setNameSaving(false)
    }
  }

  if (!user) return null

  return (
    <>
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="right"
          className="w-[40%] sm:max-w-none overflow-y-auto"
        >
          <SheetHeader className="pb-4">
            {/* Large avatar + name */}
            <div className="flex items-start gap-4 pt-2">
              <UserAvatar
                name={user.name}
                avatarBase64={user.avatarBase64}
                size="lg"
              />
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-xl">{user.name}</SheetTitle>
                <SheetDescription className="mt-1">
                  {user.email}
                </SheetDescription>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline">{user.roleName}</Badge>
                  <UserStatusBadge status={user.status} />
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 border-t border-b py-3 my-2">
            {/* Change Role */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  disabled={isSelf || actionLoading}
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Change Role
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {roles.map((role) => (
                  <DropdownMenuItem
                    key={role.id}
                    onClick={() => setRoleChangeTarget(role)}
                    disabled={role.id === user.roleId}
                  >
                    {role.name}
                    {role.id === user.roleId && " (current)"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Suspend / Activate */}
            {user.status === "Suspended" ? (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setActivateOpen(true)}
                disabled={isSelf || actionLoading}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Activate
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-red-600 hover:text-red-700"
                onClick={() => setSuspendOpen(true)}
                disabled={isSelf || actionLoading}
              >
                <Ban className="h-3.5 w-3.5" />
                Suspend
              </Button>
            )}

            {/* Force Logout */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setForceLogoutOpen(true)}
              disabled={isSelf || actionLoading}
            >
              <LogOut className="h-3.5 w-3.5" />
              Force Logout
            </Button>

            {/* Delete */}
            <Button
              variant="outline"
              size="sm"
              className="gap-1 text-destructive hover:text-destructive"
              onClick={() => setDeleteOpen(true)}
              disabled={isSelf || actionLoading}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>

            {/* Promote to Admin - separate button per CONTEXT.md */}
            {!user.isAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={() => setPromoteOpen(true)}
                disabled={isSelf || actionLoading}
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                Promote to Admin
              </Button>
            )}
          </div>

          {/* Profile section */}
          <div className="space-y-4 py-4">
            <h3 className="text-sm font-semibold text-foreground">Profile</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <UserIcon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Name</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{user.name}</span>
                  <button
                    onClick={() => {
                      setEditName(user.name)
                      setNameEditOpen(true)
                    }}
                    className="p-1 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    disabled={isSelf}
                    title="Edit name"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Email</span>
                </div>
                <span className="text-sm">{user.email}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Role</span>
                </div>
                <Badge variant="outline">{user.roleName}</Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Joined</span>
                </div>
                <span className="text-sm">
                  {new Date(user.joinedAt).toLocaleDateString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Last Active</span>
                </div>
                <span className="text-sm">
                  {relativeTime(user.lastActiveAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Custom Instructions section */}
          <div className="space-y-3 border-t py-4">
            <h3 className="text-sm font-semibold text-foreground">
              Custom Instructions
            </h3>
            {user.customInstructions ? (
              <pre className="whitespace-pre-wrap text-sm bg-muted/50 rounded-md p-3 max-h-48 overflow-y-auto font-sans">
                {user.customInstructions}
              </pre>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No custom instructions set
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Read-only -- for compliance review
            </p>
          </div>

          {/* Usage Summary section */}
          <div className="space-y-3 border-t py-4">
            <h3 className="text-sm font-semibold text-foreground">
              Usage Summary
            </h3>
            <p className="text-sm text-muted-foreground italic">
              Usage analytics available on the Analytics page
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Name edit dialog */}
      <Dialog open={nameEditOpen} onOpenChange={setNameEditOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Name</DialogTitle>
            <DialogDescription>
              Update the display name for {user.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="edit-user-name">Name</Label>
            <Input
              id="edit-user-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1.5"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && editName.trim()) handleNameSave()
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNameEditOpen(false)}
              disabled={nameSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleNameSave}
              disabled={nameSaving || !editName.trim()}
            >
              {nameSaving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation dialogs */}
      <ConfirmationDialog
        open={suspendOpen}
        onOpenChange={(o) => !o && setSuspendOpen(false)}
        title="Suspend Member?"
        description={`Suspending "${user.name}" will immediately invalidate their active sessions. They will not be able to log in until re-activated.`}
        confirmLabel="Suspend"
        variant="destructive"
        onConfirm={handleSuspend}
        loading={actionLoading}
      />

      <ConfirmationDialog
        open={activateOpen}
        onOpenChange={(o) => !o && setActivateOpen(false)}
        title="Activate Member?"
        description={`Re-activate "${user.name}" and restore their access to the organization.`}
        confirmLabel="Activate"
        variant="warning"
        onConfirm={handleActivate}
        loading={actionLoading}
      />

      <ConfirmationDialog
        open={deleteOpen}
        onOpenChange={(o) => !o && setDeleteOpen(false)}
        title="Remove Member?"
        description={`This will remove ${user.name} from the organization. All sessions will be revoked. This action cannot be undone.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleDelete}
        loading={actionLoading}
      />

      <ConfirmationDialog
        open={forceLogoutOpen}
        onOpenChange={(o) => !o && setForceLogoutOpen(false)}
        title="Force Logout?"
        description={`This will invalidate all active sessions for ${user.name}, forcing them to log in again.`}
        confirmLabel="Force Logout"
        variant="warning"
        onConfirm={handleForceLogout}
        loading={actionLoading}
      />

      <ConfirmationDialog
        open={promoteOpen}
        onOpenChange={(o) => !o && setPromoteOpen(false)}
        title="Promote to Admin?"
        description={`This gives ${user.name} full admin access to this organization. They will be able to manage users, roles, and organization settings.`}
        confirmLabel="Promote"
        variant="warning"
        onConfirm={handlePromote}
        loading={actionLoading}
      />

      <ConfirmationDialog
        open={!!roleChangeTarget}
        onOpenChange={(o) => !o && setRoleChangeTarget(null)}
        title="Change Role?"
        description={`Change ${user.name} from "${user.roleName}" to "${roleChangeTarget?.name || ""}"?`}
        confirmLabel="Change Role"
        variant="warning"
        onConfirm={() => { if (roleChangeTarget) return handleChangeRole(roleChangeTarget) }}
        loading={actionLoading}
      />
    </>
  )
}
