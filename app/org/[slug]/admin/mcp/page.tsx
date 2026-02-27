"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { Plus, Loader2, Plug } from "lucide-react"
import { Button } from "@/components/ui/button"
import { McpAssignmentPanel, AddOrgMcpDialog } from "@/components/admin/mcp-assignment-panel"
import type { RoleInfo } from "@/components/admin/mcp-assignment-panel"

const AUTH_TOKEN_KEY = "llmatscale_auth_token"

function getAuthHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) || "" : ""
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

/**
 * Org Admin MCP Server Management Page
 *
 * Route: /org/[slug]/admin/mcp
 *
 * Displays org-managed MCP connections organized into:
 * - Org-wide servers (available to all users)
 * - Role-specific servers (grouped by role)
 *
 * Provides add, test, discover, and delete actions.
 * Auth check is handled by the admin layout.
 */
export default function OrgAdminMcpPage() {
  const params = useParams<{ slug: string }>()
  const [roles, setRoles] = React.useState<RoleInfo[]>([])
  const [rolesLoading, setRolesLoading] = React.useState(true)
  const [showAddDialog, setShowAddDialog] = React.useState(false)
  const [panelKey, setPanelKey] = React.useState(0)

  // Fetch roles for the role selector dropdown
  React.useEffect(() => {
    async function fetchRoles() {
      try {
        const res = await fetch(`/api/org/${params.slug}/admin/roles`, {
          headers: getAuthHeaders(),
        })
        if (res.ok) {
          const data = await res.json()
          setRoles(data.map((r: { id: string; name: string }) => ({ id: r.id, name: r.name })))
        }
      } catch (error) {
        console.error("Error fetching roles:", error)
      } finally {
        setRolesLoading(false)
      }
    }
    fetchRoles()
  }, [params.slug])

  const handleAddConnection = async (data: {
    name: string
    serverUrl: string
    authType: "none" | "api_key" | "oauth"
    authCredentials?: { apiKey?: string; clientId?: string; clientSecret?: string }
    assignmentType: "org-wide" | "role-specific"
    roleId?: string
  }) => {
    const res = await fetch(`/api/org/${params.slug}/admin/mcp/connections`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const error = await res.json()
      throw new Error(error.error || "Failed to add connection")
    }
    // Refresh the panel by changing its key
    setPanelKey((k) => k + 1)
  }

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Plug className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-lg font-semibold text-foreground">MCP Server Management</h1>
            <p className="text-sm text-muted-foreground">
              Connect and manage MCP servers for your organization.
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowAddDialog(true)}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add MCP Server
        </Button>
      </div>

      {/* MCP Connections Panel */}
      <McpAssignmentPanel key={panelKey} orgSlug={params.slug} roles={roles} />

      {/* Add Dialog */}
      <AddOrgMcpDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onAdd={handleAddConnection}
        roles={roles}
      />
    </div>
  )
}
