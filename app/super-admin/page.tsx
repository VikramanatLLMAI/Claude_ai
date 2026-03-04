"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Super Admin Dashboard root page.
 *
 * Route: /super-admin (dev) or super-admin.llmatscale.ai (prod)
 *
 * Redirects to /super-admin/models (the only functional page in Phase 3).
 * Auth check is handled by the layout.
 */
export default function SuperAdminDashboardPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace("/super-admin/models")
  }, [router])

  return null
}
