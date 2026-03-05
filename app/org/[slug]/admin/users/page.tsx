"use client"

/**
 * Members Page - Org Admin User Management
 *
 * Displays a DataTable of all org members with:
 * - Filter bar (search, role, status)
 * - Checkbox selection with floating bulk action bar
 * - Row click opens side panel for user details
 *
 * Covers: OUI-02, OUI-03, OUSR-02 through OUSR-08, OUSR-10, OUSR-11, OUSR-12
 */

import * as React from "react"
import { useParams } from "next/navigation"
import {
  ColumnDef,
  RowSelectionState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table"
import {
  Users,
  X,
  Ban,
  ShieldAlert,
  LogOut,
  ChevronDown,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { DataTablePagination } from "@/components/admin/data-table-pagination"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { toast } from "@/components/ui/toast"
import { UserDetailPanel } from "@/components/admin/user-detail-panel"
import { Checkbox } from "@/components/ui/checkbox"

// ---- Constants ----

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

function getCurrentUserId(): string | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem("llmatscale_auth_session")
    if (!raw) return null
    const session = JSON.parse(raw)
    return session.user?.id || null
  } catch {
    return null
  }
}

// ---- Types ----

interface UserRow {
  id: string
  userId: string
  name: string
  email: string
  avatarBase64: string | null
  roleName: string
  roleId: string
  status: "Active" | "Suspended" | "Inactive"
  lastActiveAt: string | null
  joinedAt: string
  customInstructions: string | null
  isAdmin: boolean
}

interface RoleOption {
  id: string
  name: string
}

// ---- Status badge helper ----

function UserStatusBadge({ status }: { status: UserRow["status"] }) {
  if (status === "Active") {
    return (
      <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800">
        Active
      </Badge>
    )
  }
  if (status === "Suspended") {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800">
        Suspended
      </Badge>
    )
  }
  // Inactive
  return (
    <Badge className="bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800/30 dark:text-gray-400 dark:border-gray-700">
      Inactive
    </Badge>
  )
}

