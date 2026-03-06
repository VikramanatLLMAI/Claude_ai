"use client"

import * as React from "react"
import { useEffect, useState, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { PageLoadingSkeleton } from "@/components/ui/skeleton-loaders"
import { toast } from "@/components/ui/toast"

const AUTH_SESSION_KEY = "llmatscale_auth_session"
const AUTH_TOKEN_KEY = "llmatscale_auth_token"

function hasValidSession(): boolean {
  if (typeof window === "undefined") return false
  const session = window.localStorage.getItem(AUTH_SESSION_KEY)
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
  if (!session || !token) return false
  try {
    const parsed = JSON.parse(session)
    if (parsed.expiresAt && new Date(parsed.expiresAt) <= new Date()) {
      window.localStorage.removeItem(AUTH_SESSION_KEY)
      window.localStorage.removeItem(AUTH_TOKEN_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

function getOrgNameFromSession(slug: string): string {
  if (typeof window === "undefined") return ""
  try {
    const sessionData = localStorage.getItem(AUTH_SESSION_KEY)
    if (sessionData) {
      const session = JSON.parse(sessionData)
      if (session.organization?.slug === slug) {
        return session.organization.name || ""
      }
    }
  } catch {
    // Ignore parse errors
  }
  return ""
}

export default function OrgAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const params = useParams<{ slug: string }>()
  const slug = params.slug

  // Compute initial org name synchronously from session (no setState in effect)
  const initialOrgName = useMemo(() => getOrgNameFromSession(slug), [slug])
  const [orgName, setOrgName] = useState<string>(initialOrgName)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!hasValidSession()) {
      router.replace(`/org/${slug}/login`)
      return
    }

    const token = localStorage.getItem(AUTH_TOKEN_KEY)
    if (!token) {
      router.replace(`/org/${slug}/login`)
      return
    }

    let cancelled = false
    async function verifyAdmin() {
      try {
        // Call org-scoped admin endpoint -- requireOrgAdmin will verify admin access
        const res = await fetch(`/api/org/${slug}/admin/instructions`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 401) {
          if (!cancelled) router.replace(`/org/${slug}/login`)
          return
        }
        if (res.status === 403) {
          // Not an admin, show toast and redirect to chat
          if (!cancelled) {
            toast.error("Access denied. You don't have admin privileges for this organization.")
            router.replace(`/org/${slug}/chat`)
          }
          return
        }
        if (!res.ok) {
          if (!cancelled) router.replace(`/org/${slug}/login`)
          return
        }

        // Admin access confirmed
        const data = await res.json()
        if (!cancelled) {
          if (data.orgName) {
            setOrgName(data.orgName)
          }
          setIsAdmin(true)
        }
      } catch {
        if (!cancelled) router.replace(`/org/${slug}/login`)
      }
    }

    verifyAdmin()
    return () => {
      cancelled = true
    }
  }, [router, slug])

  // For SSR or before hydration, show loading
  if (typeof window === "undefined") {
    return <PageLoadingSkeleton />
  }

  // Still checking auth
  if (isAdmin === null) {
    return <PageLoadingSkeleton />
  }

  // Not admin, will redirect
  if (!isAdmin) {
    return <PageLoadingSkeleton />
  }

  return (
    <SidebarProvider>
      <AdminSidebar variant="org-admin" orgSlug={slug} orgName={orgName} />
      <SidebarInset>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
