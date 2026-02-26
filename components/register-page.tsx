"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"
import { ArrowRight, Check, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react"

const AUTH_SESSION_KEY = "llmatscale_auth_session"
const AUTH_TOKEN_KEY = "llmatscale_auth_token"

interface RegisterPageProps {
  token: string
  email: string
  orgName: string
  orgSlug: string
  orgLogo: string | null
  orgLogoDisplayMode: string
  roleName: string
  passwordRequirements: string[]
}

/**
 * Get initials from org name for logo placeholder.
 * e.g., "Acme Corp" -> "AC", "SomeOrg" -> "SO"
 */
function getOrgInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

/**
 * Check if a password requirement is met based on the requirement text.
 * Matches against the requirement strings returned by getPasswordRequirements().
 */
function checkRequirement(requirement: string, password: string): boolean {
  if (!password) return false

  // Parse the requirement text to determine what to check
  const lowerReq = requirement.toLowerCase()

  if (lowerReq.startsWith("at least") && lowerReq.includes("character")) {
    // Extract the number from "At least N characters"
    const match = requirement.match(/(\d+)/)
    if (match) {
      return password.length >= parseInt(match[1], 10)
    }
  }

  if (lowerReq.includes("uppercase")) {
    return /[A-Z]/.test(password)
  }

  if (lowerReq.includes("lowercase")) {
    return /[a-z]/.test(password)
  }

  if (lowerReq.includes("number")) {
    return /\d/.test(password)
  }

  if (lowerReq.includes("special")) {
    return /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)
  }

  return false
}

/**
 * RegisterPage - Organization-branded registration component.
 *
 * Displays:
 * - Logo area based on logoDisplayMode (PLATFORM_AND_ORG or ORG_ONLY)
 * - Org name prominently displayed
 * - Invitation details (role)
 * - Registration form with name + password (email pre-filled from invitation)
 * - Password requirements with live validation
 * - On success: stores token and redirects to /org/{slug}/chat (auto-login)
 */