// ---- Relative time helper ----

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never"
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)

  if (diffDay > 30) return `${Math.floor(diffDay / 30)} months ago`
  if (diffDay > 0) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`
  if (diffHour > 0) return `${diffHour} hour${diffHour === 1 ? "" : "s"} ago`
  if (diffMin > 0) return `${diffMin} min ago`
  return "Just now"
}

// ---- Avatar helper ----

function UserAvatar({
  name,
  avatarBase64,
  size = "sm",
}: {
  name: string
  avatarBase64: string | null
  size?: "sm" | "lg"
}) {
  const sizeClass = size === "lg" ? "h-16 w-16 text-xl" : "h-8 w-8 text-xs"
  const initials = (name || "?")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()

  if (avatarBase64) {
    return (
      <img
        src={avatarBase64}
        alt={name}
        className={`${sizeClass} rounded-full object-cover`}
      />
    )
  }

  return (
    <div
      className={`${sizeClass} rounded-full bg-muted flex items-center justify-center font-medium text-muted-foreground`}
    >
      {initials}
    </div>
  )
}

// ---- Main Page ----

export default function MembersPage() {
  const params = useParams<{ slug: string }>()
  const orgSlug = params.slug

  // Data
  const [users, setUsers] = React.useState<UserRow[]>([])
  const [roles, setRoles] = React.useState<RoleOption[]>([])
  const [loading, setLoading] = React.useState(true)

  // Filters
  const [searchValue, setSearchValue] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [roleFilter, setRoleFilter] = React.useState<string>("")
  const [statusFilter, setStatusFilter] = React.useState<string>("")

  // Table state
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({})

  // Side panel
  const [selectedUser, setSelectedUser] = React.useState<UserRow | null>(null)

  // Bulk action confirmations
  const [bulkSuspendOpen, setBulkSuspendOpen] = React.useState(false)
  const [bulkRoleChangeRole, setBulkRoleChangeRole] = React.useState<RoleOption | null>(null)
  const [bulkActionLoading, setBulkActionLoading] = React.useState(false)

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchValue), 300)
    return () => clearTimeout(timer)
  }, [searchValue])

  // ---- Data fetching ----

  const fetchUsers = React.useCallback(async () => {
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (roleFilter) params.set("role", roleFilter)
      if (statusFilter) params.set("status", statusFilter.toLowerCase())
      params.set("roles", "true")

      const res = await fetch(
        `/api/org/${orgSlug}/admin/users?${params.toString()}`,
        { headers: getAuthHeaders() }
      )
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to load members (${res.status})`)
      }
      const data = await res.json()
      // API returns nested { user: { name, email, ... }, role: { name, ... }, ... }
      // Flatten to match UserRow interface
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const flatUsers: UserRow[] = (data.users || []).map((m: any) => {
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
        const isInactive =
          m.status === "ACTIVE" &&
          m.lastActiveAt &&
          new Date(m.lastActiveAt) < thirtyDaysAgo

        return {
          id: m.id,
          userId: m.user?.id || m.userId,
          name: m.user?.name || m.name || "Unknown",
          email: m.user?.email || m.email || "",
          avatarBase64: m.user?.avatarBase64 || m.avatarBase64 || null,
          roleName: m.role?.name || m.roleName || "Unknown",
          roleId: m.role?.id || m.roleId || "",
          status: m.status === "SUSPENDED" ? "Suspended" : isInactive ? "Inactive" : "Active",
          lastActiveAt: m.lastActiveAt || null,
          joinedAt: m.joinedAt || "",
          customInstructions: m.customInstructions || null,
          isAdmin: Array.isArray(m.role?.permissions) && m.role.permissions.includes("org_admin"),
        }
      })
      setUsers(flatUsers)
      if (data.roles) {
        setRoles(data.roles.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })))
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load members.")
    } finally {
      setLoading(false)
    }
  }, [orgSlug, debouncedSearch, roleFilter, statusFilter])

  React.useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  // ---- Bulk actions ----

  const selectedUserIds = React.useMemo(() => {
    return Object.keys(rowSelection)
      .filter((key) => rowSelection[key])
      .map((idx) => users[Number(idx)]?.userId)
      .filter(Boolean)
  }, [rowSelection, users])

  const handleBulkSuspend = async () => {
    setBulkActionLoading(true)
    try {
      const results = await Promise.allSettled(
        selectedUserIds.map((userId) =>
          fetch(`/api/org/${orgSlug}/admin/users/${userId}`, {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify({ action: "suspend" }),
          }).then(async (res) => {
            if (!res.ok) {
              const d = await res.json().catch(() => ({}))
              throw new Error(d.error || "Failed")
            }
          })
        )
      )
      const succeeded = results.filter((r) => r.status === "fulfilled").length
      const failed = results.filter((r) => r.status === "rejected").length
      if (failed > 0) {
        toast.error(`Suspended ${succeeded}, failed ${failed}`)
      } else {
        toast.success(`Suspended ${succeeded} member${succeeded === 1 ? "" : "s"}`)
      }
      setRowSelection({})
      await fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk suspend failed")
    } finally {
      setBulkActionLoading(false)
      setBulkSuspendOpen(false)
    }
  }

  const handleBulkChangeRole = async (role: RoleOption) => {
    setBulkActionLoading(true)
    try {
      const results = await Promise.allSettled(
        selectedUserIds.map((userId) =>
          fetch(`/api/org/${orgSlug}/admin/users/${userId}`, {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify({ action: "changeRole", roleId: role.id }),
          }).then(async (res) => {
            if (!res.ok) {
              const d = await res.json().catch(() => ({}))
              throw new Error(d.error || "Failed")
            }
          })
        )
      )
      const succeeded = results.filter((r) => r.status === "fulfilled").length
      const failed = results.filter((r) => r.status === "rejected").length
      if (failed > 0) {
        toast.error(`Changed ${succeeded} roles, failed ${failed}`)
      } else {
        toast.success(`Changed ${succeeded} member${succeeded === 1 ? "" : "s"} to ${role.name}`)
      }
      setRowSelection({})
      await fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk role change failed")
    } finally {
      setBulkActionLoading(false)
      setBulkRoleChangeRole(null)
    }
  }

  const handleBulkForceLogout = async () => {
    setBulkActionLoading(true)
    try {
      const results = await Promise.allSettled(
        selectedUserIds.map((userId) =>
          fetch(`/api/org/${orgSlug}/admin/users/${userId}/force-logout`, {
            method: "POST",
            headers: getAuthHeaders(),
          }).then(async (res) => {
            if (!res.ok) {
              const d = await res.json().catch(() => ({}))
              throw new Error(d.error || "Failed")
            }
          })
        )
      )
      const succeeded = results.filter((r) => r.status === "fulfilled").length
      const failed = results.filter((r) => r.status === "rejected").length
      if (failed > 0) {
        toast.error(`Force logged out ${succeeded}, failed ${failed}`)
      } else {
        toast.success(`Force logged out ${succeeded} member${succeeded === 1 ? "" : "s"}`)
      }
      setRowSelection({})
      await fetchUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Bulk force logout failed")
    } finally {
      setBulkActionLoading(false)
    }
  }

  // ---- Filters active check ----

  const hasActiveFilters = !!(searchValue || roleFilter || statusFilter)

  const clearFilters = () => {
    setSearchValue("")
    setDebouncedSearch("")
    setRoleFilter("")
    setStatusFilter("")
  }

  // ---- Column definitions ----

  const columns: ColumnDef<UserRow>[] = React.useMemo(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Select all"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          />
        ),
        enableSorting: false,
        enableColumnFilter: false,
        size: 40,
      },
      {
        accessorKey: "name",
        header: "User",
        cell: ({ row }) => {
          const u = row.original
          return (
            <div className="flex items-center gap-3">
              <UserAvatar name={u.name} avatarBase64={u.avatarBase64} />
              <div className="min-w-0">
                <div className="font-medium truncate">{u.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {u.email}
                </div>
              </div>
            </div>
          )
        },
      },
      {
        accessorKey: "roleName",
        header: "Role",
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.roleName}</Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <UserStatusBadge status={row.original.status} />,
      },
      {
        accessorKey: "lastActiveAt",
        header: "Last Active",
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {relativeTime(row.original.lastActiveAt)}
          </span>
        ),
      },
    ],
    []
  )

  // ---- Table instance ----

  const table = useReactTable({
    data: users,
    columns,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  })

  return (
    <div className="flex h-screen flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">Members</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              Loading members...
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-3">
              <Input
                placeholder="Search by name or email..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="max-w-xs"
              />

              {/* Role filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    {roleFilter
                      ? roles.find((r) => r.id === roleFilter)?.name || "Role"
                      : "All Roles"}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setRoleFilter("")}>
                    All Roles
                  </DropdownMenuItem>
                  {roles.map((role) => (
                    <DropdownMenuItem
                      key={role.id}
                      onClick={() => setRoleFilter(role.id)}
                    >
                      {role.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Status filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1">
                    {statusFilter || "All Statuses"}
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setStatusFilter("")}>
                    All Statuses
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setStatusFilter("Active")}>
                    Active
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("Suspended")}
                  >
                    Suspended
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setStatusFilter("Inactive")}
                  >
                    Inactive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Clear filters */}
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-1 text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </Button>
              )}
            </div>

            {/* DataTable */}
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr
                      key={headerGroup.id}
                      className="border-b bg-muted/50"
                    >
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className="px-4 py-2 text-left text-sm font-medium text-muted-foreground"
                          style={
                            header.column.columnDef.size
                              ? { width: header.column.columnDef.size }
                              : undefined
                          }
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.length > 0 ? (
                    table.getRowModel().rows.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => setSelectedUser(row.original)}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3 text-sm">
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={columns.length}
                        className="h-24 text-center text-sm text-muted-foreground"
                      >
                        No members found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <DataTablePagination table={table} />
          </div>
        )}
      </div>

      {/* Floating bulk action bar */}
      {selectedUserIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
          <div className="flex items-center gap-3 rounded-lg border bg-background px-4 py-2.5 shadow-lg">
            <span className="text-sm font-medium">
              {selectedUserIds.length} selected
            </span>
            <div className="h-4 w-px bg-border" />
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-red-600 hover:text-red-700"
              onClick={() => setBulkSuspendOpen(true)}
              disabled={bulkActionLoading}
            >
              <Ban className="h-3.5 w-3.5" />
              Suspend
            </Button>

            {/* Bulk change role dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={bulkActionLoading}
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
                    onClick={() => setBulkRoleChangeRole(role)}
                  >
                    {role.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleBulkForceLogout}
              disabled={bulkActionLoading}
            >
              <LogOut className="h-3.5 w-3.5" />
              Force Logout
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setRowSelection({})}
              className="ml-1"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Side panel */}
      <UserDetailPanel
        user={selectedUser}
        open={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        roles={roles}
        onUserUpdated={fetchUsers}
        orgSlug={orgSlug}
      />

      {/* Bulk suspend confirmation */}
      <ConfirmationDialog
        open={bulkSuspendOpen}
        onOpenChange={(open) => !open && setBulkSuspendOpen(false)}
        title="Suspend Selected Members?"
        description={`This will immediately suspend ${selectedUserIds.length} member${selectedUserIds.length === 1 ? "" : "s"} and invalidate their active sessions.`}
        confirmLabel="Suspend All"
        variant="destructive"
        onConfirm={handleBulkSuspend}
        loading={bulkActionLoading}
      />

      {/* Bulk role change confirmation */}
      <ConfirmationDialog
        open={!!bulkRoleChangeRole}
        onOpenChange={(open) => !open && setBulkRoleChangeRole(null)}
        title="Change Role for Selected Members?"
        description={`Change the role of ${selectedUserIds.length} member${selectedUserIds.length === 1 ? "" : "s"} to "${bulkRoleChangeRole?.name || ""}".`}
        confirmLabel="Change Role"
        variant="warning"
        onConfirm={() => { if (bulkRoleChangeRole) return handleBulkChangeRole(bulkRoleChangeRole) }}
        loading={bulkActionLoading}
      />
    </div>
  )
}

export { UserAvatar, UserStatusBadge, relativeTime, getAuthHeaders, getCurrentUserId, type UserRow, type RoleOption }
