"use client"

/**
 * Org Admin Settings Page
 *
 * Route: /org/[slug]/admin/settings
 *
 * Sections:
 * 1. Organization Info (read-only): org name, slug, created date
 * 2. Logo: upload/remove org logo
 * 3. Login Page: tagline, welcome message customization
 * 4. Theme: active theme selector
 * 5. Onboarding: onboarding text configuration
 * 6. Platform API Keys: assigned keys with masked values, test button
 */

import * as React from "react"
import { useParams } from "next/navigation"
import {
  Settings,
  Key,
  FlaskConical,
  Loader2,
  Building2,
  Calendar,
  Globe,
  Palette,
  ImageIcon,
  FileText,
  Upload,
  Trash2,
  LogIn,
  BookOpen,
  Save,
  AlertCircle,
  CheckCircle2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ThemeSelector } from "@/components/admin/theme-selector"

const AUTH_TOKEN_KEY = "llmatscale_auth_token"
const AUTH_SESSION_KEY = "llmatscale_auth_session"

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

function getAuthHeadersRaw(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(AUTH_TOKEN_KEY) || ""
      : ""
  return {
    Authorization: `Bearer ${token}`,
  }
}

// ============================================
// Types
// ============================================

interface AssignedApiKey {
  id: string
  assignmentId: string
  name: string
  provider: string
  maskedKey: string
  isActive: boolean
  lastTestedAt: string | null
  assignedAt: string
  createdAt: string
}

interface OrgInfo {
  name: string
  slug: string
  createdAt: string
}

interface TestResult {
  valid: boolean
  testedAt: string
}

// ============================================
// Toast notification
// ============================================

