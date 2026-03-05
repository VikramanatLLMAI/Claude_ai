"use client"

/**
 * Org Admin Settings Page
 *
 * Route: /org/[slug]/admin/settings
 *
 * Sections:
 * 1. Organization Info (read-only): org name, slug, created date
 * 2. Platform API Keys: assigned keys with masked values, test button
 *
 * API keys are read-only -- managed by the platform administrator.
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
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarTrigger } from "@/components/ui/sidebar"

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

// Test result tracked in component state only (not persisted, per decision [05-04])
interface TestResult {
  valid: boolean
  testedAt: string
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

      // Update lastTestedAt in local state
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
    </div>
  )
}
