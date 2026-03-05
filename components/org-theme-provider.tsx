"use client"

/**
 * OrgThemeProvider
 *
 * Client component that applies the org theme via data-theme attribute
 * on document.documentElement. Receives the theme from the server component
 * (org layout) to avoid FOUC.
 *
 * If activeTheme is null, removes the data-theme attribute to fall back
 * to platform default (claude theme from :root styles).
 */

import { useEffect } from "react"

interface OrgThemeProviderProps {
  activeTheme: string | null
  children: React.ReactNode
}

export function OrgThemeProvider({ activeTheme, children }: OrgThemeProviderProps) {
  useEffect(() => {
    if (activeTheme) {
      document.documentElement.setAttribute("data-theme", activeTheme)
    } else {
      document.documentElement.removeAttribute("data-theme")
    }

    // Cleanup on unmount (e.g., navigating away from org pages)
    return () => {
      document.documentElement.removeAttribute("data-theme")
    }
  }, [activeTheme])

  return <>{children}</>
}
