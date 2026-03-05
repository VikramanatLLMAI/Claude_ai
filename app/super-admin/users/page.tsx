"use client"

import * as React from "react"
import { Search, UserCog, AlertTriangle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

const AUTH_TOKEN_KEY = "llmatscale_auth_token"
const IMPERSONATION_ORIGINAL_SESSION = "llmatscale_impersonation_original_session"

interface UserResult {
  id: string
  name: string
  email: string
  avatarBase64: string | null
  orgId: string
  orgName: string
  orgSlug: string
  roleName: string
  status: string
  memberId: string
}

interface SearchResponse {
  users: UserResult[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type Duration = 15 | 30 | 60

export default function SuperAdminUsersPage() {
  const [search, setSearch] = React.useState("")
  const [debouncedSearch, setDebouncedSearch] = React.useState("")
  const [users, setUsers] = React.useState<UserResult[]>([])
  const [total, setTotal] = React.useState(0)
  const [page, setPage] = React.useState(1)
  const [totalPages, setTotalPages] = React.useState(1)
  const [loading, setLoading] = React.useState(false)

  // Impersonation dialog state
  const [targetUser, setTargetUser] = React.useState<UserResult | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [duration, setDuration] = React.useState<Duration>(30)
  const [reason, setReason] = React.useState("")
  const [starting, setStarting] = React.useState(false)
  const [error, setError] = React.useState("")

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1) // Reset to first page on new search
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  // Fetch users
  React.useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      try {
        const token = localStorage.getItem(AUTH_TOKEN_KEY)
        const params = new URLSearchParams({
          search: debouncedSearch,
          page: page.toString(),
          pageSize: "20",
        })
        const res = await fetch(`/api/super-admin/users?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) throw new Error("Failed to fetch users")
        const data: SearchResponse = await res.json()
        setUsers(data.users)
        setTotal(data.total)
        setTotalPages(data.totalPages)
      } catch {
        setUsers([])
        setTotal(0)
      } finally {
        setLoading(false)
      }
    }
    fetchUsers()
  }, [debouncedSearch, page])

  const handleImpersonate = (user: UserResult) => {
    setTargetUser(user)
    setDuration(30)
    setReason("")
    setError("")
    setDialogOpen(true)
  }

  const handleStartImpersonation = async () => {
    if (!targetUser) return
    if (reason.length < 10) {
      setError("Reason must be at least 10 characters")
      return
    }

    setStarting(true)
    setError("")

    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY)

      // Store the SA's original session token for later restoration
      if (token) {
        const sessionData = localStorage.getItem("llmatscale_auth_session")
        localStorage.setItem(
          IMPERSONATION_ORIGINAL_SESSION,
          JSON.stringify({
            token,
            session: sessionData,
          })
        )
      }

      const res = await fetch(
        `/api/super-admin/users/${targetUser.id}/impersonate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ duration, reason }),
        }
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to start impersonation")
      }

      const { token: impersonationToken, orgSlug } = await res.json()

      // Replace the current session with the impersonation session
      localStorage.setItem(AUTH_TOKEN_KEY, impersonationToken)

      // Store impersonation marker
      localStorage.setItem("llmatscale_impersonating", "true")

      // Update session data with target user info
      localStorage.setItem(
        "llmatscale_auth_session",
        JSON.stringify({
          token: impersonationToken,
          user: {
            id: targetUser.id,
            name: targetUser.name,
            email: targetUser.email,
          },
          orgSlug,
        })
      )

      // Redirect to the target user's org chat
      window.location.href = `/org/${orgSlug}/chat`
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start impersonation")
      setStarting(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((p) => p[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">User Search</h1>
        <p className="text-muted-foreground">
          Search users across all organizations. Start impersonation for IT support.
        </p>
      </div>

      {/* Search bar */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Results */}
      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">User</th>
              <th className="px-4 py-3 text-left font-medium">Email</th>
              <th className="px-4 py-3 text-left font-medium">Organization</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  Searching...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {debouncedSearch ? "No users found" : "Enter a search term to find users"}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.memberId} className="border-b last:border-b-0 hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium">
                        {user.avatarBase64 ? (
                          <img
                            src={user.avatarBase64}
                            alt={user.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          getInitials(user.name)
                        )}
                      </div>
                      <span className="font-medium">{user.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">{user.orgName}</td>
                  <td className="px-4 py-3">{user.roleName}</td>
                  <td className="px-4 py-3">
                    <Badge variant={user.status === "ACTIVE" ? "default" : "secondary"}>
                      {user.status === "ACTIVE" ? "Active" : "Suspended"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleImpersonate(user)}
                      disabled={user.status !== "ACTIVE"}
                    >
                      <UserCog className="mr-1.5 h-3.5 w-3.5" />
                      Impersonate
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of {total} users
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Impersonation Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Start Impersonation
            </DialogTitle>
            <DialogDescription>
              You will act as this user with full capabilities. All actions will be logged.
            </DialogDescription>
          </DialogHeader>

          {targetUser && (
            <div className="space-y-4">
              {/* Target user info */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium">
                    {getInitials(targetUser.name)}
                  </div>
                  <div>
                    <p className="font-medium">{targetUser.name}</p>
                    <p className="text-sm text-muted-foreground">{targetUser.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {targetUser.orgName} -- {targetUser.roleName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Duration picker */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration</label>
                <div className="flex gap-2">
                  {([15, 30, 60] as Duration[]).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                        duration === d
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-input bg-background hover:bg-muted"
                      }`}
                    >
                      {d} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Reason field */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Reason <span className="text-muted-foreground">(required, min 10 chars)</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., Troubleshooting user's MCP connection configuration..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  rows={3}
                />
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm dark:border-amber-800 dark:bg-amber-950">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span className="text-amber-800 dark:text-amber-200">
                  You will act as this user with full capabilities. All actions will be logged and attributed to both you and the user.
                </span>
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={starting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleStartImpersonation}
              disabled={starting || reason.length < 10}
            >
              {starting ? "Starting..." : "Start Impersonation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
