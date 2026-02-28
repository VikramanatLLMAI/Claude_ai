"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight } from "lucide-react"

/**
 * Breadcrumb navigation component for the Org Admin Console.
 *
 * Renders a breadcrumb trail based on the current pathname.
 * Returns null on the admin dashboard root page (no breadcrumb needed).
 *
 * Segments:
 *   Admin Console > System Instructions
 *   Admin Console > Role Settings
 *   Admin Console > MCP Servers
 */

const SEGMENT_LABELS: Record<string, string> = {
  instructions: "System Instructions",
  roles: "Role Settings",
  mcp: "MCP Servers",
}

interface AdminBreadcrumbProps {
  orgSlug: string
}

export function AdminBreadcrumb({ orgSlug }: AdminBreadcrumbProps) {
  const pathname = usePathname()
  const adminBase = `/org/${orgSlug}/admin`

  // If we're at the admin root, return null (no breadcrumb on dashboard)
  if (pathname === adminBase || pathname === adminBase + "/") {
    return null
  }

  // Extract the segment after /admin/
  const afterAdmin = pathname.slice(adminBase.length + 1) // remove leading slash
  const firstSegment = afterAdmin.split("/")[0]
  const label = SEGMENT_LABELS[firstSegment]

  if (!label) {
    return null
  }

  return (
    <div className="border-b px-6 py-3">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <Link
          href={adminBase}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          Admin Console
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
        <span className="text-foreground font-medium">{label}</span>
      </nav>
    </div>
  )
}
