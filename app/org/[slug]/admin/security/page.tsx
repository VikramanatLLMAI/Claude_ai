"use client"

import * as React from "react"
import { useParams } from "next/navigation"
import { Shield, Loader2, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog"
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

interface PasswordPolicyData {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSpecialChars: boolean
  expiryDays: number | null
}

const DEFAULT_POLICY: PasswordPolicyData = {
  minLength: 8,
  requireUppercase: false,
  requireLowercase: false,
  requireNumbers: false,
  requireSpecialChars: false,
  expiryDays: null,
}

/**
 * Password Policy & Security Management Page for Org Admin.
 *
 * Route: /org/[slug]/admin/security
 *
 * Features:
 * - Configure password requirements (length, complexity, expiry)
 * - Force password reset for all org users
 * - Toast feedback on save/reset
 * - Loading skeleton while fetching
 *
 * Covers: OPWD-01, OPWD-02, OPWD-03, OPWD-04, OPWD-05, OPWD-06
 */
export default function SecurityPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  // Policy form state
  const [policy, setPolicy] = React.useState<PasswordPolicyData>(DEFAULT_POLICY)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  // Expiry toggle (derived from expiryDays)
  const [expiryEnabled, setExpiryEnabled] = React.useState(false)
  const [expiryDaysInput, setExpiryDaysInput] = React.useState(90)

  // Force reset
  const [showForceResetDialog, setShowForceResetDialog] = React.useState(false)
  const [forceResetting, setForceResetting] = React.useState(false)

  // Fetch current policy on mount
  React.useEffect(() => {
    let cancelled = false

    async function fetchPolicy() {
      try {
        const res = await fetch(`/api/org/${slug}/admin/security/password-policy`, {
          headers: getAuthHeaders(),
        })

        if (!cancelled && res.ok) {
          const data: PasswordPolicyData = await res.json()
          setPolicy(data)

          if (data.expiryDays !== null) {
            setExpiryEnabled(true)
            setExpiryDaysInput(data.expiryDays)
          } else {
            setExpiryEnabled(false)
            setExpiryDaysInput(90)
          }
        }
      } catch {
        // Will show defaults
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchPolicy()
    return () => { cancelled = true }
  }, [slug])

  // Save policy
  const handleSave = React.useCallback(async () => {
    setSaving(true)

    const payload: PasswordPolicyData = {
      ...policy,
      expiryDays: expiryEnabled ? expiryDaysInput : null,
    }

    try {
      const res = await fetch(`/api/org/${slug}/admin/security/password-policy`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        const updated = await res.json()
        setPolicy({
          minLength: updated.minLength,
          requireUppercase: updated.requireUppercase,
          requireLowercase: updated.requireLowercase,
          requireNumbers: updated.requireNumbers,
          requireSpecialChars: updated.requireSpecialChars,
          expiryDays: updated.expiryDays,
        })
        toast.success("Password policy saved. Changes apply on next user login.")
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to save password policy")
      }
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }, [slug, policy, expiryEnabled, expiryDaysInput])

  // Force reset all users
  const handleForceReset = React.useCallback(async () => {
    setForceResetting(true)

    try {
      const res = await fetch(`/api/org/${slug}/admin/security/force-reset`, {
        method: "POST",
        headers: getAuthHeaders(),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Password reset forced for ${data.count} user${data.count !== 1 ? "s" : ""}`)
        setShowForceResetDialog(false)
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to force password reset")
      }
    } catch {
      toast.error("Network error. Please try again.")
    } finally {
      setForceResetting(false)
    }
  }, [slug])

  if (loading) {
    return (
      <div className="flex flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border px-6">
          <SidebarTrigger />
          <h1 className="text-lg font-semibold">Password Policy</h1>
        </header>
        <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-4 w-96" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center gap-3 border-b border-border px-6">
        <SidebarTrigger />
        <Shield className="h-5 w-5 text-muted-foreground" />
        <h1 className="text-lg font-semibold">Password Policy</h1>
      </header>

      <div className="mx-auto w-full max-w-3xl space-y-6 p-6">
        {/* Password Policy Card */}
        <Card>
          <CardHeader>
            <CardTitle>Password Requirements</CardTitle>
            <CardDescription>
              Configure password requirements for your organization.
              Changes apply to users on their next login.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Minimum Length */}
            <div className="space-y-2">
              <Label htmlFor="minLength">Minimum password length</Label>
              <Input
                id="minLength"
                type="number"
                min={8}
                max={128}
                value={policy.minLength}
                onChange={(e) =>
                  setPolicy((prev) => ({
                    ...prev,
                    minLength: Math.max(8, Math.min(128, parseInt(e.target.value) || 8)),
                  }))
                }
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">
                Between 8 and 128 characters
              </p>
            </div>

            {/* Complexity Requirements */}
            <div className="space-y-4">
              <Label className="text-sm font-medium">Complexity requirements</Label>

              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <Label htmlFor="requireUppercase" className="cursor-pointer text-sm">
                  Require uppercase letter (A-Z)
                </Label>
                <Switch
                  id="requireUppercase"
                  checked={policy.requireUppercase}
                  onCheckedChange={(checked) =>
                    setPolicy((prev) => ({ ...prev, requireUppercase: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <Label htmlFor="requireLowercase" className="cursor-pointer text-sm">
                  Require lowercase letter (a-z)
                </Label>
                <Switch
                  id="requireLowercase"
                  checked={policy.requireLowercase}
                  onCheckedChange={(checked) =>
                    setPolicy((prev) => ({ ...prev, requireLowercase: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <Label htmlFor="requireNumbers" className="cursor-pointer text-sm">
                  Require number (0-9)
                </Label>
                <Switch
                  id="requireNumbers"
                  checked={policy.requireNumbers}
                  onCheckedChange={(checked) =>
                    setPolicy((prev) => ({ ...prev, requireNumbers: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <Label htmlFor="requireSpecialChars" className="cursor-pointer text-sm">
                  Require special character (!@#$%...)
                </Label>
                <Switch
                  id="requireSpecialChars"
                  checked={policy.requireSpecialChars}
                  onCheckedChange={(checked) =>
                    setPolicy((prev) => ({ ...prev, requireSpecialChars: checked }))
                  }
                />
              </div>
            </div>

            {/* Password Expiry */}
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-lg border border-border px-4 py-3">
                <Label htmlFor="expiryToggle" className="cursor-pointer text-sm">
                  Enable password expiry
                </Label>
                <Switch
                  id="expiryToggle"
                  checked={expiryEnabled}
                  onCheckedChange={(checked) => {
                    setExpiryEnabled(checked)
                    if (!checked) {
                      setExpiryDaysInput(90)
                    }
                  }}
                />
              </div>

              {expiryEnabled && (
                <div className="ml-4 space-y-2">
                  <Label htmlFor="expiryDays">Expire after (days)</Label>
                  <Input
                    id="expiryDays"
                    type="number"
                    min={1}
                    max={365}
                    value={expiryDaysInput}
                    onChange={(e) =>
                      setExpiryDaysInput(
                        Math.max(1, Math.min(365, parseInt(e.target.value) || 90))
                      )
                    }
                    className="w-32"
                  />
                  <p className="text-xs text-muted-foreground">
                    Users will be required to change their password after this many days (1-365)
                  </p>
                </div>
              )}
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {saving ? "Saving..." : "Save Policy"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Force Password Reset Card */}
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Force Password Reset
            </CardTitle>
            <CardDescription>
              Force all users in your organization to change their password on next login.
              This does not affect your own account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="destructive"
              onClick={() => setShowForceResetDialog(true)}
            >
              Force Reset All Users
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        open={showForceResetDialog}
        onOpenChange={setShowForceResetDialog}
        title="Force Password Reset?"
        description="Are you sure? All users except you will be required to change their password on their next login. This action cannot be undone."
        confirmLabel="Force Reset"
        variant="destructive"
        onConfirm={handleForceReset}
        loading={forceResetting}
      />
    </div>
  )
}
