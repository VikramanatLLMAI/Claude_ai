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
import { getIcon } from "@/lib/icon-map"
import type { FeatureCard } from "@/lib/icon-map"

const AUTH_SESSION_KEY = "llmatscale_auth_session"
const AUTH_TOKEN_KEY = "llmatscale_auth_token"

interface LoginBranding {
  loginHeadline?: string | null
  loginBadge?: string | null
  loginDescription?: string | null
  loginFeatureCards?: FeatureCard[]
}

interface OrgLoginPageProps {
  org: {
    id: string
    name: string
    slug: string
    logoBase64: string | null
    logoDisplayMode: string
    activeTheme: string | null
  }
  loginBranding: LoginBranding | null
}

const DEFAULT_FEATURE_CARDS: FeatureCard[] = [
  { icon: "Shield", title: "Secure Access", subtitle: "Enterprise-grade data protection" },
  { icon: "Zap", title: "AI Powered", subtitle: "Intelligent assistance at your fingertips" },
  { icon: "Users", title: "Team Collaboration", subtitle: "Share insights across your team" },
  { icon: "Globe", title: "Always Available", subtitle: "Access your workspace from anywhere" },
]

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
 * Two-column layout on desktop (branding left, form right), single column on mobile.
 * Left column uses LoginBranding data from the database with appropriate fallbacks.
 */
export function OrgLoginPage({ org, loginBranding }: OrgLoginPageProps) {
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

  // Resolve branding with fallbacks
  const headline = loginBranding?.loginHeadline || org.name
  const badge = loginBranding?.loginBadge || null
  const description = loginBranding?.loginDescription || "Welcome to your AI-powered workspace"
  const featureCards =
    loginBranding?.loginFeatureCards && loginBranding.loginFeatureCards.length === 4
      ? loginBranding.loginFeatureCards
      : DEFAULT_FEATURE_CARDS

  return (
    <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left Column - Org Branding */}
      <div className="hidden flex-col justify-between bg-gradient-to-br from-slate-900 to-slate-800 p-10 text-white lg:flex xl:p-14">
        {/* Logo */}
        <div>
          {org.logoDisplayMode === "PLATFORM_AND_ORG" ? (
            <div className="flex items-center gap-4">
              <Image
                src="/logos/llmatscale-logo.png"
                alt="LLMatscale.ai"
                width={140}
                height={40}
                className="h-[36px] w-auto object-contain brightness-0 invert"
                priority
                unoptimized
              />
              <div className="h-8 w-px bg-white/20" />
              {org.logoBase64 ? (
                <img
                  src={org.logoBase64}
                  alt={`${org.name} logo`}
                  className="h-[36px] w-auto object-contain"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">
                  {initials}
                </div>
              )}
            </div>
          ) : (
            <div>
              {org.logoBase64 ? (
                <img
                  src={org.logoBase64}
                  alt={`${org.name} logo`}
                  className="h-[50px] w-auto object-contain"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/10 text-xl font-bold text-white">
                  {initials}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="max-w-md">
          <h2 className="text-3xl font-bold leading-tight xl:text-4xl">
            {headline}
          </h2>

          {badge && (
            <div className="mt-3">
              <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur-sm">
                {badge}
              </span>
            </div>
          )}

          <p className="mt-5 text-sm leading-relaxed text-white/70 xl:text-base">
            {description}
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
            {featureCards.map((card) => {
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
                  className="rounded-xl bg-white/10 p-4 backdrop-blur-sm"
                >
                  <IconComponent className="mb-2 size-5 text-white/80" />
                  <p className="text-sm font-medium text-white">{card.title}</p>
                  <p className="mt-0.5 text-xs text-white/60">{card.subtitle}</p>
                </motion.div>
              )
            })}
          </motion.div>
        </div>

        {/* Footer */}
        <p className="text-xs text-white/40">
          Powered by{" "}
          <Link href="/" className="hover:text-white/60 transition-colors">
            LLMatscale.ai
          </Link>
        </p>
      </div>

      {/* Right Column - Sign In Form */}
      <div className="flex flex-col items-center justify-center bg-background px-6 py-12 lg:px-16">
        {/* Mobile Logo */}
        <div className="mb-10 w-full max-w-sm lg:hidden">
          {org.logoBase64 ? (
            <img
              src={org.logoBase64}
              alt={`${org.name} logo`}
              className="mb-2 h-[40px] w-auto object-contain"
            />
          ) : (
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              {org.name}
            </h1>
          )}
          {badge && (
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {badge}
            </p>
          )}
        </div>

        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground">
              Sign in to {org.name}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Enter your credentials to continue.
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

          {/* Powered by */}
          <p className="mt-8 text-center text-[11px] text-muted-foreground/50">
            Powered by{" "}
            <Link href="/" className="hover:text-muted-foreground transition-colors">
              LLMatscale.ai
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
