"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import { Shield, Users, ArrowLeft, Loader2, Save } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { RoleModelAssignment } from "@/components/admin/role-model-assignment"
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
 * Role from the GET /api/org/[slug]/admin/roles endpoint.
 */
interface RoleData {
  id: string
  name: string
  description: string | null
  isSystemRole: boolean
  permissions: string[]
  allowedModels: string[]
  systemInstructions: string | null
  customInstructionsEnabled: boolean
  customInstructionsMaxLength: number
  personalMcpEnabled: boolean
  personalMcpMaxCount: number
  dailyRequestLimit: number | null
  dailyTokenLimit: number | null
  createdAt: string
  updatedAt: string
  _count: { members: number }
}

/**
 * Org Admin Role Settings Page
 *
 * Features:
 * - Toast notifications on save success/error
 * - Confirmation dialog when disabling features
 * - Max MCP server count enforces min 1 when enabled
 * - Toggle switch CSS transition animation
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

  // Track which roles have settings being saved
  const [savingSettings, setSavingSettings] = React.useState<Record<string, boolean>>({})

  // Track local edits per role for settings section
  const [localSettings, setLocalSettings] = React.useState<
    Record<string, {
      customInstructionsEnabled: boolean
      personalMcpEnabled: boolean
      personalMcpMaxCount: number
    }>
  >({})

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = React.useState<{
    open: boolean
    roleId: string
    roleName: string
    featureName: string
    field: string
  }>({ open: false, roleId: "", roleName: "", featureName: "", field: "" })

  React.useEffect(() => {
    if (typeof window === "undefined") return
    if (!hasValidSession()) {
      router.replace(`/org/${slug}/login`)
    }
  }, [router, slug])

  // Fetch roles
  React.useEffect(() => {
    async function fetchRoles() {
      try {
        const token = localStorage.getItem(AUTH_TOKEN_KEY)
        const res = await fetch(`/api/org/${slug}/admin/roles`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          throw new Error("Failed to fetch roles")
        }

        const data: RoleData[] = await res.json()
        setRoles(data)

        // Initialize local settings from fetched data
        const initial: Record<string, {
          customInstructionsEnabled: boolean
          personalMcpEnabled: boolean
          personalMcpMaxCount: number
        }> = {}
        for (const role of data) {
          initial[role.id] = {
            customInstructionsEnabled: role.customInstructionsEnabled,
            personalMcpEnabled: role.personalMcpEnabled,
            personalMcpMaxCount: role.personalMcpMaxCount,
          }
        }
        setLocalSettings(initial)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load roles")
      } finally {
        setLoading(false)
      }
    }

    fetchRoles()
  }, [slug])

  // Save model assignment for a role
  const handleSaveModels = React.useCallback(
    async (roleId: string, modelIds: string[]) => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY)
      const res = await fetch(`/api/org/${slug}/admin/roles/${roleId}/models`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ allowedModels: modelIds }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to save models")
      }

      // Update local state
      setRoles((prev) =>
        prev.map((r) =>
          r.id === roleId ? { ...r, allowedModels: modelIds } : r
        )
      )
    },
    [slug]
  )

  // Update local settings state
  const updateLocalSetting = React.useCallback(
    (roleId: string, field: string, value: boolean | number) => {
      setLocalSettings((prev) => ({
        ...prev,
        [roleId]: {
          ...prev[roleId],
          [field]: value,
        },
      }))
    },
    []
  )

  // Handle toggle with confirmation for disabling features
  const handleToggle = React.useCallback(
    (roleId: string, roleName: string, field: string, featureName: string, checked: boolean) => {
      if (!checked) {
        // Disabling a feature -- show confirmation dialog
        setConfirmDialog({
          open: true,
          roleId,
          roleName,
          featureName,
          field,
        })
      } else {
        // Enabling a feature -- no confirmation needed
        updateLocalSetting(roleId, field, true)
        if (field === "personalMcpEnabled") {
          // Default max count to 3 when toggling on
          const role = roles.find((r) => r.id === roleId)
          if (role && !role.personalMcpEnabled) {
            updateLocalSetting(roleId, "personalMcpMaxCount", 3)
          }
        }
      }
    },
    [updateLocalSetting, roles]
  )

  // Confirm disabling a feature
  const handleConfirmDisable = React.useCallback(() => {
    updateLocalSetting(confirmDialog.roleId, confirmDialog.field, false)
    setConfirmDialog((prev) => ({ ...prev, open: false }))
  }, [confirmDialog, updateLocalSetting])

  // Save settings for a role
  const handleSaveSettings = React.useCallback(
    async (roleId: string) => {
      const settings = localSettings[roleId]
      if (!settings) return

      const roleName = roles.find((r) => r.id === roleId)?.name || "role"
      setSavingSettings((prev) => ({ ...prev, [roleId]: true }))

      try {
        const token = localStorage.getItem(AUTH_TOKEN_KEY)
        const res = await fetch(`/api/org/${slug}/admin/roles/${roleId}/settings`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(settings),
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || "Failed to save settings")
        }

        const updated = await res.json()

        // Update local state
        setRoles((prev) =>
          prev.map((r) =>
            r.id === roleId
              ? {
                  ...r,
                  customInstructionsEnabled: updated.customInstructionsEnabled,
                  personalMcpEnabled: updated.personalMcpEnabled,
                  personalMcpMaxCount: updated.personalMcpMaxCount,
                }
              : r
          )
        )

        // Sync local settings with saved state
        setLocalSettings((prev) => ({
          ...prev,
          [roleId]: {
            customInstructionsEnabled: updated.customInstructionsEnabled,
            personalMcpEnabled: updated.personalMcpEnabled,
            personalMcpMaxCount: updated.personalMcpMaxCount,
          },
        }))

        toast.success(`Settings saved for ${roleName} role`)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to save settings"
        toast.error(`Failed to save settings for ${roleName} role: ${message}`)
      } finally {
        setSavingSettings((prev) => ({ ...prev, [roleId]: false }))
      }
    },
    [slug, localSettings, roles]
  )

  // Check if settings have changed for a role
  const hasSettingsChanged = React.useCallback(
    (role: RoleData): boolean => {
      const local = localSettings[role.id]
      if (!local) return false
      return (
        local.customInstructionsEnabled !== role.customInstructionsEnabled ||
        local.personalMcpEnabled !== role.personalMcpEnabled ||
        local.personalMcpMaxCount !== role.personalMcpMaxCount
      )
    },
    [localSettings]
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl px-6 py-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
            <div className="space-y-1">
              <div className="h-6 w-48 animate-pulse rounded bg-muted" />
              <div className="h-4 w-64 animate-pulse rounded bg-muted" />
            </div>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="mb-6 h-64 animate-pulse rounded-2xl border bg-muted/30" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
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
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-4xl px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/org/${slug}/admin`)}
            className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Admin
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Role Settings</h1>
              <p className="text-sm text-muted-foreground">
                Manage model access, custom instructions, and MCP settings for each role.
              </p>
            </div>
          </div>
        </div>

        {/* Role Cards */}
        <div className="space-y-6">
          {roles.map((role) => {
            const local = localSettings[role.id]

            return (
              <Card key={role.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {role.name}
                        {role.isSystemRole && (
                          <Badge variant="secondary" className="text-[10px]">
                            System
                          </Badge>
                        )}
                      </CardTitle>
                      {role.description && (
                        <CardDescription>{role.description}</CardDescription>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      <span>
                        {role._count.members} member{role._count.members !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Model Assignment Section */}
                  <div>
                    <h3 className="mb-3 text-sm font-semibold text-foreground">
                      Model Access
                    </h3>
                    <RoleModelAssignment
                      roleId={role.id}
                      roleName={role.name}
                      orgSlug={slug}
                      allowedModels={Array.isArray(role.allowedModels) ? role.allowedModels as string[] : []}
                      onSave={(modelIds) => handleSaveModels(role.id, modelIds)}
                    />
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border" />

                  {/* Custom Instructions Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Custom Instructions
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={`ci-${role.id}`} className="text-sm">
                          Allow custom instructions
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {local?.customInstructionsEnabled
                            ? "Users in this role can write custom instructions (max 200 tokens)"
                            : "Custom instructions disabled for this role"}
                        </p>
                      </div>
                      <Switch
                        id={`ci-${role.id}`}
                        checked={local?.customInstructionsEnabled ?? role.customInstructionsEnabled}
                        onCheckedChange={(checked) =>
                          handleToggle(role.id, role.name, "customInstructionsEnabled", "Custom Instructions", checked)
                        }
                      />
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-border" />

                  {/* Personal MCP Servers Section */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      Personal MCP Servers
                    </h3>
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor={`mcp-${role.id}`} className="text-sm">
                          Allow personal MCP servers
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          {local?.personalMcpEnabled
                            ? "Users can add their own MCP server connections"
                            : "Personal MCP servers are disabled for this role"}
                        </p>
                      </div>
                      <Switch
                        id={`mcp-${role.id}`}
                        checked={local?.personalMcpEnabled ?? role.personalMcpEnabled}
                        onCheckedChange={(checked) =>
                          handleToggle(role.id, role.name, "personalMcpEnabled", "Personal MCP Servers", checked)
                        }
                      />
                    </div>
                    {local?.personalMcpEnabled && (
                      <div className="ml-0 mt-2 space-y-1">
                        <div className="flex items-center gap-3">
                          <Label htmlFor={`mcp-max-${role.id}`} className="text-sm whitespace-nowrap">
                            Max servers per user
                          </Label>
                          <Input
                            id={`mcp-max-${role.id}`}
                            type="number"
                            min={1}
                            max={20}
                            className="w-20"
                            value={local.personalMcpMaxCount}
                            onChange={(e) => {
                              const val = parseInt(e.target.value, 10)
                              if (!isNaN(val) && val >= 0 && val <= 20) {
                                updateLocalSetting(role.id, "personalMcpMaxCount", val)
                              }
                            }}
                            onBlur={() => {
                              // Enforce min 1 when MCP is enabled
                              if (local.personalMcpMaxCount < 1) {
                                updateLocalSetting(role.id, "personalMcpMaxCount", 1)
                              }
                            }}
                          />
                        </div>
                        {local.personalMcpMaxCount < 1 && (
                          <p className="text-xs text-amber-600 dark:text-amber-400">
                            Minimum 1 server when enabled
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Save Settings Button */}
                  {hasSettingsChanged(role) && (
                    <div className="flex items-center gap-3 pt-2 border-t border-border">
                      <Button
                        size="sm"
                        onClick={() => handleSaveSettings(role.id)}
                        disabled={savingSettings[role.id]}
                      >
                        {savingSettings[role.id] ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save Settings
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {roles.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="mx-auto mb-3 h-12 w-12 opacity-30" />
              <p className="text-sm">No roles configured for this organization.</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for disabling features */}
      <ConfirmationDialog
        open={confirmDialog.open}
        onOpenChange={(open) => setConfirmDialog((prev) => ({ ...prev, open }))}
        title={`Disable ${confirmDialog.featureName}?`}
        description={`This will disable ${confirmDialog.featureName} for all users with the ${confirmDialog.roleName} role. Their existing settings will be preserved but inactive.`}
        confirmLabel="Disable"
        variant="warning"
        onConfirm={handleConfirmDisable}
      />
    </div>
  )
}
