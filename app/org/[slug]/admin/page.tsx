"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { Settings, ArrowRight } from "lucide-react"

const AUTH_SESSION_KEY = "llmatscale_auth_session"
const AUTH_TOKEN_KEY = "llmatscale_auth_token"

function hasValidSession() {
  if (typeof window === "undefined") return false
  const session = window.localStorage.getItem(AUTH_SESSION_KEY)
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
  return !!(session && token)
}

/**
 * Org Admin Dashboard placeholder page.
 *
 * This route exists at /org/[slug]/admin (dev) or {slug}.llmatscale.ai/admin (prod).
 * The full Org Admin panel will be built in Phase 6.
 * Protected by requireOrgAdmin middleware in Phase 6.
 *
 * ROUTE-03: Org Admin panel route exists at correct path.
 */
export default function OrgAdminPage() {
  const router = useRouter()
  const params = useParams<{ slug: string }>()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!hasValidSession()) {
      router.replace(`/org/${params.slug}/login`)
    }
  }, [router, params.slug])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="mx-auto max-w-lg text-center">
        <div className="mb-6 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Settings className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          Organization Admin Dashboard
        </h1>
        <p className="mb-1 text-sm text-muted-foreground">
          Manage users, roles, invitations, and organization settings.
        </p>
        <p className="mb-8 text-xs text-muted-foreground/70">
          Coming in Phase 6
        </p>
        <button
          onClick={() => router.push(`/org/${params.slug}/chat`)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-6 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Go to Chat
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
