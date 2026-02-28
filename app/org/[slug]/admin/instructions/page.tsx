"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { Save, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { InstructionEditor } from "@/components/admin/instruction-editor"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { TOKEN_LIMITS } from "@/lib/token-counter"
import { toast } from "@/components/ui/toast"

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

interface RoleData {
  id: string
  name: string
  description: string | null
  systemInstructions: string | null
}

type SaveStatus = "idle" | "saving"

/**
 * System Instructions management page for Org Admin.
 *
 * Route: /org/[slug]/admin/instructions
 *
 * Features:
 * - Toast notifications on save success/error
 * - Unsaved changes tracking with dirty dot indicator
 * - beforeunload warning when leaving with unsaved changes
 * - Ctrl+S keyboard shortcut (via InstructionEditor)
 * - Consistent filled primary save button styling
 */
export default function InstructionsPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  // Organization instructions state
  const [orgInstructions, setOrgInstructions] = React.useState("")
  const [orgSavedValue, setOrgSavedValue] = React.useState("")
  const [orgSaveStatus, setOrgSaveStatus] = React.useState<SaveStatus>("idle")

  // Roles state
  const [roles, setRoles] = React.useState<RoleData[]>([])
  const [roleInstructions, setRoleInstructions] = React.useState<Record<string, string>>({})
  const [roleSavedValues, setRoleSavedValues] = React.useState<Record<string, string>>({})
  const [roleSaveStatuses, setRoleSaveStatuses] = React.useState<Record<string, SaveStatus>>({})

  // Loading state
  const [loading, setLoading] = React.useState(true)

  // Dirty state tracking
  const orgDirty = orgInstructions !== orgSavedValue
  const roleDirtyMap = React.useMemo(() => {
    const map: Record<string, boolean> = {}
    for (const role of roles) {
      map[role.id] = (roleInstructions[role.id] || "") !== (roleSavedValues[role.id] || "")
    }
    return map
  }, [roles, roleInstructions, roleSavedValues])

  const anyDirty = orgDirty || Object.values(roleDirtyMap).some(Boolean)

  // beforeunload warning when any section is dirty
  React.useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (anyDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [anyDirty])

  // Fetch org instructions and roles on mount
  React.useEffect(() => {
    let cancelled = false

    async function fetchData() {
      try {
        const [instrRes, rolesRes] = await Promise.all([
          fetch(`/api/org/${slug}/admin/instructions`, {
            headers: getAuthHeaders(),
          }),
          fetch(`/api/org/${slug}/admin/roles`, {
            headers: getAuthHeaders(),
          }),
        ])

        if (!cancelled) {
          if (instrRes.ok) {
            const instrData = await instrRes.json()
            const val = instrData.systemInstructions || ""
            setOrgInstructions(val)
            setOrgSavedValue(val)
          }

          if (rolesRes.ok) {
            const rolesData: RoleData[] = await rolesRes.json()
            setRoles(rolesData)

            const initialRoleInstructions: Record<string, string> = {}
            const initialSavedValues: Record<string, string> = {}
            for (const role of rolesData) {
              const val = role.systemInstructions || ""
              initialRoleInstructions[role.id] = val
              initialSavedValues[role.id] = val
            }
            setRoleInstructions(initialRoleInstructions)
            setRoleSavedValues(initialSavedValues)
          }

          setLoading(false)
        }
      } catch {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchData()
    return () => {
      cancelled = true
    }
  }, [slug])

  // Save org instructions
  const handleSaveOrgInstructions = React.useCallback(async () => {
    setOrgSaveStatus("saving")

    try {
      const res = await fetch(`/api/org/${slug}/admin/instructions`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ systemInstructions: orgInstructions }),
      })

      if (res.ok) {
        setOrgSavedValue(orgInstructions)
        setOrgSaveStatus("idle")
        toast.success("Organization instructions saved")
      } else {
        const data = await res.json()
        setOrgSaveStatus("idle")
        toast.error(data.error || "Failed to save organization instructions")
      }
    } catch {
      setOrgSaveStatus("idle")
      toast.error("Network error. Please try again.")
    }
  }, [slug, orgInstructions])

  // Save role instructions
  const handleSaveRoleInstructions = React.useCallback(
    async (roleId: string) => {
      const roleName = roles.find((r) => r.id === roleId)?.name || "role"
      setRoleSaveStatuses((prev) => ({ ...prev, [roleId]: "saving" }))

      try {
        const res = await fetch(
          `/api/org/${slug}/admin/roles/${roleId}/instructions`,
          {
            method: "PATCH",
            headers: getAuthHeaders(),
            body: JSON.stringify({
              systemInstructions: roleInstructions[roleId] || "",
            }),
          }
        )

        if (res.ok) {
          setRoleSavedValues((prev) => ({
            ...prev,
            [roleId]: roleInstructions[roleId] || "",
          }))
          setRoleSaveStatuses((prev) => ({ ...prev, [roleId]: "idle" }))
          toast.success(`Instructions saved for ${roleName} role`)
        } else {
          const data = await res.json()
          setRoleSaveStatuses((prev) => ({ ...prev, [roleId]: "idle" }))
          toast.error(data.error || `Failed to save instructions for ${roleName} role`)
        }
      } catch {
        setRoleSaveStatuses((prev) => ({ ...prev, [roleId]: "idle" }))
        toast.error(`Network error saving ${roleName} instructions. Please try again.`)
      }
    },
    [slug, roleInstructions, roles]
  )

  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border px-6">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">System Instructions</h1>
        </header>
        <div className="mx-auto w-full max-w-3xl space-y-8 p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-96" />
            <Skeleton className="h-32 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-24 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center gap-3 border-b border-border px-6">
        <SidebarTrigger />
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">System Instructions</h1>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-10 p-6">
        {/* Organization-wide Instructions */}
        <section className="space-y-4">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Organization-wide Instructions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              These instructions apply to all users in your organization. They
              are prepended to every AI conversation as part of the system
              prompt.
            </p>
          </div>

          <InstructionEditor
            value={orgInstructions}
            onChange={setOrgInstructions}
            onSave={handleSaveOrgInstructions}
            saving={orgSaveStatus === "saving"}
            maxTokens={TOKEN_LIMITS.org}
            label="Organization Instructions"
            description="Set guidelines, rules, or context that applies to all users."
          />

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveOrgInstructions}
              disabled={orgSaveStatus === "saving" || !orgDirty}
              size="sm"
            >
              <Save className="mr-2 h-4 w-4" />
              {orgSaveStatus === "saving" ? "Saving..." : "Save"}
              {orgDirty && (
                <span className="ml-2 h-2 w-2 rounded-full bg-amber-500" />
              )}
            </Button>
          </div>
        </section>

        {/* Separator */}
        <div className="border-t border-border" />

        {/* Role-specific Instructions */}
        <section className="space-y-6">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Role-specific Instructions
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Set instructions per role. These are layered on top of
              organization instructions and apply to all users with that role.
            </p>
          </div>

          {roles.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No roles configured for this organization.
            </p>
          ) : (
            roles.map((role) => {
              const saveStatus = roleSaveStatuses[role.id] || "idle"
              const isDirty = roleDirtyMap[role.id] || false

              return (
                <div key={role.id} className="space-y-3 rounded-lg border border-border p-4">
                  <InstructionEditor
                    value={roleInstructions[role.id] || ""}
                    onChange={(val) =>
                      setRoleInstructions((prev) => ({
                        ...prev,
                        [role.id]: val,
                      }))
                    }
                    onSave={() => handleSaveRoleInstructions(role.id)}
                    saving={saveStatus === "saving"}
                    maxTokens={TOKEN_LIMITS.role}
                    label={role.name}
                    description={
                      role.description || `System instructions for the ${role.name} role.`
                    }
                  />

                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => handleSaveRoleInstructions(role.id)}
                      disabled={saveStatus === "saving" || !isDirty}
                      size="sm"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saveStatus === "saving" ? "Saving..." : "Save"}
                      {isDirty && (
                        <span className="ml-2 h-2 w-2 rounded-full bg-amber-500" />
                      )}
                    </Button>
                  </div>
                </div>
              )
            })
          )}
        </section>
      </div>
    </div>
  )
}
