"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Shield, BarChart3, Building2, Users } from "lucide-react"
import { PageLoadingSkeleton } from "@/components/ui/skeleton-loaders"

const AUTH_SESSION_KEY = "llmatscale_auth_session"
const AUTH_TOKEN_KEY = "llmatscale_auth_token"

function hasValidSession() {
  if (typeof window === "undefined") return false
  const session = window.localStorage.getItem(AUTH_SESSION_KEY)
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
  return !!(session && token)
}

/**
 * Super Admin Dashboard placeholder page.
 *
 * Route: /admin (dev) or admin.llmatscale.ai (prod)
 *
 * Checks auth client-side (localStorage token).
 * Redirects to /admin/login if no token.
 * Full Super Admin panel will be built in Phase 5.
 */
export default function SuperAdminDashboardPage() {
  const router = useRouter()
  const session = hasValidSession()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!hasValidSession()) {
      router.replace("/admin/login")
    }
  }, [router])

  if (!session) {
    return <PageLoadingSkeleton />
  }

  const sections = [
    {
      icon: Building2,
      title: "Organizations",
      description: "Manage organizations, suspensions, and settings",
    },
    {
      icon: Users,
      title: "Super Admins",
      description: "Manage platform administrator accounts",
    },
    {
      icon: BarChart3,
      title: "Platform Analytics",
      description: "Usage statistics, token consumption, and trends",
    },
  ]

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto max-w-2xl px-6 text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          LLMatscale.ai Platform Administration
        </h1>
        <p className="mb-1 text-sm text-muted-foreground">
          Super Admin Dashboard
        </p>
        <p className="mb-10 text-xs text-muted-foreground/70">
          Coming in Phase 5
        </p>

        <div className="grid gap-4 sm:grid-cols-3">
          {sections.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-lg border border-border bg-card p-6 text-left"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/[0.07]">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-foreground">
                {title}
              </h3>
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
