"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Cpu,
  Building2,
  Shield,
  Key,
  Settings,
  BarChart3,
  FileText,
  LogOut,
  MessageSquare,
  Users,
  Plug,
  Users2,
  ArrowLeft,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

const AUTH_SESSION_KEY = "llmatscale_auth_session"
const AUTH_TOKEN_KEY = "llmatscale_auth_token"

interface NavItem {
  label: string
  icon: React.ElementType
  href: string
  enabled: boolean
}

const SUPER_ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Models", icon: Cpu, href: "/admin/models", enabled: true },
  { label: "Organizations", icon: Building2, href: "/admin/organizations", enabled: false },
  { label: "Super Admins", icon: Shield, href: "/admin/super-admins", enabled: false },
  { label: "API Keys", icon: Key, href: "/admin/api-keys", enabled: false },
  { label: "Settings", icon: Settings, href: "/admin/settings", enabled: false },
  { label: "Analytics", icon: BarChart3, href: "/admin/analytics", enabled: false },
  { label: "Audit Logs", icon: FileText, href: "/admin/audit-logs", enabled: false },
]

function getOrgAdminNavItems(orgSlug: string): NavItem[] {
  const base = `/org/${orgSlug}/admin`
  return [
    { label: "System Instructions", icon: MessageSquare, href: `${base}/instructions`, enabled: true },
    { label: "Role Settings", icon: Users, href: `${base}/roles`, enabled: true },
    { label: "MCP Servers", icon: Plug, href: `${base}/mcp`, enabled: true },
    { label: "Users", icon: Users2, href: `${base}/users`, enabled: false },
    { label: "Settings", icon: Settings, href: `${base}/settings`, enabled: false },
    { label: "Analytics", icon: BarChart3, href: `${base}/analytics`, enabled: false },
    { label: "Audit Logs", icon: FileText, href: `${base}/audit-logs`, enabled: false },
  ]
}

interface AdminSidebarProps {
  variant: "super-admin" | "org-admin"
  orgSlug?: string
  orgName?: string
}

export function AdminSidebar({ variant, orgSlug, orgName }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [currentUser, setCurrentUser] = React.useState<{
    name?: string
    email?: string
  } | null>(null)

  React.useEffect(() => {
    try {
      const sessionData = localStorage.getItem(AUTH_SESSION_KEY)
      if (sessionData) {
        const session = JSON.parse(sessionData)
        if (session.user) {
          setCurrentUser({
            name: session.user.name,
            email: session.user.email,
          })
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  const handleSignOut = React.useCallback(() => {
    localStorage.removeItem(AUTH_SESSION_KEY)
    localStorage.removeItem(AUTH_TOKEN_KEY)
    if (variant === "org-admin" && orgSlug) {
      router.push(`/org/${orgSlug}/login`)
    } else {
      router.push("/admin/login")
    }
  }, [router, variant, orgSlug])

  const isOrgAdmin = variant === "org-admin"
  const navItems = isOrgAdmin && orgSlug
    ? getOrgAdminNavItems(orgSlug)
    : SUPER_ADMIN_NAV_ITEMS

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            {isOrgAdmin ? (
              <Building2 className="h-5 w-5 text-primary" />
            ) : (
              <Shield className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              {isOrgAdmin ? (orgName || "Organization") : "LLMatscale.ai"}
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              {isOrgAdmin ? "Admin Console" : "Platform Admin"}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarMenu>
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              const Icon = item.icon

              return (
                <SidebarMenuItem key={item.href}>
                  {item.enabled ? (
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  ) : (
                    <SidebarMenuButton
                      disabled
                      className="cursor-not-allowed opacity-60"
                      tooltip={`${item.label} - Coming Soon`}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="flex-1">{item.label}</span>
                      <Badge variant="secondary" className="ml-auto text-[10px] px-1.5 py-0">
                        Coming Soon
                      </Badge>
                    </SidebarMenuButton>
                  )}
                </SidebarMenuItem>
              )
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border px-4 py-3">
        {currentUser && (
          <div className="mb-2">
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {currentUser.name || (isOrgAdmin ? "Admin" : "Super Admin")}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {currentUser.email || ""}
            </p>
          </div>
        )}
        {isOrgAdmin && orgSlug && (
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground"
            onClick={() => router.push(`/org/${orgSlug}/chat`)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Chat
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={handleSignOut}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  )
}
