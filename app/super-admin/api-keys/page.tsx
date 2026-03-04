"use client"

/**
 * Super Admin API Keys Management Page
 *
 * Route: /super-admin/api-keys
 *
 * Features:
 * - DataTable with masked key display + click-to-temporarily-reveal (10s auto-hide)
 * - Add API Key modal: name, paste key, org multi-select, test before save
 * - Edit Assignments modal: update org assignments
 * - Test Key row action: validate via Anthropic API
 * - Delete with confirmation dialog
 *
 * Covers: SKEY-01 through SKEY-04
 */

import * as React from "react"
import { ColumnDef } from "@tanstack/react-table"
import {
  Plus,
  MoreVertical,
  Eye,
  EyeOff,
  Key,
  Loader2,
  FlaskConical,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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

// ============================================
// Constants & Helpers
// ============================================

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

// ============================================
// Types
// ============================================

interface OrgAssignment {
  id: string
  organizationId: string
  organization: {
    id: string
    name: string
    slug: string
  }
}

interface ApiKey {
  id: string
  name: string
  provider: string
  maskedKey: string
  isActive: boolean
  lastTestedAt: string | null
  createdAt: string
  updatedAt: string
  assignments: OrgAssignment[]
  _count: {
    assignments: number
  }
}

interface Organization {
  id: string
  name: string
  slug: string
  status: string
}

// Test result tracked in component state (not persisted)
interface TestResult {
  valid: boolean
  lastTestedAt: string
}

// ============================================
// Add API Key Dialog
// ============================================

interface AddApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizations: Organization[]
  onSuccess: () => void
}

