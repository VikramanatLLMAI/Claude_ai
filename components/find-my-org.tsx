"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"
import {
  ArrowRight,
  Check,
  Search,
  Building2,
  Shield,
  Zap,
} from "lucide-react"

const AUTH_SESSION_KEY = "llmatscale_auth_session"
const AUTH_TOKEN_KEY = "llmatscale_auth_token"

/**
 * FindMyOrg - "Find My Organization" component.
 *
 * Slack-like "find your workspace" flow for the bare domain.
 * User enters email -> system looks up org -> redirects to org login page.
 *
 * Behavior:
 * - If valid session exists: auto-redirect to user's org chat or admin panel
 * - If no session: show email input to find org
 * - On submit: POST /api/auth/find-org -> redirect based on response
 * - Super Admin email -> redirect to /admin/login
 * - Org user email -> redirect to /org/{slug}/login
 * - Unknown email -> generic "not found" message (no info leakage)
 */
export function FindMyOrg() {
  const router = useRouter()
  const [email, setEmail] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [redirecting, setRedirecting] = React.useState(false)
  const [isCheckingSession, setIsCheckingSession] = React.useState(true)

  // Check for existing valid session on mount
  React.useEffect(() => {
    if (typeof window === "undefined") return

    const sessionData = window.localStorage.getItem(AUTH_SESSION_KEY)
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)

    if (sessionData && token) {
      try {
        const session = JSON.parse(sessionData)
        if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
          // Valid session exists - verify token with server and redirect
          const localOrgSlug = session.organization?.slug ?? null
          fetch("/api/auth/me", {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((res) => {
              if (res.ok) return res.json()
              throw new Error("Invalid session")
            })
            .then((data) => {
              if (data.user?.isSuperAdmin) {
                router.replace("/admin")
              } else {
                // Use org slug from localStorage session (stored by org-login-page on login)
                if (localOrgSlug) {
                  router.replace(`/org/${localOrgSlug}/chat`)
                } else {
                  // No org context in session — clear stale session and show the form
                  window.localStorage.removeItem(AUTH_SESSION_KEY)
                  window.localStorage.removeItem(AUTH_TOKEN_KEY)
                  setIsCheckingSession(false)
                }
              }
            })
            .catch(() => {
              // Invalid token - clear and show form
              window.localStorage.removeItem(AUTH_SESSION_KEY)
              window.localStorage.removeItem(AUTH_TOKEN_KEY)
              setIsCheckingSession(false)
            })
          return
        } else {
          // Session expired
          window.localStorage.removeItem(AUTH_SESSION_KEY)
          window.localStorage.removeItem(AUTH_TOKEN_KEY)
        }
      } catch {
        window.localStorage.removeItem(AUTH_SESSION_KEY)
        window.localStorage.removeItem(AUTH_TOKEN_KEY)
      }
    }
    setIsCheckingSession(false)
  }, [router])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      setError("Please enter your email address.")
      setIsSubmitting(false)
      return
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError("Please enter a valid email address.")
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch("/api/auth/find-org", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || "Something went wrong. Please try again.")
        setIsSubmitting(false)
        return
      }

      if (data.type === "super_admin") {
        setRedirecting(true)
        router.push("/admin/login")
      } else if (data.type === "org" && data.slug) {
        setRedirecting(true)
        router.push(`/org/${data.slug}/login`)
      } else {
        // not_found - generic message, no info leakage
        setError(
          "We couldn't find an organization associated with this email. Please contact your administrator."
        )
        setIsSubmitting(false)
      }
    } catch (err) {
      console.error("Find org error:", err)
      setError("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  const getButtonContent = () => {
    if (redirecting) {
      return (
        <>
          <Check className="mr-2 size-4" />
          Redirecting...
        </>
      )
    }
    if (isSubmitting) {
      return "Finding your organization..."
    }
    return (
      <>
        Continue
        <ArrowRight className="ml-2 size-4" />
      </>
    )
  }

  // Show loading state while checking session
  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="relative flex h-screen overflow-hidden bg-background">
      {/* Left Section - Branding */}
      <div className="hidden w-[55%] flex-col justify-between border-r border-border bg-muted/40 lg:flex">
        {/* Subtle dot pattern */}
        <div
          className="pointer-events-none absolute inset-0 w-[55%] opacity-[0.04]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        <div className="relative z-10 flex h-full flex-col justify-between p-14">
          {/* Logo */}
          <div>
            <Image
              src="/logos/llmatscale-logo.png"
              alt="LLMatscale.ai"
              width={220}
              height={70}
              className="h-[60px] w-auto object-contain"
              priority
              unoptimized
            />
            <div className="mt-3 flex items-center gap-3">
              <div className="h-px w-8 bg-primary/60" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Intelligent Enterprise Platform
              </p>
            </div>
          </div>

          {/* Main Content */}
          <div className="max-w-lg">
            <h2 className="text-[2.75rem] font-semibold leading-[1.15] text-foreground">
              AI-powered insights
              <br />
              <span className="text-primary">for your team.</span>
            </h2>

            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Connect your organization to powerful AI capabilities with
              role-based access, custom prompts, and enterprise-grade security.
            </p>

            {/* Features */}
            <motion.div
              className="mt-10 space-y-4"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.1 } },
              }}
            >
              {[
                {
                  icon: Building2,
                  text: "Multi-tenant organization management",
                },
                { icon: Shield, text: "Role-based access control for AI models" },
                { icon: Zap, text: "Custom system prompts per organization" },
              ].map(({ icon: Icon, text }) => (
                <motion.div
                  key={text}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { type: "spring", stiffness: 300, damping: 30 },
                    },
                  }}
                  className="flex items-center gap-4"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/[0.07] ring-1 ring-primary/10">
                    <Icon className="size-[18px] text-primary" />
                  </div>
                  <span className="text-sm text-foreground/70">{text}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* Footer badges */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 rounded-full bg-background/80 px-4 py-2 ring-1 ring-border transition-transform hover:scale-[1.02]">
              <Shield className="size-3.5 text-primary/80" />
              <span className="text-xs font-medium text-muted-foreground">
                SOC 2 Compliant
              </span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-background/80 px-4 py-2 ring-1 ring-border transition-transform hover:scale-[1.02]">
              <Zap className="size-3.5 text-primary/80" />
              <span className="text-xs font-medium text-muted-foreground">
                Enterprise Ready
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Section - Find Org Form */}
      <div className="flex w-full flex-col lg:w-[45%]">
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-16">
          {/* Mobile Logo */}
          <div className="mb-10 w-full max-w-[400px] lg:hidden">
            <h1 className="text-4xl font-bold tracking-tight text-foreground">
              LLMatscale.ai
            </h1>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
              Intelligent Enterprise Platform
            </p>
          </div>

          <div className="w-full max-w-[400px]">
            {/* Header */}
            <div className="mb-8">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Search className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">
                Sign in to your organization
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your email to find your organization.
              </p>
            </div>

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

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Work email
                </label>
                <Input
                  name="email"
                  type="email"
                  placeholder="name@company.com"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-11 rounded-lg border-border bg-muted/30 transition-colors focus:bg-background"
                />
              </div>
              <Button
                type="submit"
                disabled={isSubmitting || redirecting}
                className={cn(
                  "h-12 w-full rounded-lg text-sm font-semibold tracking-wide shadow-md shadow-primary/15 transition-[box-shadow,colors] hover:shadow-lg hover:shadow-primary/20",
                  redirecting &&
                    "bg-green-600 hover:bg-green-600 shadow-green-600/20"
                )}
              >
                {getButtonContent()}
              </Button>
            </form>

            {/* Footer link */}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Looking for something else?{" "}
              <a
                href="mailto:support@llmatscale.ai"
                className="font-semibold text-primary transition-colors hover:text-primary/80"
              >
                Contact support
              </a>
            </p>

            {/* Copyright */}
            <p className="mt-8 text-center text-[11px] text-muted-foreground/50">
              &copy; 2026 LLM at Scale.AI. All Rights Reserved.
              <br />
              Confidential and Proprietary Information. Version 1.0
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
