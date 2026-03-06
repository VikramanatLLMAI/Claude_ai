"use client"

import * as React from "react"
import { Save, RefreshCw } from "lucide-react"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Skeleton } from "@/components/ui/skeleton"
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

// Feature toggle definition
interface FeatureToggle {
  key: keyof FeatureToggles
  label: string
  description: string
}

interface FeatureToggles {
  webSearch: boolean
  fileUploads: boolean
  mcpTools: boolean
  artifactGeneration: boolean
  extendedThinking: boolean
}

interface PlatformSettingsData {
  platformName: string
  sessionExpiryDays: number
  maintenanceMode: boolean
  featureToggles: Partial<FeatureToggles>
}

const FEATURE_TOGGLES: FeatureToggle[] = [
  {
    key: "webSearch",
    label: "Web Search",
    description: "Allow users to use web search in chat",
  },
  {
    key: "fileUploads",
    label: "File Uploads",
    description: "Allow users to upload files in chat",
  },
  {
    key: "mcpTools",
    label: "MCP Tools",
    description: "Allow MCP tool usage in chat",
  },
  {
    key: "artifactGeneration",
    label: "Artifact Generation",
    description: "Allow AI to generate artifacts (HTML, code)",
  },
  {
    key: "extendedThinking",
    label: "Extended / Adaptive Thinking",
    description: "Allow models to use thinking capabilities",
  },
]

const DEFAULT_FORM: PlatformSettingsData = {
  platformName: "LLMatscale.ai",
  sessionExpiryDays: 30,
  maintenanceMode: false,
  featureToggles: {
    webSearch: true,
    fileUploads: true,
    mcpTools: true,
    artifactGeneration: true,
    extendedThinking: true,
  },
}

/**
 * Platform Settings page for Super Admin.
 *
 * Route: /super-admin/settings
 *
 * Two sections:
 *  - General Settings: platform name, session expiry, maintenance mode
 *  - Feature Toggles: grid of feature on/off switches
 *
 * Explicit save button — no auto-save.
 */
