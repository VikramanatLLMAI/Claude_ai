"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Catch-all page for unknown /super-admin/* paths.
 *
 * Purpose: Ensures the super-admin layout loads for any /super-admin/* URL that does
 * not have a dedicated page (e.g., /super-admin/dashboard). Without this page,
 * Next.js skips the super-admin layout and renders the root not-found.tsx instead,
 * breaking the org-user redirect guard in super-admin layout's useEffect.
 *
 * - Super Admin: redirected to /super-admin/models (same as root /super-admin page)
 * - Org users: handled by super-admin layout's useEffect (redirects to /org/{slug}/chat)
 * - Unauthenticated: handled by super-admin layout's useEffect (redirects to /super-admin/login)
 */
export default function SuperAdminCatchAllPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/super-admin/models")
  }, [router])

  return null
}
