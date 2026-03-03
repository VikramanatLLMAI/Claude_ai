"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Catch-all page for unknown /admin/* paths.
 *
 * Purpose: Ensures the admin layout loads for any /admin/* URL that does
 * not have a dedicated page (e.g., /admin/dashboard). Without this page,
 * Next.js skips the admin layout and renders the root not-found.tsx instead,
 * breaking the org-user redirect guard in admin layout's useEffect.
 *
 * - Super Admin: redirected to /admin/models (same as root /admin page)
 * - Org users: handled by admin layout's useEffect (redirects to /org/{slug}/chat)
 * - Unauthenticated: handled by admin layout's useEffect (redirects to /admin/login)
 */
export default function AdminCatchAllPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/admin/models")
  }, [router])

  return null
}
