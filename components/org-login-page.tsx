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
    tagline: string | null
    welcomeMessage: string | null
    activeTheme: string | null
  }
}

/**
 * Get initials from org name for logo placeholder.
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
 * Production-grade UI with:
 * - Two-column layout on desktop (branding left, form right), single column on mobile
 * - Org logo based on logoDisplayMode
 * - Tagline and welcome message from OrgSettings
 * - Theme application via data-theme attribute
 * - shadcn Input/Button/Label components
 */
export function OrgLoginPage({ org }: OrgLoginPageProps) {
  const router = useRouter()
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [loginSuccess, setLoginSuccess] = React.useState(false)

  // Apply org theme on mount, remove on unmount
  React.useEffect(() => {
    if (org.activeTheme) {
      document.documentElement.setAttribute("data-theme", org.activeTheme)
    }
    return () => {
      document.documentElement.removeAttribute("data-theme")
    }
  }, [org.activeTheme])

  // Auto-redirect if already authenticated
  React.useEffect(() => {
    if (typeof window === "undefined") return
    const sessionData = window.localStorage.getItem(AUTH_SESSION_KEY)
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)

    if (sessionData && token) {
      try {
        const session = JSON.parse(sessionData)
        if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
          // Super Admin sessions must NOT be auto-redirected into org chat.
          if (session.isSuperAdmin === true) return
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
        body: JSON.stringify({ email, password, slug: org.slug }),
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
        Sign in
        <ArrowRight className="ml-2 size-4" />
      </>
    )
  }

  const initials = getOrgInitials(org.name)

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-[880px]">
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2">
            {/* Branding Column (Left) */}
            <div className="flex flex-col items-center justify-center bg-muted/30 p-8 md:p-12">
              {/* Logo */}
              <div className="mb-6">
                {org.logoDisplayMode === "PLATFORM_AND_ORG" ? (
                  <div className="flex items-center justify-center gap-4">
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
                  <div className="flex justify-center">
                    {org.logoBase64 ? (
                      <img
                        src={org.logoBase64}
                        alt={`${org.name} logo`}
                        className="h-[56px] w-auto object-contain"
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-3xl font-bold text-primary">
                        {initials}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Org Name */}
              <h1 className="mb-3 text-center text-2xl font-bold text-foreground">
                {org.name}
              </h1>

              {/* Tagline */}
              {org.tagline && (
                <p className="mb-2 text-center text-sm font-medium text-foreground/80">
                  {org.tagline}
                </p>
              )}

              {/* Welcome message */}
              {org.welcomeMessage && (
                <p className="text-center text-sm text-muted-foreground max-w-[280px]">
                  {org.welcomeMessage}
                </p>
              )}

              {/* Fallback if no tagline or welcome message */}
              {!org.tagline && !org.welcomeMessage && (
                <p className="text-center text-sm text-muted-foreground">
                  Sign in to access your AI workspace
                </p>
              )}
            </div>

            {/* Form Column (Right) */}
            <div className="p-8 md:p-12">
              <h2 className="mb-1 text-lg font-semibold text-foreground">
                Sign in
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Enter your credentials to continue.
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

              {/* Footer */}
              <p className="mt-6 text-center text-sm text-muted-foreground">
                Not a member?{" "}
                <span className="text-foreground/70">
                  Contact your organization admin.
                </span>
              </p>
            </div>
          </div>
        </div>

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
