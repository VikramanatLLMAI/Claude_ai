"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { McpAssignmentPanel, AddOrgMcpDialog } from "@/components/admin/mcp-assignment-panel"
import type { RoleInfo } from "@/components/admin/mcp-assignment-panel"
import { AdminMcpSkeleton } from "@/components/ui/skeleton-loaders"
import { AdminPageHeader } from "@/components/admin/admin-page-header"

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
    return <AdminMcpSkeleton />
  }

  return (
    <div className="flex h-screen flex-col">
      <AdminPageHeader
        title="MCP Servers"
        description="Manage Model Context Protocol connections"
        actions={
          <Button size="sm" onClick={() => setShowAddDialog(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add MCP Server
          </Button>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-6 py-6 space-y-6">
          {/* MCP Connections Panel */}
          <McpAssignmentPanel key={panelKey} orgSlug={params.slug} roles={roles} />
        </div>
      </div>

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
