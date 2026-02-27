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
    router.push("/admin/login")
  }, [router])

  // For now, org-admin variant returns super-admin as placeholder
  // Will be implemented in Plan 04
  const navItems = variant === "org-admin" ? SUPER_ADMIN_NAV_ITEMS : SUPER_ADMIN_NAV_ITEMS

  // Suppress unused variable warnings for org-admin props
  void orgSlug
  void orgName

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold text-sidebar-foreground">
              LLMatscale.ai
            </span>
            <span className="text-xs text-sidebar-foreground/60">
              Platform Admin
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
              {currentUser.name || "Super Admin"}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {currentUser.email || ""}
            </p>
          </div>
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
