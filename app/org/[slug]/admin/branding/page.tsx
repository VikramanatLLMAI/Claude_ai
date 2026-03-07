"use client"

import { useParams } from "next/navigation"
import { AdminPageHeader } from "@/components/admin/admin-page-header"
import { BrandingEditor } from "@/components/admin/branding-editor"

/**
 * Branding Admin Page
 *
 * Route: /org/[slug]/admin/branding
 *
 * Allows Org Admins to customize the login page branding:
 * headline, badge, description, and 4 feature cards with icons.
 * Includes a side-by-side live preview that updates as admin types.
 */
export default function BrandingPage() {
  const params = useParams<{ slug: string }>()

  return (
    <div className="flex h-screen flex-col">
      <AdminPageHeader
        title="Branding"
        description="Customize your organization's login page appearance"
      />
      <BrandingEditor orgSlug={params.slug} />
    </div>
  )
}
