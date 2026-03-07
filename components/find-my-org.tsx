"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"
import { ArrowRight, Check, Search } from "lucide-react"
import { getIcon } from "@/lib/icon-map"
import type { FeatureCard } from "@/lib/icon-map"

const AUTH_SESSION_KEY = "llmatscale_auth_session"
const AUTH_TOKEN_KEY = "llmatscale_auth_token"

const PLATFORM_FEATURE_CARDS: FeatureCard[] = [
  { icon: "Shield", title: "Enterprise Security", subtitle: "End-to-end encryption and data isolation" },
  { icon: "Users", title: "Team Management", subtitle: "Role-based access with granular permissions" },
  { icon: "Zap", title: "Powered by Claude", subtitle: "Latest Anthropic models with streaming" },
  { icon: "Globe", title: "Multi-Tenant", subtitle: "Isolated workspaces for every organization" },
]

/**
 * FindMyOrg - "Find My Organization" component.
 *
 * Slack-like "find your workspace" flow for the bare domain.
 * Two-column layout: platform branding (left) + email form (right).
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
                router.replace("/super-admin")
              } else {
                if (localOrgSlug) {
                  router.replace(`/org/${localOrgSlug}/chat`)
                } else {
                  window.localStorage.removeItem(AUTH_SESSION_KEY)
                  window.localStorage.removeItem(AUTH_TOKEN_KEY)
                  setIsCheckingSession(false)
                }
              }
            })
            .catch(() => {
              window.localStorage.removeItem(AUTH_SESSION_KEY)
              window.localStorage.removeItem(AUTH_TOKEN_KEY)
              setIsCheckingSession(false)
            })
          return
        } else {
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
        router.push("/super-admin/login")
      } else if (data.type === "org" && data.slug) {
        setRedirecting(true)
        router.push(`/org/${data.slug}/login`)
      } else {
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
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left Column - Platform Branding */}
      <div className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex xl:p-14">
        {/* Logo */}
        <div>
          <Image
            src="/logos/llmatscale-logo.png"
            alt="LLMatscale.ai"
            width={200}
            height={60}
            className="h-[50px] w-auto object-contain brightness-0 invert"
            priority
            unoptimized
          />
        </div>

        {/* Main Content */}
        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight xl:text-4xl">
            Enterprise AI Chat Platform
          </h2>

          <div className="mt-3">
            <span className="inline-flex items-center rounded-full bg-primary-foreground/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
              Powered by Claude
            </span>
          </div>

          <p className="mt-5 text-sm leading-relaxed text-primary-foreground/70 xl:text-base">
            Deploy intelligent AI assistants to your organization with
            enterprise-grade security, role-based access control, and complete
            data isolation.
          </p>

          {/* Feature Cards - 2x2 grid */}
          <motion.div
            className="mt-8 grid grid-cols-2 gap-3"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.08 } },
            }}
          >
            {PLATFORM_FEATURE_CARDS.map((card) => {
              const IconComponent = getIcon(card.icon)
              return (
                <motion.div
                  key={card.title}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    visible: {
                      opacity: 1,
                      y: 0,
                      transition: { type: "spring", stiffness: 300, damping: 30 },
                    },
                  }}
                  className="rounded-xl bg-primary-foreground/10 p-4 backdrop-blur-sm"
                >
                  <IconComponent className="mb-2 size-5 text-primary-foreground/80" />
                  <p className="text-sm font-medium">{card.title}</p>
                  <p className="mt-0.5 text-xs text-primary-foreground/60">{card.subtitle}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        {/* Footer */}
        <p className="text-xs text-primary-foreground/40">
          &copy; 2026 LLM at Scale.AI. All Rights Reserved.
        </p>
      </div>

      {/* Right Column - Find Org Form */}
      <div className="flex flex-col items-center justify-center bg-background px-6 py-12 lg:px-16">
        {/* Mobile Logo */}
        <div className="mb-10 w-full max-w-sm lg:hidden">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            LLMatscale.ai
          </h1>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Enterprise AI Chat Platform
          </p>
        </div>

        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-8">
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Search className="h-5 w-5 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-foreground">
              Sign in to LLMatscale.ai
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

          {/* Powered by */}
          <p className="mt-8 text-center text-[11px] text-muted-foreground/50">
            Powered by LLMatscale.ai
          </p>
        </div>
      </div>
    </div>
  )
}
