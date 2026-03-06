"use client"

/**
 * Org Admin Invitations Page
 *
 * Manages invitation lifecycle: send new invitations, resend pending ones,
 * revoke, and view all historical invitations with status filtering.
 *
 * Route: /org/[slug]/admin/invitations
 * Covers: OUI-02, OUI-03
 */

import { useEffect, useState, useMemo, useCallback } from "react"
import { useParams, useRouter } from "next/navigation"
import { Plus, MoreVertical, Send, XCircle, Loader2, Mail } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { DataTable } from "@/components/admin/data-table"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

const AUTH_SESSION_KEY = "llmatscale_auth_session"
const AUTH_TOKEN_KEY = "llmatscale_auth_token"

function getAuthHeaders(): Record<string, string> {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(AUTH_TOKEN_KEY)
      : null
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" }
}

// ============================================
// Types
// ============================================

interface Invitation {
  id: string
  email: string
  roleId: string
  role: { id: string; name: string }
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"
  createdAt: string
  expiresAt: string
  message?: string
}

interface RoleOption {
  id: string
  name: string
}

type FilterTab = "all" | "pending" | "accepted" | "expired"

// ============================================
// Status badge styling
// ============================================

const STATUS_STYLES: Record<Invitation["status"], string> = {
  PENDING:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  ACCEPTED:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  EXPIRED:
    "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700",
  REVOKED:
    "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

// ============================================
// Page component
// ============================================

export default function OrgAdminInvitationsPage() {
  const router = useRouter()
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  // Data state
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [loading, setLoading] = useState(true)

  // Filter state
  const [activeTab, setActiveTab] = useState<FilterTab>("all")

  // Send dialog state
  const [sendDialogOpen, setSendDialogOpen] = useState(false)
  const [sendForm, setSendForm] = useState({
    email: "",
    roleId: "",
    message: "",
  })
  const [sending, setSending] = useState(false)
  const [roleMenuOpen, setRoleMenuOpen] = useState(false)

  // Revoke dialog state
  const [revokeTarget, setRevokeTarget] = useState<Invitation | null>(null)
  const [revoking, setRevoking] = useState(false)

  // Session check
  useEffect(() => {
    if (typeof window === "undefined") return
    const session = localStorage.getItem(AUTH_SESSION_KEY)
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!session || !token) {
      router.replace(`/org/${slug}/login`)
    }
  }, [router, slug])

  // Fetch invitations
  const fetchInvitations = useCallback(async () => {
    try {
      const res = await fetch(`/api/org/${slug}/invitations`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error("Failed to fetch invitations")
      const data: Invitation[] = await res.json()
      setInvitations(data)
    } catch (err) {
      console.error("Failed to load invitations:", err)
      toast.error("Failed to load invitations")
    }
  }, [slug])

  // Fetch roles for dropdown
  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch(`/api/org/${slug}/admin/roles`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) throw new Error("Failed to fetch roles")
      const data = await res.json()
      setRoles(
        data.map((r: { id: string; name: string }) => ({
          id: r.id,
          name: r.name,
        }))
      )
    } catch (err) {
      console.error("Failed to load roles:", err)
    }
  }, [slug])

  // Initial data load
  useEffect(() => {
    async function load() {
      setLoading(true)
      await Promise.all([fetchInvitations(), fetchRoles()])
      setLoading(false)
    }
    load()
  }, [fetchInvitations, fetchRoles])

  // Computed counts
  const counts = useMemo(() => {
    const pending = invitations.filter((i) => i.status === "PENDING").length
    const accepted = invitations.filter((i) => i.status === "ACCEPTED").length
    const expired = invitations.filter((i) => i.status === "EXPIRED").length
    return { pending, accepted, expired }
  }, [invitations])

  // Filtered data
  const filteredInvitations = useMemo(() => {
    if (activeTab === "all") return invitations
    const statusMap: Record<string, string> = {
      pending: "PENDING",
      accepted: "ACCEPTED",
      expired: "EXPIRED",
    }
    return invitations.filter((i) => i.status === statusMap[activeTab])
  }, [invitations, activeTab])

  // ============================================
  // Actions
  // ============================================

  async function handleSendInvitation() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!sendForm.email && !sendForm.roleId) {
      toast.error("Please fill in email and select a role")
      return
    }
    if (!sendForm.email) {
      toast.error("Please enter an email address")
      return
    }
    if (!emailRegex.test(sendForm.email)) {
      toast.error("Please enter a valid email address")
      return
    }
    if (!sendForm.roleId) {
      toast.error("Please select a role")
      return
    }

    setSending(true)
    try {
      const res = await fetch(`/api/org/${slug}/invitations`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          email: sendForm.email,
          roleId: sendForm.roleId,
          message: sendForm.message || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to send invitation")
      }

      toast.success(`Invitation sent to ${sendForm.email}`)
      setSendDialogOpen(false)
      setSendForm({ email: "", roleId: "", message: "" })
      await fetchInvitations()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to send invitation"
      )
    } finally {
      setSending(false)
    }
  }

  async function handleResend(invitation: Invitation) {
    try {
      const res = await fetch(
        `/api/org/${slug}/invitations/${invitation.id}/resend`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to resend invitation")
      }

      toast.success("Invitation resent")
      await fetchInvitations()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to resend invitation"
      )
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return
    setRevoking(true)
    try {
      const res = await fetch(
        `/api/org/${slug}/invitations/${revokeTarget.id}/revoke`,
        {
          method: "POST",
          headers: getAuthHeaders(),
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to revoke invitation")
      }

      toast.success("Invitation revoked")
      setRevokeTarget(null)
      await fetchInvitations()
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to revoke invitation"
      )
    } finally {
      setRevoking(false)
    }
  }

  // ============================================
  // Column definitions
  // ============================================

  const columns: ColumnDef<Invitation, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.email}</span>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.role.name}</Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.original.status
          return (
            <Badge className={cn("capitalize", STATUS_STYLES[status])}>
              {status.toLowerCase()}
            </Badge>
          )
        },
      },
      {
        accessorKey: "createdAt",
        header: "Sent",
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {formatDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        accessorKey: "expiresAt",
        header: "Expires",
        cell: ({ row }) => {
          const isExpired = new Date(row.original.expiresAt) < new Date()
          return (
            <span
              className={cn(
                "text-muted-foreground",
                isExpired && "text-destructive"
              )}
            >
              {isExpired ? "Expired" : formatDate(row.original.expiresAt)}
            </span>
          )
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const inv = row.original
          if (inv.status !== "PENDING") return null
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleResend(inv)}>
                  <Send className="mr-2 h-4 w-4" />
                  Resend
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setRevokeTarget(inv)}
                  className="text-destructive focus:text-destructive"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Revoke
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slug]
  )

  // ============================================
  // Filter tabs
  // ============================================

  const tabs: { key: FilterTab; label: string; count?: number }[] = [
    { key: "all", label: "All", count: invitations.length },
    { key: "pending", label: "Pending", count: counts.pending },
    { key: "accepted", label: "Accepted", count: counts.accepted },
    { key: "expired", label: "Expired", count: counts.expired },
  ]

  // ============================================
  // Render
  // ============================================

  if (loading) {
    return (
      <div className="flex h-screen flex-col">
        <AdminPageHeader
          title="Invitations"
          description="Manage user invitations"
        />
        <div className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </div>
      </div>
    )
  }

  const selectedRoleName = roles.find((r) => r.id === sendForm.roleId)?.name

  return (
    <div className="flex h-screen flex-col">
      <AdminPageHeader
        title="Invitations"
        description="Manage user invitations"
        actions={
          <Button onClick={() => setSendDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Send Invitation
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6 space-y-6">

      {/* Filter tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  "ml-1.5 inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs",
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Data table or empty state */}
      {invitations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">
            No invitations yet. Send your first invitation to add team members.
          </p>
        </div>
      ) : filteredInvitations.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground">
            No {activeTab} invitations found.
          </p>
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filteredInvitations}
          searchColumn="email"
          searchPlaceholder="Search by email..."
        />
      )}

      {/* Send Invitation Dialog */}
      <Dialog
        open={sendDialogOpen}
        onOpenChange={(open) => {
          setSendDialogOpen(open)
          if (!open) {
            setSendForm({ email: "", roleId: "", message: "" })
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Invitation</DialogTitle>
            <DialogDescription>
              Invite a new team member to your organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="invite-email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={sendForm.email}
                onChange={(e) =>
                  setSendForm((prev) => ({ ...prev, email: e.target.value }))
                }
              />
            </div>

            {/* Role dropdown */}
            <div className="space-y-1.5">
              <Label>
                Role <span className="text-destructive">*</span>
              </Label>
              <DropdownMenu
                open={roleMenuOpen}
                onOpenChange={setRoleMenuOpen}
                modal={false}
              >
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-between font-normal",
                      !sendForm.roleId && "text-muted-foreground"
                    )}
                  >
                    {selectedRoleName || "Select a role"}
                    <span className="ml-auto text-xs opacity-50">
                      {"\u25BC"}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-[--radix-dropdown-menu-trigger-width]"
                  align="start"
                  onEscapeKeyDown={(e) => {
                    e.preventDefault()
                    setRoleMenuOpen(false)
                  }}
                >
                  {roles.map((role) => (
                    <DropdownMenuItem
                      key={role.id}
                      onClick={() => {
                        setSendForm((prev) => ({
                          ...prev,
                          roleId: role.id,
                        }))
                        setRoleMenuOpen(false)
                      }}
                    >
                      {role.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Welcome message */}
            <div className="space-y-1.5">
              <Label htmlFor="invite-message">Welcome Message (optional)</Label>
              <textarea
                id="invite-message"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder="Add a personal welcome message..."
                maxLength={500}
                value={sendForm.message}
                onChange={(e) =>
                  setSendForm((prev) => ({
                    ...prev,
                    message: e.target.value,
                  }))
                }
              />
              <p className="text-xs text-muted-foreground text-right">
                {sendForm.message.length}/500
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSendDialogOpen(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button onClick={handleSendInvitation} disabled={sending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <ConfirmationDialog
        open={!!revokeTarget}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null)
        }}
        title="Revoke invitation?"
        description={`Are you sure you want to revoke the invitation to ${revokeTarget?.email}? This cannot be undone.`}
        confirmLabel="Revoke"
        variant="destructive"
        onConfirm={handleRevoke}
        loading={revoking}
      />
      </div>
    </div>
  )
}
