"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Shield, ArrowRight, Check } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

const AUTH_SESSION_KEY = "llmatscale_auth_session"
const AUTH_TOKEN_KEY = "llmatscale_auth_token"

/**
 * Super Admin Login page.
 *
 * Route: /admin/login (dev) or admin.llmatscale.ai/login (prod)
 *
 * Renders a login form styled for Super Admin.
 * On successful login, stores token and redirects to /admin.
 * Uses existing auth API (POST /api/auth/login) without org context.
 * Visually distinct from org login: shows "LLMatscale.ai Platform Administration" branding.
 */
export default function SuperAdminLoginPage() {
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
          router.replace("/admin")
        } else {
          window.localStorage.removeItem(AUTH_SESSION_KEY)
          window.localStorage.removeItem(AUTH_TOKEN_KEY)
        }
      } catch {
        window.localStorage.removeItem(AUTH_SESSION_KEY)
        window.localStorage.removeItem(AUTH_TOKEN_KEY)
      }
    }
  }, [router])

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
        })
      )

      setLoginSuccess(true)
      setTimeout(() => {
        router.push("/admin")
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-[420px]">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-7 w-7 text-primary" />
            </div>
          </div>
          <Image
            src="/logos/llmatscale-logo.png"
            alt="LLMatscale.ai"
            width={180}
            height={50}
            className="mx-auto mb-3 h-[42px] w-auto object-contain"
            priority
            unoptimized
          />
          <p className="text-xs font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Platform Administration
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-8">
          <h2 className="mb-1 text-lg font-semibold text-foreground">
            Admin Sign In
          </h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Access the platform administration panel.
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
                placeholder="admin@llmatscale.ai"
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
        <p className="mt-6 text-center text-[11px] text-muted-foreground/50">
          &copy; 2026 LLM at Scale.AI. All Rights Reserved.
          <br />
          Confidential and Proprietary Information.
        </p>
      </div>
    </div>
  )
}
