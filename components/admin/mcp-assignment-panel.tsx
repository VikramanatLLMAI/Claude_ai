"use client"

import * as React from "react"
import {
  Plug,
  PlugZap,
  AlertCircle,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Loader2,
  Search,
  Globe,
  Shield,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

const AUTH_TOKEN_KEY = "llmatscale_auth_token"

interface RoleInfo {
  id: string
  name: string
}

interface OrgMcpConnection {
  id: string
  name: string
  serverUrl: string
  authType: "none" | "api_key" | "oauth"
  status: "connected" | "disconnected" | "error"
  lastError: string | null
  isActive: boolean
  availableTools: { name: string; description?: string }[]
  lastConnectedAt: string | null
  roleId: string | null
  roleName: string | null
  assignmentType: "org-wide" | "role-specific"
}

interface McpAssignmentPanelProps {
  orgSlug: string
  roles: RoleInfo[]
}

export function McpAssignmentPanel({ orgSlug, roles }: McpAssignmentPanelProps) {
  const [connections, setConnections] = React.useState<OrgMcpConnection[]>([])
  const [loading, setLoading] = React.useState(true)
  const [showAddDialog, setShowAddDialog] = React.useState(false)

  const getAuthHeaders = React.useCallback(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY) || ""
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }
  }, [])

  const fetchConnections = React.useCallback(async () => {
    try {
      const res = await fetch(`/api/org/${orgSlug}/admin/mcp/connections`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        setConnections(data)
      }
    } catch (error) {
      console.error("Error fetching org MCP connections:", error)
    } finally {
      setLoading(false)
    }
  }, [orgSlug, getAuthHeaders])

  React.useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  const handleAddConnection = async (data: {
    name: string
    serverUrl: string
    authType: "none" | "api_key" | "oauth"
    authCredentials?: { apiKey?: string; clientId?: string; clientSecret?: string }
    assignmentType: "org-wide" | "role-specific"
    roleId?: string
  }) => {
    const res = await fetch(`/api/org/${orgSlug}/admin/mcp/connections`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || "Failed to add connection")
    }
    await fetchConnections()
  }

  const handleTest = async (id: string) => {
    const res = await fetch(`/api/org/${orgSlug}/admin/mcp/connections/${id}/test`, {
      method: "POST",
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      await fetchConnections()
    }
  }

  const handleDiscover = async (id: string) => {
    const res = await fetch(`/api/org/${orgSlug}/admin/mcp/connections/${id}/discover`, {
      method: "POST",
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      await fetchConnections()
    }
  }

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/org/${orgSlug}/admin/mcp/connections/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
    if (res.ok || res.status === 204) {
      setConnections((prev) => prev.filter((c) => c.id !== id))
    }
  }

  const orgWideConnections = connections.filter((c) => c.assignmentType === "org-wide")
  const roleSpecificConnections = connections.filter((c) => c.assignmentType === "role-specific")

  // Group role-specific connections by role name
  const connectionsByRole = roleSpecificConnections.reduce<Record<string, OrgMcpConnection[]>>((acc, conn) => {
    const key = conn.roleName || "Unknown Role"
    if (!acc[key]) acc[key] = []
    acc[key].push(conn)
    return acc
  }, {})

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Org-wide Servers */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Org-wide Servers</h3>
          <Badge variant="secondary" className="text-xs">
            {orgWideConnections.length}
          </Badge>
        </div>
        {orgWideConnections.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No org-wide MCP servers configured.
          </p>
        ) : (
          <div className="grid gap-3">
            {orgWideConnections.map((conn) => (
              <McpAdminCard
                key={conn.id}
                connection={conn}
                onTest={handleTest}
                onDiscover={handleDiscover}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Role-specific Servers */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Role-specific Servers</h3>
          <Badge variant="secondary" className="text-xs">
            {roleSpecificConnections.length}
          </Badge>
        </div>
        {Object.keys(connectionsByRole).length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No role-specific MCP servers configured.
          </p>
        ) : (
          <div className="space-y-4">
            {Object.entries(connectionsByRole).map(([roleName, conns]) => (
              <div key={roleName}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {roleName}
                  </Badge>
                </div>
                <div className="grid gap-3">
                  {conns.map((conn) => (
                    <McpAdminCard
                      key={conn.id}
                      connection={conn}
                      onTest={handleTest}
                      onDiscover={handleDiscover}
                      onDelete={handleDelete}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddOrgMcpDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddConnection}
        roles={roles}
      />
    </div>
  )
}

// ====================================================================
// MCP Admin Card (per connection)
// ====================================================================

function McpAdminCard({
  connection,
  onTest,
  onDiscover,
  onDelete,
}: {
  connection: OrgMcpConnection
  onTest: (id: string) => Promise<void>
  onDiscover: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
}) {
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)
  const [showTools, setShowTools] = React.useState(false)

  const handleAction = async (action: string, fn: (id: string) => Promise<void>) => {
    setActionLoading(action)
    try {
      await fn(connection.id)
    } finally {
      setActionLoading(null)
    }
  }

  const statusConfig = {
    connected: { color: "bg-emerald-500", text: "Connected", icon: PlugZap },
    disconnected: { color: "bg-gray-400", text: "Disconnected", icon: Plug },
    error: { color: "bg-destructive", text: "Error", icon: AlertCircle },
  }

  const status = statusConfig[connection.status]
  const StatusIcon = status.icon
  const tools = Array.isArray(connection.availableTools) ? connection.availableTools : []

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("h-2.5 w-2.5 rounded-full", status.color)} />
            <CardTitle className="text-sm">{connection.name}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {connection.assignmentType === "org-wide" ? "Org-wide" : `Role: ${connection.roleName}`}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleAction("test", onTest)}
              disabled={actionLoading !== null}
              title="Test connection"
            >
              {actionLoading === "test" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <PlugZap className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => handleAction("discover", onDiscover)}
              disabled={actionLoading !== null || connection.status !== "connected"}
              title="Discover tools"
            >
              {actionLoading === "discover" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => {
                if (confirm(`Delete "${connection.name}"?`)) {
                  handleAction("delete", onDelete)
                }
              }}
              disabled={actionLoading !== null}
              title="Delete connection"
            >
              {actionLoading === "delete" ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">URL:</span>
          <span className="font-mono text-xs truncate max-w-[250px]">{connection.serverUrl}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Auth:</span>
          <Badge variant="outline" className="text-xs">
            {connection.authType === "none" ? "None" : connection.authType === "api_key" ? "API Key" : "OAuth"}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Status:</span>
          <div className="flex items-center gap-1.5">
            <StatusIcon className="h-3.5 w-3.5" />
            <span>{status.text}</span>
          </div>
        </div>

        {connection.lastError && connection.status === "error" && (
          <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
            {connection.lastError}
          </div>
        )}

        {tools.length > 0 && (
          <div className="space-y-1">
            <button
              onClick={() => setShowTools(!showTools)}
              className="flex w-full items-center justify-between text-xs font-medium hover:text-primary"
            >
              <span>Available Tools ({tools.length})</span>
              {showTools ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showTools && (
              <div className="max-h-32 overflow-y-auto space-y-1 rounded-md bg-muted/50 p-2">
                {tools.map((tool) => (
                  <div key={tool.name} className="text-xs">
                    <span className="font-medium">{tool.name}</span>
                    {tool.description && (
                      <span className="text-muted-foreground ml-1">- {tool.description}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ====================================================================
// Add Org MCP Dialog
// ====================================================================

function AddOrgMcpDialog({
  open,
  onOpenChange,
  onAdd,
  roles,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (data: {
    name: string
    serverUrl: string
    authType: "none" | "api_key" | "oauth"
    authCredentials?: { apiKey?: string; clientId?: string; clientSecret?: string }
    assignmentType: "org-wide" | "role-specific"
    roleId?: string
  }) => Promise<void>
  roles: RoleInfo[]
}) {
  const [name, setName] = React.useState("")
  const [serverUrl, setServerUrl] = React.useState("")
  const [authType, setAuthType] = React.useState<"none" | "api_key" | "oauth">("none")
  const [apiKey, setApiKey] = React.useState("")
  const [oauthClientId, setOauthClientId] = React.useState("")
  const [oauthClientSecret, setOauthClientSecret] = React.useState("")
  const [assignmentType, setAssignmentType] = React.useState<"org-wide" | "role-specific">("org-wide")
  const [selectedRoleId, setSelectedRoleId] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  const resetForm = () => {
    setName("")
    setServerUrl("")
    setAuthType("none")
    setApiKey("")
    setOauthClientId("")
    setOauthClientSecret("")
    setAssignmentType("org-wide")
    setSelectedRoleId("")
    setErrors({})
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!name.trim()) newErrors.name = "Name is required"
    if (!serverUrl.trim()) {
      newErrors.serverUrl = "Server URL is required"
    } else {
      try {
        new URL(serverUrl)
      } catch {
        newErrors.serverUrl = "Invalid URL format"
      }
    }
    if (authType === "api_key" && !apiKey.trim()) {
      newErrors.apiKey = "API Key is required"
    }
    if (authType === "oauth") {
      if (!oauthClientId.trim()) newErrors.oauthClientId = "Client ID is required"
      if (!oauthClientSecret.trim()) newErrors.oauthClientSecret = "Client Secret is required"
    }
    if (assignmentType === "role-specific" && !selectedRoleId) {
      newErrors.roleId = "Please select a role"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    setIsLoading(true)
    try {
      await onAdd({
        name: name.trim(),
        serverUrl: serverUrl.trim(),
        authType,
        ...(authType === "api_key" && { authCredentials: { apiKey: apiKey.trim() } }),
        ...(authType === "oauth" && {
          authCredentials: {
            clientId: oauthClientId.trim(),
            clientSecret: oauthClientSecret.trim(),
          },
        }),
        assignmentType,
        ...(assignmentType === "role-specific" && { roleId: selectedRoleId }),
      })
      resetForm()
      onOpenChange(false)
    } catch (error) {
      console.error("Error adding MCP connection:", error)
      setErrors({ submit: error instanceof Error ? error.message : "Failed to add connection" })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(state) => { if (!state) resetForm(); onOpenChange(state) }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add MCP Server</DialogTitle>
          <DialogDescription>
            Connect a new MCP server to your organization. Choose whether it applies org-wide or to a specific role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="mcp-name">Name</Label>
            <Input
              id="mcp-name"
              placeholder="My MCP Server"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={cn(errors.name && "border-destructive")}
            />
            {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
          </div>

          {/* Server URL */}
          <div className="space-y-1.5">
            <Label htmlFor="mcp-url">Server URL</Label>
            <Input
              id="mcp-url"
              placeholder="https://mcp.example.com/api"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className={cn(errors.serverUrl && "border-destructive")}
            />
            {errors.serverUrl && <p className="text-xs text-destructive">{errors.serverUrl}</p>}
          </div>

          {/* Auth Type */}
          <div className="space-y-1.5">
            <Label>Authentication</Label>
            <div className="flex gap-2">
              {(["none", "api_key", "oauth"] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={authType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAuthType(type)}
                >
                  {type === "none" ? "None" : type === "api_key" ? "API Key" : "OAuth"}
                </Button>
              ))}
            </div>
          </div>

          {/* Auth Credentials */}
          {authType === "api_key" && (
            <div className="space-y-1.5">
              <Label htmlFor="mcp-apikey">API Key</Label>
              <Input
                id="mcp-apikey"
                type="password"
                placeholder="Enter API key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className={cn(errors.apiKey && "border-destructive")}
              />
              {errors.apiKey && <p className="text-xs text-destructive">{errors.apiKey}</p>}
            </div>
          )}

          {authType === "oauth" && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="mcp-clientid">OAuth Client ID</Label>
                <Input
                  id="mcp-clientid"
                  placeholder="Client ID"
                  value={oauthClientId}
                  onChange={(e) => setOauthClientId(e.target.value)}
                  className={cn(errors.oauthClientId && "border-destructive")}
                />
                {errors.oauthClientId && <p className="text-xs text-destructive">{errors.oauthClientId}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="mcp-secret">OAuth Client Secret</Label>
                <Input
                  id="mcp-secret"
                  type="password"
                  placeholder="Client Secret"
                  value={oauthClientSecret}
                  onChange={(e) => setOauthClientSecret(e.target.value)}
                  className={cn(errors.oauthClientSecret && "border-destructive")}
                />
                {errors.oauthClientSecret && <p className="text-xs text-destructive">{errors.oauthClientSecret}</p>}
              </div>
            </>
          )}

          {/* Assignment Type */}
          <div className="space-y-1.5">
            <Label>Assignment</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={assignmentType === "org-wide" ? "default" : "outline"}
                size="sm"
                onClick={() => setAssignmentType("org-wide")}
              >
                <Globe className="mr-1.5 h-3.5 w-3.5" />
                Org-wide
              </Button>
              <Button
                type="button"
                variant={assignmentType === "role-specific" ? "default" : "outline"}
                size="sm"
                onClick={() => setAssignmentType("role-specific")}
              >
                <Shield className="mr-1.5 h-3.5 w-3.5" />
                Role-specific
              </Button>
            </div>
          </div>

          {/* Role Selector */}
          {assignmentType === "role-specific" && (
            <div className="space-y-1.5">
              <Label htmlFor="mcp-role">Role</Label>
              <select
                id="mcp-role"
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(e.target.value)}
                className={cn(
                  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring",
                  errors.roleId && "border-destructive"
                )}
              >
                <option value="">Select a role...</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              {errors.roleId && <p className="text-xs text-destructive">{errors.roleId}</p>}
            </div>
          )}

          {errors.submit && (
            <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
              {errors.submit}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false) }}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add Server
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { AddOrgMcpDialog }
export type { OrgMcpConnection, RoleInfo }
