"use client"

import * as React from "react"
import {
  PlugZap,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Loader2,
  Search,
  Globe,
  Shield,
  Pencil,
  Check,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
import { toast } from "@/components/ui/toast"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
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
  const [defaultAssignmentType, setDefaultAssignmentType] = React.useState<"org-wide" | "role-specific">("org-wide")
  const [editingConnection, setEditingConnection] = React.useState<OrgMcpConnection | null>(null)
  const [showEditDialog, setShowEditDialog] = React.useState(false)
  const [deletingConnectionId, setDeletingConnectionId] = React.useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = React.useState(false)

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

  const handleAddConnection = async (data: McpSubmitData) => {
    const res = await fetch(`/api/org/${orgSlug}/admin/mcp/connections`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || "Failed to add connection")
    }
    toast.success("MCP server added successfully")
    await fetchConnections()
  }

  const handleEditConnection = async (data: McpSubmitData) => {
    if (!editingConnection) return
    const res = await fetch(`/api/org/${orgSlug}/admin/mcp/connections/${editingConnection.id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || "Failed to update connection")
    }
    toast.success("MCP connection updated")
    await fetchConnections()
  }

  const handleTest = async (id: string) => {
    const res = await fetch(`/api/org/${orgSlug}/admin/mcp/connections/${id}/test`, {
      method: "POST",
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      toast.success("Connection test passed")
      await fetchConnections()
    } else {
      const data = await res.json().catch(() => ({ error: "Unknown error" }))
      toast.error("Connection test failed: " + (data.error || "Unknown error"))
    }
  }

  const handleDiscover = async (id: string) => {
    const res = await fetch(`/api/org/${orgSlug}/admin/mcp/connections/${id}/discover`, {
      method: "POST",
      headers: getAuthHeaders(),
    })
    if (res.ok) {
      toast.success("Tools discovered successfully")
      await fetchConnections()
    } else {
      const data = await res.json().catch(() => ({ error: "Unknown error" }))
      toast.error("Failed to discover tools: " + (data.error || "Unknown error"))
    }
  }

  const handleDelete = async () => {
    if (!deletingConnectionId) return
    setDeleteLoading(true)
    try {
      const res = await fetch(`/api/org/${orgSlug}/admin/mcp/connections/${deletingConnectionId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (res.ok || res.status === 204) {
        setConnections((prev) => prev.filter((c) => c.id !== deletingConnectionId))
        toast.success("MCP connection deleted")
      } else {
        const data = await res.json().catch(() => ({ error: "Unknown error" }))
        toast.error("Failed to delete connection: " + (data.error || "Unknown error"))
      }
    } catch {
      toast.error("Failed to delete connection")
    } finally {
      setDeleteLoading(false)
      setDeletingConnectionId(null)
    }
  }

  const handleOpenEdit = (connection: OrgMcpConnection) => {
    setEditingConnection(connection)
    setShowEditDialog(true)
  }

  const openAddDialog = (type: "org-wide" | "role-specific") => {
    setDefaultAssignmentType(type)
    setShowAddDialog(true)
  }

  const orgWideConnections = connections.filter((c) => c.assignmentType === "org-wide")
  const roleSpecificConnections = connections.filter((c) => c.assignmentType === "role-specific")

  const connectionsByRole = roleSpecificConnections.reduce<Record<string, OrgMcpConnection[]>>((acc, conn) => {
    const key = conn.roleName || "Unknown Role"
    if (!acc[key]) acc[key] = []
    acc[key].push(conn)
    return acc
  }, {})

  const deletingConnection = deletingConnectionId
    ? connections.find((c) => c.id === deletingConnectionId)
    : null

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Org-wide Servers</h3>
          <Badge variant="secondary" className="text-xs">
            {orgWideConnections.length}
          </Badge>
        </div>
        {orgWideConnections.length === 0 ? (
          <div className="flex flex-col items-center text-center py-8 space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Globe className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">No org-wide MCP servers</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                MCP servers connected here are available to all users in your organization.
              </p>
            </div>
            <Button size="sm" onClick={() => openAddDialog("org-wide")}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Org-Wide Server
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {orgWideConnections.map((conn) => (
              <McpAdminCard
                key={conn.id}
                connection={conn}
                onTest={handleTest}
                onDiscover={handleDiscover}
                onEdit={handleOpenEdit}
                onDelete={(id) => setDeletingConnectionId(id)}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Role-specific Servers</h3>
          <Badge variant="secondary" className="text-xs">
            {roleSpecificConnections.length}
          </Badge>
        </div>
        {Object.keys(connectionsByRole).length === 0 ? (
          <div className="flex flex-col items-center text-center py-8 space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Shield className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">No role-specific MCP servers</p>
              <p className="text-sm text-muted-foreground max-w-sm">
                Assign MCP servers to specific roles to control tool access.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={() => openAddDialog("role-specific")}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Role-Specific Server
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(connectionsByRole).map(([roleName, conns]) => (
              <div key={roleName}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">{roleName}</Badge>
                </div>
                <div className="grid gap-3">
                  {conns.map((conn) => (
                    <McpAdminCard
                      key={conn.id}
                      connection={conn}
                      onTest={handleTest}
                      onDiscover={handleDiscover}
                      onEdit={handleOpenEdit}
                      onDelete={(id) => setDeletingConnectionId(id)}
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
        defaultAssignmentType={defaultAssignmentType}
      />

      <EditOrgMcpDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open)
          if (!open) setEditingConnection(null)
        }}
        onEdit={handleEditConnection}
        roles={roles}
        connection={editingConnection}
      />

      <ConfirmationDialog
        open={deletingConnectionId !== null}
        onOpenChange={(open) => { if (!open) setDeletingConnectionId(null) }}
        title="Delete MCP Connection"
        description={`Are you sure you want to delete "${deletingConnection?.name || ""}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
        loading={deleteLoading}
      />
    </div>
  )
}

// ====================================================================
// MCP Admin Card
// ====================================================================

function McpAdminCard({
  connection, onTest, onDiscover, onEdit, onDelete,
}: {
  connection: OrgMcpConnection
  onTest: (id: string) => Promise<void>
  onDiscover: (id: string) => Promise<void>
  onEdit: (connection: OrgMcpConnection) => void
  onDelete: (id: string) => void
}) {
  const [actionLoading, setActionLoading] = React.useState<string | null>(null)
  const [showTools, setShowTools] = React.useState(false)

  const handleAction = async (action: string, fn: (id: string) => Promise<void>) => {
    setActionLoading(action)
    try { await fn(connection.id) } finally { setActionLoading(null) }
  }

  const statusConfig = {
    connected: { color: "bg-green-500", text: "Connected" },
    disconnected: { color: "bg-gray-400", text: "Disconnected" },
    error: { color: "bg-red-500", text: "Error" },
  }

  const status = statusConfig[connection.status]
  const tools = Array.isArray(connection.availableTools) ? connection.availableTools : []
  const isDiscoverDisabled = actionLoading !== null || connection.status !== "connected"

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("h-2 w-2 rounded-full", status.color)} />
            <CardTitle className="text-sm">{connection.name}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {connection.assignmentType === "org-wide" ? "Org-wide" : `Role: ${connection.roleName}`}
            </Badge>
          </div>
          <TooltipProvider delayDuration={300}>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    aria-label="Test connection"
                    onClick={() => handleAction("test", onTest)}
                    disabled={actionLoading !== null}>
                    {actionLoading === "test"
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <PlugZap className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Test connection</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={isDiscoverDisabled ? 0 : undefined}>
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      aria-label={connection.status !== "connected" ? "Test connection first to discover tools" : "Discover tools"}
                      onClick={() => handleAction("discover", onDiscover)}
                      disabled={isDiscoverDisabled}>
                      {actionLoading === "discover"
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Search className="h-3.5 w-3.5" />}
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  {connection.status !== "connected"
                    ? "Test connection first to discover available tools"
                    : "Discover tools"}
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7"
                    aria-label="Edit connection"
                    onClick={() => onEdit(connection)}
                    disabled={actionLoading !== null}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit connection</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    aria-label="Delete connection"
                    onClick={() => onDelete(connection.id)}
                    disabled={actionLoading !== null}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete connection</TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
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
            <div className={cn("h-2 w-2 rounded-full", status.color)} />
            <span>{status.text}</span>
          </div>
        </div>
        {connection.lastError && connection.status === "error" && (
          <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{connection.lastError}</div>
        )}
        {tools.length > 0 && (
          <div className="space-y-1">
            <button onClick={() => setShowTools(!showTools)}
              className="flex w-full items-center justify-between text-xs font-medium hover:text-primary">
              <span>Available Tools ({tools.length})</span>
              {showTools ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
            {showTools && (
              <div className="max-h-32 overflow-y-auto space-y-1 rounded-md bg-muted/50 p-2">
                {tools.map((tool) => (
                  <div key={tool.name} className="text-xs">
                    <span className="font-medium">{tool.name}</span>
                    {tool.description && <span className="text-muted-foreground ml-1">- {tool.description}</span>}
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
// Shared types and helpers
// ====================================================================

interface McpFormState {
  name: string
  serverUrl: string
  authType: "none" | "api_key" | "oauth"
  apiKey: string
  oauthClientId: string
  oauthClientSecret: string
  assignmentType: "org-wide" | "role-specific"
  selectedRoleId: string
}

interface McpSubmitData {
  name: string
  serverUrl: string
  authType: "none" | "api_key" | "oauth"
  authCredentials?: { apiKey?: string; clientId?: string; clientSecret?: string }
  assignmentType: "org-wide" | "role-specific"
  roleId?: string
}

function validateMcpForm(state: McpFormState, isEdit = false): Record<string, string> {
  const e: Record<string, string> = {}
  if (!state.name.trim()) e.name = "Name is required"
  if (!state.serverUrl.trim()) {
    e.serverUrl = "Server URL is required"
  } else {
    try { new URL(state.serverUrl) } catch { e.serverUrl = "Invalid URL format" }
  }
  if (state.authType === "api_key" && !state.apiKey.trim() && !isEdit) e.apiKey = "API Key is required"
  if (state.authType === "oauth") {
    if (!state.oauthClientId.trim() && !isEdit) e.oauthClientId = "Client ID is required"
    if (!state.oauthClientSecret.trim() && !isEdit) e.oauthClientSecret = "Client Secret is required"
  }
  if (state.assignmentType === "role-specific" && !state.selectedRoleId) e.roleId = "Please select a role"
  return e
}

function buildSubmitData(state: McpFormState): McpSubmitData {
  return {
    name: state.name.trim(),
    serverUrl: state.serverUrl.trim(),
    authType: state.authType,
    ...(state.authType === "api_key" && state.apiKey.trim() && { authCredentials: { apiKey: state.apiKey.trim() } }),
    ...(state.authType === "oauth" && (state.oauthClientId.trim() || state.oauthClientSecret.trim()) && {
      authCredentials: { clientId: state.oauthClientId.trim(), clientSecret: state.oauthClientSecret.trim() },
    }),
    assignmentType: state.assignmentType,
    ...(state.assignmentType === "role-specific" && { roleId: state.selectedRoleId }),
  }
}

const EMPTY_FORM: McpFormState = {
  name: "", serverUrl: "", authType: "none", apiKey: "",
  oauthClientId: "", oauthClientSecret: "", assignmentType: "org-wide", selectedRoleId: "",
}

// ====================================================================
// Shared form fields
// ====================================================================

function McpConnectionFormFields({
  state, onChange, errors, roles,
}: {
  state: McpFormState
  onChange: (u: Partial<McpFormState>) => void
  errors: Record<string, string>
  roles: RoleInfo[]
}) {
  const [roleMenuOpen, setRoleMenuOpen] = React.useState(false)
  const selectedRole = roles.find((r) => r.id === state.selectedRoleId)

  return (
    <div className="space-y-4 py-2">
      <div className="space-y-1.5">
        <Label htmlFor="mcp-name">Name</Label>
        <Input id="mcp-name" placeholder="My MCP Server" value={state.name}
          onChange={(e) => onChange({ name: e.target.value })}
          className={cn(errors.name && "border-destructive")} />
        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="mcp-url">Server URL</Label>
        <Input id="mcp-url" placeholder="https://mcp.example.com/api" value={state.serverUrl}
          onChange={(e) => onChange({ serverUrl: e.target.value })}
          className={cn(errors.serverUrl && "border-destructive")} />
        {errors.serverUrl && <p className="text-xs text-destructive">{errors.serverUrl}</p>}
      </div>
      <div className="space-y-1.5">
        <Label>Authentication</Label>
        <div className="flex gap-2">
          {(["none", "api_key", "oauth"] as const).map((type) => (
            <Button key={type} type="button" size="sm"
              variant={state.authType === type ? "default" : "outline"}
              onClick={() => onChange({ authType: type })}>
              {type === "none" ? "None" : type === "api_key" ? "API Key" : "OAuth"}
            </Button>
          ))}
        </div>
      </div>
      {state.authType === "api_key" && (
        <div className="space-y-1.5">
          <Label htmlFor="mcp-apikey">API Key</Label>
          <Input id="mcp-apikey" type="password" placeholder="Enter API key" value={state.apiKey}
            onChange={(e) => onChange({ apiKey: e.target.value })}
            className={cn(errors.apiKey && "border-destructive")} />
          {errors.apiKey && <p className="text-xs text-destructive">{errors.apiKey}</p>}
        </div>
      )}
      {state.authType === "oauth" && (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="mcp-clientid">OAuth Client ID</Label>
            <Input id="mcp-clientid" placeholder="Client ID" value={state.oauthClientId}
              onChange={(e) => onChange({ oauthClientId: e.target.value })}
              className={cn(errors.oauthClientId && "border-destructive")} />
            {errors.oauthClientId && <p className="text-xs text-destructive">{errors.oauthClientId}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mcp-secret">OAuth Client Secret</Label>
            <Input id="mcp-secret" type="password" placeholder="Client Secret" value={state.oauthClientSecret}
              onChange={(e) => onChange({ oauthClientSecret: e.target.value })}
              className={cn(errors.oauthClientSecret && "border-destructive")} />
            {errors.oauthClientSecret && <p className="text-xs text-destructive">{errors.oauthClientSecret}</p>}
          </div>
        </>
      )}
      <div className="space-y-1.5">
        <Label>Assignment</Label>
        <div className="flex gap-2">
          <Button type="button" size="sm"
            variant={state.assignmentType === "org-wide" ? "default" : "outline"}
            onClick={() => onChange({ assignmentType: "org-wide" })}>
            <Globe className="mr-1.5 h-3.5 w-3.5" />Org-wide
          </Button>
          <Button type="button" size="sm"
            variant={state.assignmentType === "role-specific" ? "default" : "outline"}
            onClick={() => onChange({ assignmentType: "role-specific" })}>
            <Shield className="mr-1.5 h-3.5 w-3.5" />Role-specific
          </Button>
        </div>
      </div>
      {state.assignmentType === "role-specific" && (
        <div className="space-y-1.5">
          <Label>Role</Label>
          <DropdownMenu open={roleMenuOpen} onOpenChange={setRoleMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className={cn(
                "w-full justify-between font-normal",
                !state.selectedRoleId && "text-muted-foreground",
                errors.roleId && "border-destructive"
              )}>
                {selectedRole ? selectedRole.name : "Select a role..."}
                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]" align="start">
              {roles.map((role) => (
                <DropdownMenuItem key={role.id} onClick={() => {
                  onChange({ selectedRoleId: role.id }); setRoleMenuOpen(false)
                }}>
                  <div className="flex items-center gap-2 w-full">
                    {role.id === state.selectedRoleId
                      ? <Check className="h-4 w-4 text-primary" />
                      : <div className="w-4" />}
                    {role.name}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          {errors.roleId && <p className="text-xs text-destructive">{errors.roleId}</p>}
        </div>
      )}
      {errors.submit && (
        <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">{errors.submit}</div>
      )}
    </div>
  )
}

// ====================================================================
// Add Org MCP Dialog
// ====================================================================

function AddOrgMcpDialog({
  open, onOpenChange, onAdd, roles, defaultAssignmentType = "org-wide",
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (data: McpSubmitData) => Promise<void>
  roles: RoleInfo[]
  defaultAssignmentType?: "org-wide" | "role-specific"
}) {
  const [formState, setFormState] = React.useState<McpFormState>({ ...EMPTY_FORM })
  const [isLoading, setIsLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (open) setFormState((p) => ({ ...p, assignmentType: defaultAssignmentType }))
  }, [open, defaultAssignmentType])

  const resetForm = () => { setFormState({ ...EMPTY_FORM }); setErrors({}) }

  const handleSubmit = async () => {
    const v = validateMcpForm(formState)
    if (Object.keys(v).length > 0) { setErrors(v); return }
    setIsLoading(true)
    try {
      await onAdd(buildSubmitData(formState))
      resetForm(); onOpenChange(false)
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to add connection"
      setErrors({ submit: msg }); toast.error("Failed to add server: " + msg)
    } finally { setIsLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={(s) => { if (!s) resetForm(); onOpenChange(s) }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add MCP Server</DialogTitle>
          <DialogDescription>
            Connect a new MCP server to your organization. Choose whether it applies org-wide or to a specific role.
          </DialogDescription>
        </DialogHeader>
        <McpConnectionFormFields state={formState}
          onChange={(u) => setFormState((p) => ({ ...p, ...u }))} errors={errors} roles={roles} />
        <DialogFooter>
          <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false) }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Adding...</>
              : <><Plus className="mr-2 h-4 w-4" />Add Server</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ====================================================================
// Edit Org MCP Dialog
// ====================================================================

function EditOrgMcpDialog({
  open, onOpenChange, onEdit, roles, connection,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (data: McpSubmitData) => Promise<void>
  roles: RoleInfo[]
  connection: OrgMcpConnection | null
}) {
  const [formState, setFormState] = React.useState<McpFormState>({ ...EMPTY_FORM })
  const [isLoading, setIsLoading] = React.useState(false)
  const [errors, setErrors] = React.useState<Record<string, string>>({})

  React.useEffect(() => {
    if (connection && open) {
      setFormState({
        name: connection.name,
        serverUrl: connection.serverUrl,
        authType: connection.authType,
        apiKey: "",
        oauthClientId: "",
        oauthClientSecret: "",
        assignmentType: connection.assignmentType,
        selectedRoleId: connection.roleId || "",
      })
      setErrors({})
    }
  }, [connection, open])

  const handleSubmit = async () => {
    const v = validateMcpForm(formState, true)
    if (Object.keys(v).length > 0) { setErrors(v); return }
    setIsLoading(true)
    try {
      await onEdit(buildSubmitData(formState))
      onOpenChange(false)
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to update connection"
      setErrors({ submit: msg }); toast.error("Failed to update connection: " + msg)
    } finally { setIsLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit MCP Server</DialogTitle>
          <DialogDescription>
            Update the settings for this MCP server connection. Leave credential fields empty to keep existing values.
          </DialogDescription>
        </DialogHeader>
        <McpConnectionFormFields state={formState}
          onChange={(u) => setFormState((p) => ({ ...p, ...u }))} errors={errors} roles={roles} />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading
              ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
              : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export { AddOrgMcpDialog }
export type { OrgMcpConnection, RoleInfo }
