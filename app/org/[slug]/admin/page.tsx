"use client"

import { useEffect } from "react"
import { useRouter, useParams } from "next/navigation"

/**
 * Org Admin Dashboard root page.
 *
 * Route: /org/[slug]/admin (dev) or {slug}.llmatscale.ai/admin (prod)
 *
 * Redirects to /org/[slug]/admin/instructions (the first functional page in Phase 3).
 * Auth check is handled by the layout.
 */
export default function OrgAdminPage() {
  const router = useRouter()
  const params = useParams<{ slug: string }>()

  useEffect(() => {
    router.replace(`/org/${params.slug}/admin/instructions`)
  }, [router, params.slug])

  return null
}
