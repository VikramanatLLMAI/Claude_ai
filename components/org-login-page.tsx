"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"
import { ArrowRight, Check } from "lucide-react"

const AUTH_SESSION_KEY = "llmatscale_auth_session"
const AUTH_TOKEN_KEY = "llmatscale_auth_token"

interface OrgLoginPageProps {
  org: {
    id: string
    name: string
    slug: string
    logoBase64: string | null
    logoDisplayMode: string
  }
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
 * OrgLoginPage - Organization-branded login component.
 *
 * Displays:
 * - Logo area based on logoDisplayMode (PLATFORM_AND_ORG or ORG_ONLY)
 * - Org name prominently displayed
 * - Email and password login form
 * - On success: stores token and redirects to /org/{slug}/chat
 */
export function OrgLoginPage({ org }: OrgLoginPageProps) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [loginSuccess, setLoginSuccess] = React.useState(false)

  // Auto-redirect if already authenticated
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const sessionData = window.localStorage.getItem(AUTH_SESSION_KEY)
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)

    if (sessionData && token) {
      try {
        const session = JSON.parse(sessionData)
        if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
          router.replace(`/org/${org.slug}/chat`)
        } else {
          window.localStorage.removeItem(AUTH_SESSION_KEY)
          window.localStorage.removeItem(AUTH_TOKEN_KEY)
        }
      } catch {
        window.localStorage.removeItem(AUTH_SESSION_KEY)
        window.localStorage.removeItem(AUTH_TOKEN_KEY)
      }
    }
  }, [router, org.slug])

  const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)
    const email = String(formData.get("email") || "").trim().toLowerCase()
    const password = String(formData.get("password") || "")

    if (!email || !password) {
      setError("Please enter your email and password.")
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Invalid email or password.")
        setIsSubmitting(false)
        return
      }

      // Store session
      window.localStorage.setItem(AUTH_TOKEN_KEY, data.token)
      window.localStorage.setItem(
        AUTH_SESSION_KEY,
        JSON.stringify({
          user: data.user,
          signedInAt: new Date().toISOString(),
          expiresAt: data.expiresAt,
          ...(data.organization ? { organization: data.organization } : {}),
        })
      )

      // Check if forced password change is required
      if (data.forcePasswordChange) {
        setLoginSuccess(true)
        setTimeout(() => {
          router.push(`/org/${org.slug}/force-password-change?reason=${data.reason || 'admin_forced'}`)
        }, 400)
        return
      }

      setLoginSuccess(true)
      setTimeout(() => {
        router.push(`/org/${org.slug}/chat`)
      }, 400)
    } catch (err) {
      console.error("Login error:", err)
      setError("Failed to sign in. Please try again.")
      setIsSubmitting(false)
    }
  }

  const getButtonContent = () => {
    if (loginSuccess) {
      return (
        <>
          <Check className="mr-2 size-4" />
          Success
        </>
      )
    }
    if (isSubmitting) {
      return "Signing in..."
    }
    return (
      <>
        Sign in to {org.name}
        <ArrowRight className="ml-2 size-4" />
      </>
    )
  }

  const initials = getOrgInitials(org.name)

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[420px]">
        {/* Logo Area */}
        <div className="mb-8 text-center">
          {org.logoDisplayMode === "PLATFORM_AND_ORG" ? (
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
              {org.logoBase64 ? (
                <img
                  src={org.logoBase64}
                  alt={`${org.name} logo`}
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
              {org.logoBase64 ? (
                <img
                  src={org.logoBase64}
                  alt={`${org.name} logo`}
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
          <h1 className="text-xl font-bold text-foreground">{org.name}</h1>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-border bg-card p-8">
          <h2 className="mb-1 text-lg font-semibold text-foreground">
            Sign in
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Enter your credentials to access {org.name}.
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

          <form onSubmit={handleSignIn} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Email address
              </label>
              <Input
                name="email"
                type="email"
                placeholder="name@company.com"
                autoComplete="email"
                required
                className="h-11 rounded-lg border-border bg-muted/30 transition-colors focus:bg-background"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                name="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                required
                className="h-11 rounded-lg border-border bg-muted/30 transition-colors focus:bg-background"
              />
            </div>
            <Button
              type="submit"
              disabled={isSubmitting || loginSuccess}
              className={cn(
                "h-12 w-full rounded-lg text-sm font-semibold tracking-wide shadow-md shadow-primary/15 transition-[box-shadow,colors] hover:shadow-lg hover:shadow-primary/20",
                loginSuccess &&
                  "bg-green-600 hover:bg-green-600 shadow-green-600/20"
              )}
            >
              {getButtonContent()}
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Not a member?{" "}
          <span className="text-foreground/70">
            Contact your organization admin.
          </span>
        </p>

        {/* Copyright */}
        <p className="mt-6 text-center text-[11px] text-muted-foreground/50">
          Powered by{" "}
          <Link href="/" className="hover:text-muted-foreground transition-colors">
            LLMatscale.ai
          </Link>
        </p>
      </div>
    </div>
  )
}
