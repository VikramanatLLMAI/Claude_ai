"use client"

/**
 * ThemeSelector
 *
 * Org Admin component for selecting the active theme from assigned themes.
 * Only displays themes assigned by the Super Admin (OTHM-02).
 * Theme applies to all org users (OTHM-04).
 *
 * Used in: Org Admin settings page
 */

import * as React from "react"
import { Check, Loader2, Palette } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { toast } from "@/components/ui/toast"
import { cn } from "@/lib/utils"

const AUTH_TOKEN_KEY = "llmatscale_auth_token"

function getAuthHeaders(): HeadersInit {
  const token =
    typeof window !== "undefined"
      ? localStorage.getItem(AUTH_TOKEN_KEY) || ""
      : ""
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

// Theme color swatches (same as theme-assignment-panel)
const THEME_SWATCHES: Record<string, { primary: string; accent: string; label: string }> = {
  claude: {
    primary: "#1a1a1a",
    accent: "#d4a574",
    label: "Claude",
  },
  vercel: {
    primary: "#000000",
    accent: "#ededed",
    label: "Vercel",
  },
  "solar-dusk": {
    primary: "#b85c1e",
    accent: "#d4a86a",
    label: "Solar Dusk",
  },
  twitter: {
    primary: "#1d9bf0",
    accent: "#192734",
    label: "Twitter",
  },
  "violet-bloom": {
    primary: "#7c3aed",
    accent: "#e0d4fc",
    label: "Violet Bloom",
  },
}

interface AssignedTheme {
  id: string
  themeName: string
  isDefault: boolean
}

interface ThemeSelectorProps {
  orgSlug: string
}

export function ThemeSelector({ orgSlug }: ThemeSelectorProps) {
  const [themes, setThemes] = React.useState<AssignedTheme[]>([])
  const [activeTheme, setActiveTheme] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  // Fetch assigned themes on mount
  React.useEffect(() => {
    const fetchThemes = async () => {
      try {
        const res = await fetch(`/api/org/${orgSlug}/admin/themes`, {
          headers: getAuthHeaders(),
        })
        if (!res.ok) throw new Error("Failed to load themes")
        const data = await res.json()
        setThemes(data.themes || [])
        setActiveTheme(data.activeTheme ?? null)
      } catch {
        toast.error("Failed to load theme settings")
      } finally {
        setLoading(false)
      }
    }
    fetchThemes()
  }, [orgSlug])

  const handleSelectTheme = async (themeName: string) => {
    if (themeName === activeTheme) return
    setSaving(true)
    try {
      const res = await fetch(`/api/org/${orgSlug}/admin/themes`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ activeTheme: themeName }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to update theme")
      }
      setActiveTheme(themeName)
      // Apply theme immediately to document
      document.documentElement.setAttribute("data-theme", themeName)
      toast.success("Theme updated. Changes apply to all users.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update theme")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Loading themes...</span>
      </div>
    )
  }

  if (themes.length === 0) {
    return (
      <div className="rounded-lg border border-border p-8 text-center">
        <Palette className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">
          No themes assigned by platform admin.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Contact your platform administrator to assign themes.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {themes.map((theme) => {
        const swatch = THEME_SWATCHES[theme.themeName]
        const isActive = activeTheme === theme.themeName
        if (!swatch) return null

        return (
          <button
            key={theme.id}
            onClick={() => handleSelectTheme(theme.themeName)}
            disabled={saving}
            className={cn(
              "relative flex flex-col items-center gap-2 rounded-lg border p-4 text-left transition-colors hover:bg-accent/50",
              isActive
                ? "border-primary bg-accent/30 ring-1 ring-primary"
                : "border-border"
            )}
          >
            {/* Color swatch preview */}
            <div className="flex gap-1.5">
              <div
                className="h-8 w-8 rounded border border-border"
                style={{ backgroundColor: swatch.primary }}
              />
              <div
                className="h-8 w-8 rounded border border-border"
                style={{ backgroundColor: swatch.accent }}
              />
            </div>

            <span className="text-sm font-medium">{swatch.label}</span>

            {isActive && (
              <Badge className="bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800 text-xs">
                <Check className="mr-1 h-3 w-3" />
                Active
              </Badge>
            )}
          </button>
        )
      })}
    </div>
  )
}
