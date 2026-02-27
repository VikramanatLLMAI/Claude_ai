"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Super Admin Dashboard root page.
 *
 * Route: /admin (dev) or admin.llmatscale.ai (prod)
 *
 * Redirects to /admin/models (the only functional page in Phase 3).
 * Auth check is handled by the layout.
 */
export default function SuperAdminDashboardPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/admin/models")
  }, [router])

  return null
}