export default function PlatformSettingsPage() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Saved values (from last successful fetch/save)
  const [savedValues, setSavedValues] = React.useState<PlatformSettingsData>(DEFAULT_FORM)

  // Current form values
  const [form, setForm] = React.useState<PlatformSettingsData>(DEFAULT_FORM)

  // Dirty state: form differs from saved
  const isDirty = React.useMemo(() => {
    return JSON.stringify(form) !== JSON.stringify(savedValues)
  }, [form, savedValues])

  const fetchSettings = React.useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/super-admin/settings", {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to load settings (${res.status})`)
      }
      const data = await res.json()

      const parsed: PlatformSettingsData = {
        platformName: data.platformName ?? "LLMatscale.ai",
        sessionExpiryDays: data.sessionExpiryDays ?? 30,
        maintenanceMode: data.maintenanceMode ?? false,
        featureToggles: {
          webSearch: data.featureToggles?.webSearch ?? true,
          fileUploads: data.featureToggles?.fileUploads ?? true,
          mcpTools: data.featureToggles?.mcpTools ?? true,
          artifactGeneration: data.featureToggles?.artifactGeneration ?? true,
          extendedThinking: data.featureToggles?.extendedThinking ?? true,
        },
      }

      setSavedValues(parsed)
      setForm(parsed)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load settings.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  // Ctrl+S keyboard shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        if (isDirty && !saving) {
          handleSave()
        }
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, saving])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/super-admin/settings", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save settings.")
      }
      const updated = await res.json()

      const parsed: PlatformSettingsData = {
        platformName: updated.platformName ?? "LLMatscale.ai",
        sessionExpiryDays: updated.sessionExpiryDays ?? 30,
        maintenanceMode: updated.maintenanceMode ?? false,
        featureToggles: {
          webSearch: updated.featureToggles?.webSearch ?? true,
          fileUploads: updated.featureToggles?.fileUploads ?? true,
          mcpTools: updated.featureToggles?.mcpTools ?? true,
          artifactGeneration: updated.featureToggles?.artifactGeneration ?? true,
          extendedThinking: updated.featureToggles?.extendedThinking ?? true,
        },
      }

      setSavedValues(parsed)
      setForm(parsed)
      toast.success("Platform settings saved.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save settings.")
    } finally {
      setSaving(false)
    }
  }

  const setFeatureToggle = (key: keyof FeatureToggles, value: boolean) => {
    setForm((prev) => ({
      ...prev,
      featureToggles: {
        ...prev.featureToggles,
        [key]: value,
      },
    }))
  }

  return (
    <div className="flex h-screen flex-col">
      <AdminPageHeader
        title="Platform Settings"
        description="Configure platform defaults"
        actions={
          <div className="flex items-center gap-3">
            {isDirty && (
              <span className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                Unsaved changes
              </span>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || saving}
            >
              {saving ? (
                <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-3.5 w-3.5" />
              )}
              Save Changes
            </Button>
          </div>
        }
      />

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-xs underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mx-auto max-w-3xl space-y-8">

          {/* General Settings section */}
          <section>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-foreground">
                General Settings
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Platform-wide configuration affecting all organizations.
              </p>
            </div>

            {loading ? (
              <div className="rounded-lg border border-border bg-card p-6 space-y-5">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-9 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-9 w-32" />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-36" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-6 w-11" />
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card p-6 space-y-5">
                {/* Platform Name */}
                <div className="space-y-1.5">
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input
                    id="platformName"
                    value={form.platformName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, platformName: e.target.value }))
                    }
                    placeholder="LLMatscale.ai"
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">
                    Displayed in the platform interface and emails.
                  </p>
                </div>

                {/* Session Expiry */}
                <div className="space-y-1.5">
                  <Label htmlFor="sessionExpiry">Session Expiry</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="sessionExpiry"
                      type="number"
                      value={form.sessionExpiryDays}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10)
                        if (!isNaN(val)) {
                          setForm((prev) => ({
                            ...prev,
                            sessionExpiryDays: Math.min(Math.max(val, 1), 365),
                          }))
                        }
                      }}
                      min={1}
                      max={365}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    How long user sessions remain valid before requiring re-login (1–365 days).
                  </p>
                </div>

                {/* Maintenance Mode */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <Label htmlFor="maintenanceMode" className="text-sm font-medium">
                      Maintenance Mode
                    </Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      When enabled, all non-admin users are blocked from accessing the platform.
                    </p>
                    {form.maintenanceMode && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
                        Warning: Maintenance mode is currently ON — users cannot access the platform.
                      </p>
                    )}
                  </div>
                  <Switch
                    id="maintenanceMode"
                    checked={form.maintenanceMode}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, maintenanceMode: checked }))
                    }
                  />
                </div>
              </div>
            )}
          </section>

          {/* Feature Toggles section */}
          <section>
            <div className="mb-4">
              <h2 className="text-base font-semibold text-foreground">
                Feature Toggles
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Enable or disable platform features globally across all organizations.
              </p>
            </div>

            {loading ? (
              <div className="rounded-lg border border-border bg-card divide-y divide-border">
                {FEATURE_TOGGLES.map((ft) => (
                  <div key={ft.key} className="flex items-center justify-between px-6 py-4">
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                    <Skeleton className="h-6 w-11" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-border bg-card divide-y divide-border">
                {FEATURE_TOGGLES.map((ft) => {
                  const isEnabled =
                    form.featureToggles[ft.key] !== undefined
                      ? form.featureToggles[ft.key]!
                      : true
                  return (
                    <div
                      key={ft.key}
                      className="flex items-center justify-between px-6 py-4"
                    >
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {ft.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {ft.description}
                        </p>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={(checked) =>
                          setFeatureToggle(ft.key, checked)
                        }
                        aria-label={`Toggle ${ft.label}`}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </section>

          {/* Save footer */}
          {!loading && (
            <div className="flex items-center justify-end gap-3 pt-2">
              {isDirty && (
                <span className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Unsaved changes
                </span>
              )}
              <Button
                onClick={handleSave}
                disabled={!isDirty || saving}
              >
                {saving ? (
                  <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
