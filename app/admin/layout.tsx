"use client"

import { useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { PageLoadingSkeleton } from "@/components/ui/skeleton-loaders"

const AUTH_SESSION_KEY = "llmatscale_auth_session"
const AUTH_TOKEN_KEY = "llmatscale_auth_token"

function hasValidSession(): boolean {
  if (typeof window === "undefined") return false
  const session = window.localStorage.getItem(AUTH_SESSION_KEY)
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
  if (!session || !token) return false
  try {
    const parsed = JSON.parse(session)
    if (parsed.expiresAt && new Date(parsed.expiresAt) <= new Date()) {
      window.localStorage.removeItem(AUTH_SESSION_KEY)
      window.localStorage.removeItem(AUTH_TOKEN_KEY)
      return false
    }
    return true
  } catch {
    return false
  }
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()

  // Allow login page to render without auth check
  const isLoginPage = pathname === "/admin/login"

  useEffect(() => {
    if (isLoginPage) return
    if (typeof window === "undefined") return
    if (!hasValidSession()) {
      router.replace("/admin/login")
    }
  }, [router, isLoginPage])

  // Login page renders without sidebar
  if (isLoginPage) {
    return <>{children}</>
  }

  // For SSR or before hydration, show loading
  if (typeof window === "undefined") {
    return <PageLoadingSkeleton />
  }

  // Check auth synchronously for render decision
  if (!hasValidSession()) {
    return <PageLoadingSkeleton />
  }

  return (
    <SidebarProvider>
      <AdminSidebar variant="super-admin" />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