function AddApiKeyDialog({
  open,
  onOpenChange,
  organizations,
  onSuccess,
}: AddApiKeyDialogProps) {
  const [name, setName] = React.useState("")
  const [apiKeyValue, setApiKeyValue] = React.useState("")
  const [selectedOrgIds, setSelectedOrgIds] = React.useState<string[]>([])
  const [testStatus, setTestStatus] = React.useState<"idle" | "testing" | "valid" | "invalid">("idle")
  const [testError, setTestError] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)

  // Reset state when dialog opens/closes
  React.useEffect(() => {
    if (!open) {
      setName("")
      setApiKeyValue("")
      setSelectedOrgIds([])
      setTestStatus("idle")
      setTestError(null)
      setSaving(false)
    }
  }, [open])

  const handleToggleOrg = (orgId: string) => {
    setSelectedOrgIds((prev) =>
      prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId]
    )
  }

  // Test key inline (uses the raw apiKeyValue, not a saved key)
  const handleTestKey = async () => {
    if (!apiKeyValue.trim()) {
      toast.error("Paste an API key to test it")
      return
    }
    setTestStatus("testing")
    setTestError(null)

    try {
      // Create a temporary key to test, then delete it
      // We use the create endpoint to test via the service
      // Alternatively: call a dedicated "test raw key" endpoint
      // For now, we create + test + delete (atomic test flow)
      const createRes = await fetch("/api/super-admin/api-keys", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: `__test_${Date.now()}`,
          apiKey: apiKeyValue.trim(),
          provider: "anthropic",
          organizationIds: [],
        }),
      })

      if (!createRes.ok) {
        setTestStatus("invalid")
        setTestError("Failed to create temporary test key")
        return
      }

      const createdKey = await createRes.json()

      // Test it
      const testRes = await fetch(`/api/super-admin/api-keys/${createdKey.id}/test`, {
        method: "POST",
        headers: getAuthHeaders(),
      })

      const testData = await testRes.json()

      // Clean up the temporary key
      await fetch(`/api/super-admin/api-keys/${createdKey.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })

      if (testData.valid) {
        setTestStatus("valid")
      } else {
        setTestStatus("invalid")
        setTestError(testData.error ?? "Invalid API key")
      }
    } catch {
      setTestStatus("invalid")
      setTestError("Test failed — network or server error")
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Please enter a name for this API key")
      return
    }
    if (!apiKeyValue.trim()) {
      toast.error("Please paste an API key")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/super-admin/api-keys", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: name.trim(),
          apiKey: apiKeyValue.trim(),
          provider: "anthropic",
          organizationIds: selectedOrgIds,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to create API key")
      }

      toast.success("API key added successfully")
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add API key")
    } finally {
      setSaving(false)
    }
  }

  const activeOrgs = organizations.filter((o) => o.status === "ACTIVE")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add API Key</DialogTitle>
          <DialogDescription>
            Add a platform-level Anthropic API key and assign it to organizations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="key-name">Key Name</Label>
            <Input
              id="key-name"
              placeholder="e.g. Production Key, Dev Key"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <Label htmlFor="api-key-value">API Key</Label>
            <Input
              id="api-key-value"
              type="password"
              placeholder="sk-ant-..."
              value={apiKeyValue}
              onChange={(e) => {
                setApiKeyValue(e.target.value)
                setTestStatus("idle")
                setTestError(null)
              }}
              autoComplete="off"
            />
          </div>

          {/* Provider (read-only) */}
          <div className="space-y-1.5">
            <Label>Provider</Label>
            <div className="flex items-center h-9 px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground">
              Anthropic
            </div>
          </div>

          {/* Test Key button + status */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTestKey}
              disabled={testStatus === "testing" || !apiKeyValue.trim()}
            >
              {testStatus === "testing" ? (
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
              ) : (
                <FlaskConical className="mr-2 h-3.5 w-3.5" />
              )}
              Test Key
            </Button>

            {testStatus === "valid" && (
              <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400">
                Valid
              </Badge>
            )}
            {testStatus === "invalid" && (
              <Badge variant="destructive">
                Invalid{testError ? ` — ${testError}` : ""}
              </Badge>
            )}
          </div>

          {/* Org Assignment */}
          {activeOrgs.length > 0 && (
            <div className="space-y-2">
              <Label>Assign to Organizations</Label>
              <div className="max-h-40 overflow-y-auto rounded-md border border-input p-2 space-y-1.5">
                {activeOrgs.map((org) => (
                  <div key={org.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`org-${org.id}`}
                      checked={selectedOrgIds.includes(org.id)}
                      onCheckedChange={() => handleToggleOrg(org.id)}
                    />
                    <label
                      htmlFor={`org-${org.id}`}
                      className="text-sm cursor-pointer select-none"
                    >
                      {org.name}
                    </label>
                  </div>
                ))}
              </div>
              {selectedOrgIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {selectedOrgIds.length} organization{selectedOrgIds.length !== 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Add Key
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Edit Assignments Dialog
// ============================================

interface EditAssignmentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey: ApiKey | null
  organizations: Organization[]
  onSuccess: () => void
}

function EditAssignmentsDialog({
  open,
  onOpenChange,
  apiKey,
  organizations,
  onSuccess,
}: EditAssignmentsDialogProps) {
  const [selectedOrgIds, setSelectedOrgIds] = React.useState<string[]>([])
  const [saving, setSaving] = React.useState(false)

  // Populate with current assignments when key changes
  React.useEffect(() => {
    if (apiKey) {
      setSelectedOrgIds(apiKey.assignments.map((a) => a.organizationId))
    } else {
      setSelectedOrgIds([])
    }
  }, [apiKey])

  const handleToggleOrg = (orgId: string) => {
    setSelectedOrgIds((prev) =>
      prev.includes(orgId) ? prev.filter((id) => id !== orgId) : [...prev, orgId]
    )
  }

  const handleSave = async () => {
    if (!apiKey) return

    setSaving(true)
    try {
      const res = await fetch(`/api/super-admin/api-keys/${apiKey.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ organizationIds: selectedOrgIds }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update assignments")
      }

      toast.success("Assignments updated")
      onSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update assignments")
    } finally {
      setSaving(false)
    }
  }

  const activeOrgs = organizations.filter((o) => o.status === "ACTIVE")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Assignments</DialogTitle>
          <DialogDescription>
            Select which organizations can use the key &ldquo;{apiKey?.name}&rdquo;.
          </DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {activeOrgs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active organizations found.</p>
          ) : (
            <div className="max-h-64 overflow-y-auto rounded-md border border-input p-2 space-y-1.5">
              {activeOrgs.map((org) => (
                <div key={org.id} className="flex items-center gap-2">
                  <Checkbox
                    id={`edit-org-${org.id}`}
                    checked={selectedOrgIds.includes(org.id)}
                    onCheckedChange={() => handleToggleOrg(org.id)}
                  />
                  <label
                    htmlFor={`edit-org-${org.id}`}
                    className="text-sm cursor-pointer select-none"
                  >
                    {org.name}
                  </label>
                </div>
              ))}
            </div>
          )}
          {selectedOrgIds.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {selectedOrgIds.length} organization{selectedOrgIds.length !== 1 ? "s" : ""} selected
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// Masked Key Cell
// ============================================

interface MaskedKeyCellProps {
  apiKey: ApiKey
  revealedKeys: Record<string, string | null>
  onReveal: (id: string) => void
}

function MaskedKeyCell({ apiKey, revealedKeys, onReveal }: MaskedKeyCellProps) {
  const revealed = revealedKeys[apiKey.id]
  const isRevealing = revealed === "loading"

  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-xs text-muted-foreground">
        {revealed && revealed !== "loading" ? revealed : apiKey.maskedKey}
      </span>
      <button
        type="button"
        onClick={() => onReveal(apiKey.id)}
        disabled={isRevealing}
        className="text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        title={revealed && revealed !== "loading" ? "Hide key" : "Reveal key temporarily (10s)"}
        aria-label={revealed && revealed !== "loading" ? "Hide API key" : "Reveal API key temporarily"}
      >
        {isRevealing ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : revealed && revealed !== "loading" ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  )
}

// ============================================
// Main Page Component
// ============================================

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = React.useState<ApiKey[]>([])
  const [organizations, setOrganizations] = React.useState<Organization[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Dialog state
  const [addDialogOpen, setAddDialogOpen] = React.useState(false)
  const [editTarget, setEditTarget] = React.useState<ApiKey | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<ApiKey | null>(null)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

  // Per-row states
  const [testingId, setTestingId] = React.useState<string | null>(null)
  const [testResults, setTestResults] = React.useState<Record<string, TestResult>>({})
  // revealedKeys: null = not revealed, "loading" = fetching, string = revealed value
  const [revealedKeys, setRevealedKeys] = React.useState<Record<string, string | null>>({})

  // ---- Data Fetching ----

  const fetchApiKeys = React.useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/super-admin/api-keys", {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to load API keys (${res.status})`)
      }
      const data = await res.json()
      setApiKeys(Array.isArray(data) ? data : [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys")
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchOrganizations = React.useCallback(async () => {
    try {
      const res = await fetch("/api/super-admin/organizations", {
        headers: getAuthHeaders(),
      })
      if (!res.ok) return
      const data = await res.json()
      setOrganizations(Array.isArray(data) ? data : [])
    } catch {
      // Non-critical — org list is optional for assignment
    }
  }, [])

  React.useEffect(() => {
    fetchApiKeys()
    fetchOrganizations()
  }, [fetchApiKeys, fetchOrganizations])

  // ---- Row Actions ----

  const handleTestKey = async (apiKey: ApiKey) => {
    setTestingId(apiKey.id)
    try {
      const res = await fetch(`/api/super-admin/api-keys/${apiKey.id}/test`, {
        method: "POST",
        headers: getAuthHeaders(),
      })
      const data = await res.json()
      setTestResults((prev) => ({
        ...prev,
        [apiKey.id]: {
          valid: data.valid,
          lastTestedAt: data.lastTestedAt,
        },
      }))

      if (data.valid) {
        toast.success(`Key "${apiKey.name}" is valid`)
      } else {
        toast.error(`Key "${apiKey.name}" is invalid${data.error ? `: ${data.error}` : ""}`)
      }

      // Update the key's lastTestedAt in local state
      setApiKeys((prev) =>
        prev.map((k) =>
          k.id === apiKey.id ? { ...k, lastTestedAt: data.lastTestedAt } : k
        )
      )
    } catch {
      toast.error("Failed to test key")
    } finally {
      setTestingId(null)
    }
  }

  const handleRevealKey = async (id: string) => {
    const current = revealedKeys[id]

    // If already revealed, toggle back to masked
    if (current && current !== "loading") {
      setRevealedKeys((prev) => ({ ...prev, [id]: null }))
      return
    }

    // Start reveal
    setRevealedKeys((prev) => ({ ...prev, [id]: "loading" }))
    try {
      const res = await fetch(`/api/super-admin/api-keys/${id}/reveal`, {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        throw new Error("Failed to reveal key")
      }
      const data = await res.json()
      setRevealedKeys((prev) => ({ ...prev, [id]: data.apiKey }))

      // Auto-hide after 10 seconds
      setTimeout(() => {
        setRevealedKeys((prev) => ({ ...prev, [id]: null }))
      }, 10000)
    } catch {
      setRevealedKeys((prev) => ({ ...prev, [id]: null }))
      toast.error("Failed to reveal API key")
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/super-admin/api-keys/${deleteTarget.id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete key")
      }
      toast.success(`Key "${deleteTarget.name}" deleted`)
      await fetchApiKeys()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete key")
    } finally {
      setDeleteLoading(false)
      setDeleteTarget(null)
    }
  }

  // ---- Column Definitions ----

  const columns = React.useMemo<ColumnDef<ApiKey>[]>(
    () => [
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Name" />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Key className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="font-medium">{row.original.name}</span>
          </div>
        ),
      },
      {
        accessorKey: "provider",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Provider" />
        ),
        cell: () => (
          <Badge variant="outline">Anthropic</Badge>
        ),
      },
      {
        accessorKey: "maskedKey",
        header: "Key",
        cell: ({ row }) => (
          <MaskedKeyCell
            apiKey={row.original}
            revealedKeys={revealedKeys}
            onReveal={handleRevealKey}
          />
        ),
      },
      {
        id: "assignments",
        header: "Organizations",
        cell: ({ row }) => {
          const { assignments } = row.original
          if (assignments.length === 0) {
            return (
              <Badge variant="outline" className="text-muted-foreground">
                Unassigned
              </Badge>
            )
          }
          return (
            <span className="text-sm text-muted-foreground">
              {assignments.map((a) => a.organization.name).join(", ")}
            </span>
          )
        },
      },
      {
        accessorKey: "lastTestedAt",
        header: "Last Tested",
        cell: ({ row }) => {
          const result = testResults[row.original.id]
          const lastTested = result?.lastTestedAt ?? row.original.lastTestedAt

          if (!lastTested) {
            return <span className="text-sm text-muted-foreground">Never</span>
          }

          const date = new Date(lastTested)
          const isRecent = Date.now() - date.getTime() < 60 * 60 * 1000 // within 1 hour

          return (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              {isRecent && result && (
                result.valid ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 text-xs">
                    Valid
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    Invalid
                  </Badge>
                )
              )}
            </div>
          )
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => {
          const key = row.original
          const isTesting = testingId === key.id

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  {isTesting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MoreVertical className="h-4 w-4" />
                  )}
                  <span className="sr-only">Actions</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => handleTestKey(key)}
                  disabled={isTesting}
                >
                  <FlaskConical className="mr-2 h-4 w-4" />
                  Test Key
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setEditTarget(key)}>
                  Edit Assignments
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteTarget(key)}
                  className="text-destructive focus:text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [revealedKeys, testingId, testResults]
  )

  // ---- Render ----

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div>
            <h1 className="text-xl font-semibold">API Keys</h1>
            <p className="text-sm text-muted-foreground">
              Manage platform-level Anthropic API keys and organization assignments
            </p>
          </div>
        </div>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add API Key
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="space-y-3">
            <div className="h-8 w-full rounded bg-muted animate-pulse" />
            <div className="h-12 w-full rounded bg-muted animate-pulse" />
            <div className="h-12 w-full rounded bg-muted animate-pulse" />
            <div className="h-12 w-full rounded bg-muted animate-pulse" />
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={apiKeys}
            searchColumn="name"
            searchPlaceholder="Search API keys..."
            pageSize={10}
          />
        )}
      </div>

      {/* Add API Key Dialog */}
      <AddApiKeyDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        organizations={organizations}
        onSuccess={fetchApiKeys}
      />

      {/* Edit Assignments Dialog */}
      <EditAssignmentsDialog
        open={editTarget !== null}
        onOpenChange={(open) => { if (!open) setEditTarget(null) }}
        apiKey={editTarget}
        organizations={organizations}
        onSuccess={fetchApiKeys}
      />

      {/* Delete Confirmation */}
      <ConfirmationDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Delete API Key"
        description={`Are you sure you want to delete the key "${deleteTarget?.name}"? This will remove it from all assigned organizations.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
      />
    </div>
  )
}
