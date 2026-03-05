"use client"

/**
 * Usage page — redirects to the new Analytics dashboard.
 * The Analytics page (/admin/analytics) replaces this page as of Phase 6.
 * Kept as a redirect for any existing bookmarks or navigation.
 */

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"

export default function UsageRedirectPage() {
  const params = useParams<{ slug: string }>()
  const router = useRouter()

  useEffect(() => {
    router.replace(`/org/${params.slug}/admin/analytics`)
  }, [params.slug, router])

  return (
    <div className="flex flex-1 items-center justify-center">
      <p className="text-sm text-muted-foreground">Redirecting to Analytics...</p>
    </div>
  )
}