export function RegisterPage({
  token,
  email,
  orgName,
  orgSlug,
  orgLogo,
  orgLogoDisplayMode,
  roleName,
  passwordRequirements,
}: RegisterPageProps) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [registerSuccess, setRegisterSuccess] = React.useState(false)
  const [showPassword, setShowPassword] = React.useState(false)
  const [password, setPassword] = React.useState("")

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get("name") || "").trim()
    const pwd = String(formData.get("password") || "")

    if (!name) {
      setError("Please enter your name.")
      setIsSubmitting(false)
      return
    }

    if (!pwd) {
      setError("Please enter a password.")
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch("/api/auth/accept-invitation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, name, password: pwd }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 409) {
          setError(
            "This email is already registered in another organization. Please contact your admin."
          )
        } else if (data.details && Array.isArray(data.details)) {
          setError(data.details.join(". "))
        } else {
          setError(data.error || "Registration failed. Please try again.")
        }
        setIsSubmitting(false)
        return
      }

      // Store session (matching org-login-page.tsx convention)
      window.localStorage.setItem(AUTH_TOKEN_KEY, data.token)
      window.localStorage.setItem(
        AUTH_SESSION_KEY,
        JSON.stringify({
          user: data.user,
          signedInAt: new Date().toISOString(),
          expiresAt: data.expiresAt,
        })
      )

      setRegisterSuccess(true)
      setTimeout(() => {
        router.push(`/org/${orgSlug}/chat`)
      }, 400)
    } catch (err) {
      console.error("Registration error:", err)
      setError("Unable to connect. Please try again.")
      setIsSubmitting(false)
    }
  }

  const getButtonContent = () => {
    if (registerSuccess) {
      return (
        <>
          <Check className="mr-2 size-4" />
          Account Created
        </>
      )
    }
    if (isSubmitting) {
      return "Creating account..."
    }
    return (
      <>
        Create Account
        <ArrowRight className="ml-2 size-4" />
      </>
    )
  }

  const initials = getOrgInitials(orgName)

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[420px]">
        {/* Logo Area */}
        <div className="mb-8 text-center">
          {orgLogoDisplayMode === "PLATFORM_AND_ORG" ? (
            // Show LLMatscale.ai logo + org logo side by side
            <div className="mb-4 flex items-center justify-center gap-4">
              <Image
                src="/logos/llmatscale-logo.png"
                alt="LLMatscale.ai"
                width={140}
                height={40}
                className="h-[36px] w-auto object-contain"
                priority
                unoptimized
              />
              <div className="h-8 w-px bg-border" />
              {orgLogo ? (
                <img
                  src={orgLogo}
                  alt={`${orgName} logo`}
                  className="h-[36px] w-auto object-contain"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                  {initials}
                </div>
              )}
            </div>
          ) : (
            // ORG_ONLY: Show only org logo or org initials
            <div className="mb-4 flex justify-center">
              {orgLogo ? (
                <img
                  src={orgLogo}
                  alt={`${orgName} logo`}
                  className="h-[48px] w-auto object-contain"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                  {initials}
                </div>
              )}
            </div>
          )}

          {/* Org Name */}
          <h1 className="text-xl font-bold text-foreground">{orgName}</h1>
        </div>

        {/* Registration Card */}
        <div className="rounded-xl border border-border bg-card p-8">
          <h2 className="mb-1 text-lg font-semibold text-foreground">
            Create your account
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            You&apos;ve been invited to join{" "}
            <span className="font-medium text-foreground">{orgName}</span> as a{" "}
            <span className="font-medium text-foreground">{roleName}</span>.
          </p>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleRegister} className="space-y-5">
            {/* Email (pre-filled, read-only) */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Email address
              </label>
              <Input
                type="email"
                value={email}
                readOnly
                tabIndex={-1}
                className="h-11 rounded-lg border-border bg-muted/50 text-muted-foreground cursor-not-allowed"
              />
            </div>

            {/* Name (required, autofocus) - UATH-02 */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Full name
              </label>
              <Input
                name="name"
                type="text"
                placeholder="Enter your full name"
                autoComplete="name"
                autoFocus
                required
                maxLength={100}
                className="h-11 rounded-lg border-border bg-muted/30 transition-colors focus:bg-background"
              />
            </div>

            {/* Password (with show/hide toggle) */}
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Password
              </label>
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 rounded-lg border-border bg-muted/30 pr-10 transition-colors focus:bg-background"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>

              {/* Password Requirements - Live Validation */}
              {passwordRequirements.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {passwordRequirements.map((req) => {
                    const met = checkRequirement(req, password)
                    return (
                      <div
                        key={req}
                        className={cn(
                          "flex items-center gap-2 text-xs transition-colors",
                          password
                            ? met
                              ? "text-green-600 dark:text-green-400"
                              : "text-destructive"
                            : "text-muted-foreground"
                        )}
                      >
                        {password ? (
                          met ? (
                            <CheckCircle2 className="size-3.5 shrink-0" />
                          ) : (
                            <XCircle className="size-3.5 shrink-0" />
                          )
                        ) : (
                          <div className="size-3.5 shrink-0 rounded-full border border-muted-foreground/40" />
                        )}
                        {req}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting || registerSuccess}
              className={cn(
                "h-12 w-full rounded-lg text-sm font-semibold tracking-wide shadow-md shadow-primary/15 transition-[box-shadow,colors] hover:shadow-lg hover:shadow-primary/20",
                registerSuccess &&
                  "bg-green-600 hover:bg-green-600 shadow-green-600/20"
              )}
            >
              {getButtonContent()}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href={`/org/${orgSlug}/login`}
            className="font-medium text-primary hover:underline"
          >
            Sign in
          </Link>
        </p>

        {/* Copyright */}
        <p className="mt-6 text-center text-[11px] text-muted-foreground/50">
          Powered by{" "}
          <Link
            href="/"
            className="hover:text-muted-foreground transition-colors"
          >
            LLMatscale.ai
          </Link>
        </p>
      </div>
    </div>
  )
}
