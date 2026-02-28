"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { Save, MessageSquare, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { InstructionEditor } from "@/components/admin/instruction-editor"
import { InstructionsPreview } from "@/components/admin/instructions-preview"
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

/**
 * Format a Date into a relative time string.
 * Examples: "just now", "15 seconds ago", "2 minutes ago", "1 hour ago"
 */
function formatRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 10) return "just now"
  if (seconds < 60) return `${seconds} seconds ago`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} minute${minutes > 1 ? "s" : ""} ago`
  const hours = Math.floor(minutes / 60)
  return `${hours} hour${hours > 1 ? "s" : ""} ago`
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

  // Last-saved timestamps
  const [orgLastSaved, setOrgLastSaved] = React.useState<Date | null>(null)
  const [roleLastSaved, setRoleLastSaved] = React.useState<Record<string, Date | null>>({})

  // Tick counter to force re-render of relative timestamps every 30s
  const [, setTick] = React.useState(0)
  React.useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 30000)
    return () => clearInterval(interval)
  }, [])

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

  // Ref to track dirty state in event handlers without re-registering
  const anyDirtyRef = React.useRef(anyDirty)
  React.useEffect(() => { anyDirtyRef.current = anyDirty }, [anyDirty])

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

  // Intercept client-side navigation (Next.js Link clicks) when dirty
  React.useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!anyDirtyRef.current) return

      const target = (e.target as HTMLElement).closest('a[href]')
      if (!target) return

      const href = (target as HTMLAnchorElement).getAttribute('href')
      if (!href) return

      // Only intercept internal navigation away from this page
      const currentPath = window.location.pathname
      if (href === currentPath || href === '#') return

      e.preventDefault()
      e.stopPropagation()

      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave this page?'
      )
      if (confirmed) {
        window.location.href = href
      }
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  // Intercept browser back/forward navigation when dirty
  React.useEffect(() => {
    const handlePopState = () => {
      if (!anyDirtyRef.current) return

      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave this page?'
      )
      if (!confirmed) {
        // Push the current URL back to undo the navigation
        window.history.pushState(null, '', window.location.href)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

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
        setOrgLastSaved(new Date())
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
          setRoleLastSaved((prev) => ({ ...prev, [roleId]: new Date() }))
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
            placeholder="Write instructions that will guide AI behavior for all users in this organization..."
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
          {orgLastSaved && (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              Last saved: {formatRelativeTime(orgLastSaved)}
            </p>
          )}
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
            <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-12">
              <MessageSquare className="h-10 w-10 text-muted-foreground/40" />
              <div className="text-center">
                <p className="text-sm font-medium text-muted-foreground">
                  No roles configured
                </p>
                <p className="mt-1 text-xs text-muted-foreground/70">
                  Create roles in Role Settings to add role-specific instructions.
                </p>
              </div>
            </div>
          ) : (
            roles.map((role) => {
              const saveStatus = roleSaveStatuses[role.id] || "idle"
              const isDirty = roleDirtyMap[role.id] || false
              const lastSaved = roleLastSaved[role.id] || null

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
                    description={`These instructions are included in addition to organization instructions for users with the ${role.name} role.`}
                    placeholder={`Write role-specific instructions to fine-tune AI responses for ${role.name} users...`}
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
                  {lastSaved && (
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      Last saved: {formatRelativeTime(lastSaved)}
                    </p>
                  )}

                  {/* Combined Instructions Preview */}
                  <InstructionsPreview
                    orgInstructions={orgInstructions}
                    roleInstructions={roleInstructions[role.id] || ""}
                    roleName={role.name}
                  />
                </div>
              )
            })
          )}
        </section>
      </div>
    </div>
  )
}