function Toast({
  message,
  type,
  onDismiss,
}: {
  message: string
  type: "success" | "error"
  onDismiss: () => void
}) {
  React.useEffect(() => {
    const timer = setTimeout(onDismiss, 3000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
        type === "success"
          ? "bg-green-100 text-green-800 border border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
          : "bg-destructive/10 text-destructive border border-destructive/20"
      }`}
    >
      {type === "success" ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : (
        <AlertCircle className="h-4 w-4" />
      )}
      {message}
    </div>
  )
}

// ============================================
// API Key Card
// ============================================

function ApiKeyCard({
  apiKey,
  testResult,
  testing,
  onTest,
}: {
  apiKey: AssignedApiKey
  testResult: TestResult | null
  testing: boolean
  onTest: () => void
}) {
  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Key className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium text-foreground">{apiKey.name}</span>
        </div>
        <Badge variant="outline">{apiKey.provider}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-xs text-muted-foreground">Key</span>
          <p className="font-mono text-xs text-foreground mt-0.5">{apiKey.maskedKey}</p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Status</span>
          <div className="mt-0.5">
            {apiKey.isActive ? (
              <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 text-xs">
                Active
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-xs">
                Inactive
              </Badge>
            )}
          </div>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Assigned</span>
          <p className="text-xs text-foreground mt-0.5">
            {new Date(apiKey.assignedAt).toLocaleDateString()}
          </p>
        </div>
        <div>
          <span className="text-xs text-muted-foreground">Last Tested</span>
          <p className="text-xs text-foreground mt-0.5">
            {apiKey.lastTestedAt
              ? new Date(apiKey.lastTestedAt).toLocaleDateString()
              : "Never"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onTest}
          disabled={testing}
        >
          {testing ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
          ) : (
            <FlaskConical className="mr-1.5 h-3.5 w-3.5" />
          )}
          Test
        </Button>

        {testResult && (
          testResult.valid ? (
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
    </div>
  )
}

// ============================================
// Main Page
// ============================================

export default function OrgSettingsPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  // --- Data state ---
  const [apiKeys, setApiKeys] = React.useState<AssignedApiKey[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [orgInfo, setOrgInfo] = React.useState<OrgInfo | null>(null)

  // --- Test state ---
  const [testingId, setTestingId] = React.useState<string | null>(null)
  const [testResults, setTestResults] = React.useState<Record<string, TestResult>>({})

  // --- Logo state ---
  const [currentLogo, setCurrentLogo] = React.useState<string | null>(null)
  const [logoPreview, setLogoPreview] = React.useState<string | null>(null)
  const [logoFile, setLogoFile] = React.useState<File | null>(null)
  const [logoUploading, setLogoUploading] = React.useState(false)
  const [logoRemoving, setLogoRemoving] = React.useState(false)
  const [logoError, setLogoError] = React.useState<string | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // --- Login page state ---
  const [tagline, setTagline] = React.useState("")
  const [welcomeMessage, setWelcomeMessage] = React.useState("")
  const [loginSaving, setLoginSaving] = React.useState(false)
  const [loginLoading, setLoginLoading] = React.useState(true)

  // --- Onboarding state ---
  const [onboardingText, setOnboardingText] = React.useState("")
  const [onboardingVersion, setOnboardingVersion] = React.useState(1)
  const [onboardingSaving, setOnboardingSaving] = React.useState(false)
  const [onboardingLoading, setOnboardingLoading] = React.useState(true)

  // --- Toast state ---
  const [toast, setToast] = React.useState<{ message: string; type: "success" | "error" } | null>(null)

  // ---- Read org info from session ----
  React.useEffect(() => {
    try {
      const sessionData = localStorage.getItem(AUTH_SESSION_KEY)
      if (sessionData) {
        const session = JSON.parse(sessionData)
        if (session.organization) {
          setOrgInfo({
            name: session.organization.name || "",
            slug: session.organization.slug || slug,
            createdAt: session.organization.createdAt || "",
          })
          // Load logo from session if available
          if (session.organization.logoBase64) {
            setCurrentLogo(session.organization.logoBase64)
          }
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [slug])

  // ---- Fetch API keys ----
  const fetchApiKeys = React.useCallback(async () => {
    try {
      setError(null)
      const res = await fetch(`/api/org/${slug}/admin/settings/api-keys`, {
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
  }, [slug])

  React.useEffect(() => {
    fetchApiKeys()
  }, [fetchApiKeys])

  // ---- Fetch login page settings ----
  React.useEffect(() => {
    async function fetchLoginSettings() {
      try {
        const res = await fetch(`/api/org/${slug}/admin/settings/login-page`, {
          headers: getAuthHeaders(),
        })
        if (res.ok) {
          const data = await res.json()
          setTagline(data.tagline || "")
          setWelcomeMessage(data.welcomeMessage || "")
        }
      } catch {
        // Ignore - defaults are empty
      } finally {
        setLoginLoading(false)
      }
    }
    fetchLoginSettings()
  }, [slug])

  // ---- Fetch onboarding config ----
  React.useEffect(() => {
    async function fetchOnboarding() {
      try {
        const res = await fetch(`/api/org/${slug}/admin/onboarding`, {
          headers: getAuthHeaders(),
        })
        if (res.ok) {
          const data = await res.json()
          setOnboardingText(data.text || "")
          setOnboardingVersion(data.version || 1)
        }
      } catch {
        // Ignore
      } finally {
        setOnboardingLoading(false)
      }
    }
    fetchOnboarding()
  }, [slug])

  // ---- Test key ----
  const handleTestKey = async (keyId: string) => {
    setTestingId(keyId)
    try {
      const res = await fetch(`/api/org/${slug}/admin/settings/api-keys/${keyId}/test`, {
        method: "POST",
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Test failed (${res.status})`)
      }
      const data = await res.json()
      setTestResults((prev) => ({
        ...prev,
        [keyId]: {
          valid: data.valid,
          testedAt: data.lastTestedAt,
        },
      }))

      setApiKeys((prev) =>
        prev.map((k) =>
          k.id === keyId ? { ...k, lastTestedAt: data.lastTestedAt } : k
        )
      )
    } catch {
      setTestResults((prev) => ({
        ...prev,
        [keyId]: {
          valid: false,
          testedAt: new Date().toISOString(),
        },
      }))
    } finally {
      setTestingId(null)
    }
  }

  // ---- Logo handlers ----
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogoError(null)
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side validation
    const allowedTypes = ["image/png", "image/jpeg", "image/svg+xml"]
    if (!allowedTypes.includes(file.type)) {
      setLogoError("Invalid file type. Allowed: PNG, JPEG, SVG")
      return
    }
    if (file.size > 500 * 1024) {
      setLogoError("File too large. Maximum size is 500KB")
      return
    }

    setLogoFile(file)
    // Generate client-side preview
    const reader = new FileReader()
    reader.onload = (ev) => {
      setLogoPreview(ev.target?.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleLogoUpload = async () => {
    if (!logoFile) return
    setLogoUploading(true)
    setLogoError(null)

    try {
      const formData = new FormData()
      formData.append("logo", logoFile)

      const token = typeof window !== "undefined" ? localStorage.getItem(AUTH_TOKEN_KEY) || "" : ""
      const res = await fetch(`/api/org/${slug}/admin/logo`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Upload failed")
      }

      const data = await res.json()
      setCurrentLogo(data.logoBase64)
      setLogoPreview(null)
      setLogoFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setToast({ message: "Logo uploaded successfully", type: "success" })
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setLogoUploading(false)
    }
  }

  const handleLogoRemove = async () => {
    setLogoRemoving(true)
    setLogoError(null)

    try {
      const res = await fetch(`/api/org/${slug}/admin/logo`, {
        method: "DELETE",
        headers: getAuthHeadersRaw(),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Remove failed")
      }

      setCurrentLogo(null)
      setLogoPreview(null)
      setLogoFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ""
      setToast({ message: "Logo removed", type: "success" })
    } catch (err) {
      setLogoError(err instanceof Error ? err.message : "Remove failed")
    } finally {
      setLogoRemoving(false)
    }
  }

  // ---- Login page save ----
  const handleLoginSave = async () => {
    setLoginSaving(true)
    try {
      const res = await fetch(`/api/org/${slug}/admin/settings/login-page`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ tagline, welcomeMessage }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Save failed")
      }

      setToast({ message: "Login page settings saved", type: "success" })
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Save failed", type: "error" })
    } finally {
      setLoginSaving(false)
    }
  }

  // ---- Onboarding save ----
  const handleOnboardingSave = async () => {
    setOnboardingSaving(true)
    try {
      const res = await fetch(`/api/org/${slug}/admin/onboarding`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ text: onboardingText }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Save failed")
      }

      const data = await res.json()
      setOnboardingVersion(data.version || onboardingVersion + 1)
      setToast({ message: "Onboarding text updated", type: "success" })
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : "Save failed", type: "error" })
    } finally {
      setOnboardingSaving(false)
    }
  }

  const displayLogo = logoPreview || currentLogo

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-6 py-4 flex items-center gap-3">
        <SidebarTrigger />
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <h1 className="text-lg font-semibold text-foreground">Settings</h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6 space-y-8">
        {/* Organization Info Section */}
        {orgInfo && (
          <section>
            <h2 className="text-base font-semibold text-foreground mb-1">Organization</h2>
            <p className="text-sm text-muted-foreground mb-4">
              General information about your organization.
            </p>
            <div className="rounded-lg border border-border p-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="flex items-start gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground">Name</span>
                    <p className="font-medium text-foreground">{orgInfo.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <span className="text-xs text-muted-foreground">Slug</span>
                    <p className="font-mono text-xs text-foreground">{orgInfo.slug}</p>
                  </div>
                </div>
                {orgInfo.createdAt && (
                  <div className="flex items-start gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <span className="text-xs text-muted-foreground">Created</span>
                      <p className="text-foreground">
                        {new Date(orgInfo.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Logo Section */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <ImageIcon className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Logo</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Upload your organization logo. Displayed on login page and chat sidebar.
          </p>

          <div className="rounded-lg border border-border p-4 space-y-4">
            {/* Current/Preview logo */}
            <div className="flex items-center gap-4">
              {displayLogo ? (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-muted/30 p-2">
                  <img
                    src={displayLogo}
                    alt="Organization logo"
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-dashed border-border bg-muted/30">
                  <ImageIcon className="h-8 w-8 text-muted-foreground/50" />
                </div>
              )}

              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    onChange={handleLogoFileChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Choose file
                  </Button>

                  {logoFile && (
                    <Button
                      size="sm"
                      onClick={handleLogoUpload}
                      disabled={logoUploading}
                    >
                      {logoUploading ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Save className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Upload
                    </Button>
                  )}

                  {currentLogo && !logoFile && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogoRemove}
                      disabled={logoRemoving}
                      className="text-destructive hover:text-destructive"
                    >
                      {logoRemoving ? (
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                      )}
                      Remove
                    </Button>
                  )}
                </div>

                <p className="text-xs text-muted-foreground">
                  PNG, JPEG, or SVG. Max 500KB.
                </p>
              </div>
            </div>

            {/* Logo error */}
            {logoError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {logoError}
              </div>
            )}
          </div>
        </section>

        {/* Login Page Section */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <LogIn className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Login Page</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Customize the login page for your organization members.
          </p>

          {loginLoading ? (
            <div className="space-y-3">
              <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />
              <div className="h-24 w-full rounded-lg bg-muted animate-pulse" />
            </div>
          ) : (
            <div className="rounded-lg border border-border p-4 space-y-4">
              {/* Tagline */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Tagline
                </label>
                <div className="relative">
                  <Input
                    value={tagline}
                    onChange={(e) => setTagline(e.target.value.slice(0, 100))}
                    placeholder="e.g., Your AI-powered workspace"
                    maxLength={100}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {tagline.length}/100
                  </span>
                </div>
              </div>

              {/* Welcome message */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Welcome message
                </label>
                <div className="relative">
                  <textarea
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value.slice(0, 500))}
                    placeholder="Displayed below the tagline on the login page"
                    maxLength={500}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="absolute right-3 bottom-2 text-xs text-muted-foreground">
                    {welcomeMessage.length}/500
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">
                  Visit your org login page to see changes.
                </p>
                <Button
                  size="sm"
                  onClick={handleLoginSave}
                  disabled={loginSaving}
                >
                  {loginSaving ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Theme Section */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <Palette className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Theme</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Select the active theme for your organization. Changes apply to all users.
          </p>
          <ThemeSelector orgSlug={slug} />
        </section>

        {/* Onboarding Section */}
        <section>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-base font-semibold text-foreground">Onboarding</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Configure the onboarding text shown to new users before they can access chat.
          </p>

          {onboardingLoading ? (
            <div className="h-32 w-full rounded-lg bg-muted animate-pulse" />
          ) : (
            <div className="rounded-lg border border-border p-4 space-y-4">
              {/* Current version */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  Version {onboardingVersion}
                </Badge>
              </div>

              {/* Onboarding text */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Onboarding text
                </label>
                <textarea
                  value={onboardingText}
                  onChange={(e) => setOnboardingText(e.target.value)}
                  placeholder="Enter the terms or information users must acknowledge before using the platform..."
                  rows={6}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* Warning */}
              <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md p-3">
                <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>
                  Updating this text will require all users to re-accept onboarding terms.
                </span>
              </div>

              <div className="flex justify-end">
                <Button
                  size="sm"
                  onClick={handleOnboardingSave}
                  disabled={onboardingSaving}
                >
                  {onboardingSaving ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  Save
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Platform API Keys Section */}
        <section>
          <h2 className="text-base font-semibold text-foreground mb-1">Platform API Keys</h2>
          <p className="text-sm text-muted-foreground mb-4">
            API keys assigned to your organization by the platform administrator. Read-only.
          </p>

          {/* Error */}
          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive mb-4">
              {error}
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="space-y-3">
              <div className="h-32 w-full rounded-lg bg-muted animate-pulse" />
              <div className="h-32 w-full rounded-lg bg-muted animate-pulse" />
            </div>
          ) : apiKeys.length === 0 ? (
            /* Empty state */
            <div className="rounded-lg border border-border p-8 text-center">
              <Key className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No API keys assigned to this organization.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Contact your platform administrator to assign API keys.
              </p>
            </div>
          ) : (
            /* Key cards */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {apiKeys.map((key) => (
                <ApiKeyCard
                  key={key.id}
                  apiKey={key}
                  testResult={testResults[key.id] ?? null}
                  testing={testingId === key.id}
                  onTest={() => handleTestKey(key.id)}
                />
              ))}
            </div>
          )}

          {/* Info note */}
          <p className="text-xs text-muted-foreground mt-4">
            API keys are managed by the platform administrator. Contact them to add or change key assignments.
          </p>
        </section>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  )
}
