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
  UserSearch,
  ArrowLeft,
  Lock,
  Mail,
  ScrollText,
  MessageCircle,
  ChevronUp,
  Paintbrush,
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
  useSidebar,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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

interface NavGroup {
  label: string
  items: NavItem[]
}

const SUPER_ADMIN_NAV_GROUPS: NavGroup[] = [
  {
    label: "Management",
    items: [
      { label: "Models", icon: Cpu, href: "/super-admin/models", enabled: true },
      { label: "Organizations", icon: Building2, href: "/super-admin/organizations", enabled: true },
      { label: "Super Admins", icon: Shield, href: "/super-admin/super-admins", enabled: true },
      { label: "Users", icon: UserSearch, href: "/super-admin/users", enabled: true },
      { label: "API Keys", icon: Key, href: "/super-admin/api-keys", enabled: true },
    ],
  },
  {
    label: "Monitoring",
    items: [
      { label: "Analytics", icon: BarChart3, href: "/super-admin/analytics", enabled: true },
      { label: "Audit Logs", icon: FileText, href: "/super-admin/audit-logs", enabled: true },
    ],
  },
  {
    label: "Configuration",
    items: [
      { label: "Settings", icon: Settings, href: "/super-admin/settings", enabled: true },
      { label: "System Prompt", icon: MessageSquare, href: "/super-admin/system-prompt", enabled: true },
    ],
  },
]

function getOrgAdminNavGroups(orgSlug: string): NavGroup[] {
  const base = `/org/${orgSlug}/admin`
  return [
    {
      label: "Configuration",
      items: [
        { label: "Roles", icon: Users, href: `${base}/roles`, enabled: true },
        { label: "Instructions", icon: MessageSquare, href: `${base}/instructions`, enabled: true },
        { label: "MCP Servers", icon: Plug, href: `${base}/mcp`, enabled: true },
      ],
    },
    {
      label: "People",
      items: [
        { label: "Members", icon: Users2, href: `${base}/users`, enabled: true },
        { label: "Invitations", icon: Mail, href: `${base}/invitations`, enabled: true },
      ],
    },
    {
      label: "Monitoring",
      items: [
        { label: "Conversations", icon: MessageCircle, href: `${base}/conversations`, enabled: true },
        { label: "Analytics", icon: BarChart3, href: `${base}/analytics`, enabled: true },
        { label: "Audit Logs", icon: ScrollText, href: `${base}/audit-logs`, enabled: true },
      ],
    },
    {
      label: "Security",
      items: [
        { label: "Password Policy", icon: Lock, href: `${base}/security`, enabled: true },
      ],
    },
    {
      label: "Settings",
      items: [
        { label: "Settings", icon: Settings, href: `${base}/settings`, enabled: true },
        { label: "Branding", icon: Paintbrush, href: `${base}/branding`, enabled: true },
      ],
    },
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
  const { state, toggleSidebar } = useSidebar()
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
      router.push("/super-admin/login")
    }
  }, [router, variant, orgSlug])

  const isOrgAdmin = variant === "org-admin"

  // Helper to render a single nav item
  const renderNavItem = (item: NavItem) => {
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
            <Badge variant="outline" className="ml-auto text-[10px] px-1.5 py-0 text-muted-foreground/60 border-muted-foreground/20 bg-transparent font-normal">
              Soon
            </Badge>
          </SidebarMenuButton>
        )}
      </SidebarMenuItem>
    )
  }

  // Get user initial for avatar — use name first, then email, then fallback
  const userInitial = currentUser?.name?.charAt(0)?.toUpperCase() || currentUser?.email?.charAt(0)?.toUpperCase() || "?"

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-2 py-3 group-data-[collapsible=icon]:px-2">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <button
            onClick={toggleSidebar}
            aria-label={state === "collapsed" ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
          >
            {isOrgAdmin ? (
              <Building2 className="h-4 w-4 text-primary" />
            ) : (
              <Shield className="h-4 w-4 text-primary" />
            )}
          </button>
          <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold text-sidebar-foreground truncate">
              {isOrgAdmin ? (orgName || "Organization") : "LLMatscale.ai"}
            </span>
            <span className="text-xs text-sidebar-foreground/60 truncate">
              {isOrgAdmin ? "Admin Console" : "Platform Admin"}
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-y-auto">
        {isOrgAdmin && orgSlug ? (
          // Org Admin: Grouped navigation
          getOrgAdminNavGroups(orgSlug).map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map(renderNavItem)}
              </SidebarMenu>
            </SidebarGroup>
          ))
        ) : (
          // Super Admin: Grouped navigation (Management, Monitoring, Configuration)
          SUPER_ADMIN_NAV_GROUPS.map((group) => (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
              <SidebarMenu>
                {group.items.map(renderNavItem)}
              </SidebarMenu>
            </SidebarGroup>
          ))
        )}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-2 group-data-[collapsible=icon]:p-1.5">
        <SidebarMenu>
          <SidebarMenuItem>
            {state === "collapsed" ? (
              /* Collapsed mode: DropdownMenu popover anchored to avatar */
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton size="lg" tooltip={currentUser?.name || "Account"}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-sm font-medium">
                      {userInitial}
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="center" className="w-56">
                  {currentUser?.email && (
                    <>
                      <DropdownMenuLabel className="font-normal text-xs text-muted-foreground truncate">
                        {currentUser.email}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {isOrgAdmin && orgSlug && (
                    <DropdownMenuItem onClick={() => router.push(`/org/${orgSlug}/chat`)}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Chat
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              /* Expanded mode: Collapsible profile expander */
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton size="lg" tooltip={currentUser?.name || "Account"}>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sidebar-accent text-sidebar-accent-foreground text-sm font-medium">
                      {userInitial}
                    </div>
                    <span className="truncate font-medium">
                      {currentUser?.name || (isOrgAdmin ? "Admin" : "Super Admin")}
                    </span>
                    <ChevronUp className="ml-auto h-4 w-4" />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-3 py-2">
                    {currentUser?.email && (
                      <p className="truncate text-xs text-muted-foreground mb-2">
                        {currentUser.email}
                      </p>
                    )}
                    {isOrgAdmin && orgSlug && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full justify-start h-8 text-sm"
                        onClick={() => router.push(`/org/${orgSlug}/chat`)}
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Chat
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start h-8 text-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Log Out
                    </Button>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            )}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
