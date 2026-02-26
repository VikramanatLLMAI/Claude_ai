"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import { FullChatApp } from "@/components/full-chat-app"
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
 * Org-scoped chat page.
 *
 * Thin wrapper around the existing FullChatApp component.
 * Passes org context (slug) via URL params.
 * Session validation happens client-side (check localStorage token)
 * and server-side (API calls use requireOrgAuth).
 *
 * For Phase 1, FullChatApp's internal behavior is unchanged -- it will
 * be enhanced to read org context when making API calls in later phases.
 */
export default function OrgChatPage() {
  const router = useRouter()
  const params = useParams<{ slug: string }>()
  const session = hasValidSession()

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!hasValidSession()) {
      // Redirect to org login if no session
      router.replace(`/org/${params.slug}/login`)
    }
  }, [router, params.slug])

  if (!session) {
    return <PageLoadingSkeleton />
  }

  // FullChatApp's SidebarProvider already has h-svh - no extra wrapper needed
  return <FullChatApp />
}
