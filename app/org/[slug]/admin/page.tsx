"use client"

import { useMemo } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { MessageSquare, Users, Plug, ArrowRight } from "lucide-react"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { SidebarTrigger } from "@/components/ui/sidebar"

const AUTH_SESSION_KEY = "llmatscale_auth_session"

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

interface QuickLinkCard {
  title: string
  description: string
  icon: React.ElementType
  href: string
}

/**
 * Org Admin Dashboard Overview Page.
 *
 * Route: /org/[slug]/admin
 *
 * Shows a welcome header and quick link cards to the main admin sections.
 * Auth check is handled by the layout.
 */
export default function OrgAdminPage() {
  const params = useParams<{ slug: string }>()
  const slug = params.slug
  const orgName = useMemo(() => getOrgNameFromSession(slug), [slug])

  const quickLinks: QuickLinkCard[] = [
    {
      title: "System Instructions",
      description: "Configure org-wide and role-specific AI instructions",
      icon: MessageSquare,
      href: `/org/${slug}/admin/instructions`,
    },
    {
      title: "Role Settings",
      description: "Manage model access and role permissions",
      icon: Users,
      href: `/org/${slug}/admin/roles`,
    },
    {
      title: "MCP Servers",
      description: "Connect and manage MCP tool servers",
      icon: Plug,
      href: `/org/${slug}/admin/mcp`,
    },
  ]

  return (
    <div className="flex flex-1 flex-col">
      <header className="flex h-14 items-center gap-3 border-b border-border px-6">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold">Admin Console</h1>
      </header>

      <div className="mx-auto w-full max-w-4xl p-6 space-y-8">
        {/* Welcome header */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Welcome to {orgName || "your"} Admin Console
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your organization's AI chat settings
          </p>
        </div>

        {/* Quick links grid */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon
            return (
              <Link key={link.href} href={link.href} className="group">
                <Card className="h-full hover:border-primary/50 transition-colors">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>
                    <CardTitle className="text-base">{link.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      {link.description}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
