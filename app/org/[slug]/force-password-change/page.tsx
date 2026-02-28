"use client"

import * as React from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Lock, Check, X, Loader2, Eye, EyeOff } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/toast"

const AUTH_TOKEN_KEY = "llmatscale_auth_token"

interface PolicyRequirement {
  label: string
  met: boolean
}

/**
 * Forced Password Change Page
 *
 * Route: /org/[slug]/force-password-change
 *
 * Shown when a user's password has expired or an admin has forced a reset.
 * Validates the new password against the org's current password policy in real-time.
 * On success, clears the forcePasswordChange flag and redirects to chat.
 *
 * Covers: OPWD-04, OPWD-05
 */
export default function ForcePasswordChangePage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()
  const searchParams = useSearchParams()
  const slug = params.slug
  const reason = searchParams.get("reason") || "admin_forced"

  // Form state
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Visibility toggles
  const [showCurrent, setShowCurrent] = React.useState(false)
  const [showNew, setShowNew] = React.useState(false)
  const [showConfirm, setShowConfirm] = React.useState(false)

  // Password policy
  const [policy, setPolicy] = React.useState<{
    minLength: number
    requireUppercase: boolean
    requireLowercase: boolean
    requireNumbers: boolean
    requireSpecialChars: boolean
  } | null>(null)

  // Fetch policy on mount
  React.useEffect(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) {
      router.replace(`/org/${slug}/login`)
      return
    }

    // Fetch policy -- this endpoint may fail with FORCE_PASSWORD_CHANGE
    // since the user needs to change their password. We try a direct
    // unauthenticated-style fetch or handle the 403 gracefully.
    async function fetchPolicy() {
      try {
        const res = await fetch(`/api/org/${slug}/admin/security/password-policy`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          setPolicy(await res.json())
        } else {
          // If 403 FORCE_PASSWORD_CHANGE, use defaults
          // The user is on this page already, so we just show default requirements
          setPolicy({
            minLength: 8,
            requireUppercase: false,
            requireLowercase: false,
            requireNumbers: false,
            requireSpecialChars: false,
          })
        }
      } catch {
        setPolicy({
          minLength: 8,
          requireUppercase: false,
          requireLowercase: false,
          requireNumbers: false,
          requireSpecialChars: false,
        })
      }
    }

    fetchPolicy()
  }, [slug, router])

  // Compute password requirements checklist
  const requirements = React.useMemo((): PolicyRequirement[] => {
    if (!policy) return []

    const reqs: PolicyRequirement[] = [
      {
        label: `At least ${policy.minLength} characters`,
        met: newPassword.length >= policy.minLength,
      },
    ]

    if (policy.requireUppercase) {
      reqs.push({
        label: "At least one uppercase letter (A-Z)",
        met: /[A-Z]/.test(newPassword),
      })
    }

    if (policy.requireLowercase) {
      reqs.push({
        label: "At least one lowercase letter (a-z)",
        met: /[a-z]/.test(newPassword),
      })
    }

    if (policy.requireNumbers) {
      reqs.push({
        label: "At least one number (0-9)",
        met: /[0-9]/.test(newPassword),
      })
    }

    if (policy.requireSpecialChars) {
      reqs.push({
        label: "At least one special character (!@#$%...)",
        met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(newPassword),
      })
    }

    return reqs
  }, [newPassword, policy])

  const allRequirementsMet = requirements.length > 0 && requirements.every((r) => r.met)
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword
  const canSubmit = currentPassword.length > 0 && allRequirementsMet && passwordsMatch && !submitting

  // Submit handler
  const handleSubmit = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      setError(null)

      if (!canSubmit) return

      setSubmitting(true)

      try {
        const token = localStorage.getItem(AUTH_TOKEN_KEY)
        const res = await fetch("/api/auth/change-password", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ currentPassword, newPassword }),
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || "Failed to change password")
          setSubmitting(false)
          return
        }

        toast.success("Password changed successfully")
        // Redirect to chat after a short delay
        setTimeout(() => {
          router.push(`/org/${slug}/chat`)
        }, 500)
      } catch {
        setError("Network error. Please try again.")
        setSubmitting(false)
      }
    },
    [canSubmit, currentPassword, newPassword, slug, router]
  )

  const reasonMessage =
    reason === "expired"
      ? "Your password has expired. Please set a new password."
      : "Your administrator has required you to change your password."

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Lock className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">Change Your Password</CardTitle>
          <CardDescription>{reasonMessage}</CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Current Password */}
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showCurrent ? "text" : "password"}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrent(!showCurrent)}
                  tabIndex={-1}
                >
                  {showCurrent ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showNew ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNew(!showNew)}
                  tabIndex={-1}
                >
                  {showNew ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Password Requirements Checklist */}
            {newPassword.length > 0 && requirements.length > 0 && (
              <div className="space-y-1.5 rounded-lg border border-border px-3 py-2.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Password requirements
                </p>
                {requirements.map((req) => (
                  <div
                    key={req.label}
                    className="flex items-center gap-2 text-sm"
                  >
                    {req.met ? (
                      <Check className="h-3.5 w-3.5 text-green-600" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span
                      className={
                        req.met ? "text-green-700 dark:text-green-400" : "text-muted-foreground"
                      }
                    >
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Confirm Password */}
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm new password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirm(!showConfirm)}
                  tabIndex={-1}
                >
                  {showConfirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {confirmPassword.length > 0 && !passwordsMatch && (
                <p className="text-xs text-destructive">
                  Passwords do not match
                </p>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={!canSubmit}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {submitting ? "Changing Password..." : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
