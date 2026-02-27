"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { Save, CheckCircle2, AlertCircle, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { InstructionEditor } from "@/components/admin/instruction-editor"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { TOKEN_LIMITS } from "@/lib/token-counter"

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

type SaveStatus = "idle" | "saving" | "saved" | "error"

/**
 * System Instructions management page for Org Admin.
 *
 * Route: /org/[slug]/admin/instructions
 *
 * Allows Org Admin to set:
 * - Organization-wide system instructions (max 700 tokens)
 * - Role-specific system instructions (max 500 tokens per role)
 */
export default function InstructionsPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  // Organization instructions state
  const [orgInstructions, setOrgInstructions] = React.useState("")
  const [orgSaveStatus, setOrgSaveStatus] = React.useState<SaveStatus>("idle")
  const [orgError, setOrgError] = React.useState<string | null>(null)

  // Roles state
  const [roles, setRoles] = React.useState<RoleData[]>([])
  const [roleInstructions, setRoleInstructions] = React.useState<Record<string, string>>({})
  const [roleSaveStatuses, setRoleSaveStatuses] = React.useState<Record<string, SaveStatus>>({})
  const [roleErrors, setRoleErrors] = React.useState<Record<string, string | null>>({})

  // Loading state
  const [loading, setLoading] = React.useState(true)

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
            setOrgInstructions(instrData.systemInstructions || "")
          }

          if (rolesRes.ok) {
            // Roles endpoint returns array directly
            const rolesData: RoleData[] = await rolesRes.json()
            setRoles(rolesData)

            // Initialize role instructions from fetched data
            const initialRoleInstructions: Record<string, string> = {}
            for (const role of rolesData) {
              initialRoleInstructions[role.id] = role.systemInstructions || ""
            }
            setRoleInstructions(initialRoleInstructions)
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
    setOrgError(null)

    try {
      const res = await fetch(`/api/org/${slug}/admin/instructions`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ systemInstructions: orgInstructions }),
      })

      if (res.ok) {
        setOrgSaveStatus("saved")
        setTimeout(() => setOrgSaveStatus("idle"), 3000)
      } else {
        const data = await res.json()
        setOrgError(data.error || "Failed to save instructions")
        setOrgSaveStatus("error")
      }
    } catch {
      setOrgError("Network error. Please try again.")
      setOrgSaveStatus("error")
    }
  }, [slug, orgInstructions])

  // Save role instructions
  const handleSaveRoleInstructions = React.useCallback(
    async (roleId: string) => {
      setRoleSaveStatuses((prev) => ({ ...prev, [roleId]: "saving" }))
      setRoleErrors((prev) => ({ ...prev, [roleId]: null }))

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
          setRoleSaveStatuses((prev) => ({ ...prev, [roleId]: "saved" }))
          setTimeout(
            () =>
              setRoleSaveStatuses((prev) => ({ ...prev, [roleId]: "idle" })),
            3000
          )
        } else {
          const data = await res.json()
          setRoleErrors((prev) => ({
            ...prev,
            [roleId]: data.error || "Failed to save instructions",
          }))
          setRoleSaveStatuses((prev) => ({ ...prev, [roleId]: "error" }))
        }
      } catch {
        setRoleErrors((prev) => ({
          ...prev,
          [roleId]: "Network error. Please try again.",
        }))
        setRoleSaveStatuses((prev) => ({ ...prev, [roleId]: "error" }))
      }
    },
    [slug, roleInstructions]
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
            maxTokens={TOKEN_LIMITS.org}
            label="Organization Instructions"
            description="Set guidelines, rules, or context that applies to all users."
          />

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSaveOrgInstructions}
              disabled={orgSaveStatus === "saving"}
              size="sm"
            >
              <Save className="mr-2 h-4 w-4" />
              {orgSaveStatus === "saving" ? "Saving..." : "Save"}
            </Button>
            {orgSaveStatus === "saved" && (
              <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                Saved
              </span>
            )}
            {orgSaveStatus === "error" && orgError && (
              <span className="flex items-center gap-1 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {orgError}
              </span>
            )}
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
              const error = roleErrors[role.id] || null

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
                    maxTokens={TOKEN_LIMITS.role}
                    label={role.name}
                    description={
                      role.description || `System instructions for the ${role.name} role.`
                    }
                  />

                  <div className="flex items-center gap-3">
                    <Button
                      onClick={() => handleSaveRoleInstructions(role.id)}
                      disabled={saveStatus === "saving"}
                      size="sm"
                      variant="outline"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saveStatus === "saving" ? "Saving..." : "Save"}
                    </Button>
                    {saveStatus === "saved" && (
                      <span className="flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        Saved
                      </span>
                    )}
                    {saveStatus === "error" && error && (
                      <span className="flex items-center gap-1 text-sm text-destructive">
                        <AlertCircle className="h-4 w-4" />
                        {error}
                      </span>
                    )}
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
