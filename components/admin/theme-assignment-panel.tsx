"use client"

/**
 * ThemeAssignmentPanel
 *
 * Super Admin component for assigning themes to an organization.
 * Displays all 5 available themes as checkboxes with color swatch previews.
 * Allows selecting a default theme from the checked themes.
 *
 * Used in: Super Admin organizations page (org edit dialog)
 */

import * as React from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/toast"

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

// Theme color swatches extracted from globals.css primary/accent colors
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

interface OrgThemeAssignment {
  id: string
  themeName: string
  isDefault: boolean
  createdAt: string
}

interface ThemeAssignmentPanelProps {
  orgId: string
  initialThemes?: {
    themes: OrgThemeAssignment[]
    activeTheme: string | null
  }
}

export function ThemeAssignmentPanel({ orgId, initialThemes }: ThemeAssignmentPanelProps) {
  const [checkedThemes, setCheckedThemes] = React.useState<Set<string>>(new Set())
  const [defaultTheme, setDefaultTheme] = React.useState<string | null>(null)
  const [saving, setSaving] = React.useState(false)
  const [loading, setLoading] = React.useState(!initialThemes)

  // Load from API on mount
  React.useEffect(() => {
    if (initialThemes) {
      setCheckedThemes(new Set(initialThemes.themes.map((t) => t.themeName)))
      const def = initialThemes.themes.find((t) => t.isDefault)
      setDefaultTheme(def?.themeName ?? null)
      return
    }

    const fetchThemes = async () => {
      try {
        const res = await fetch(`/api/super-admin/organizations/${orgId}/themes`, {
          headers: getAuthHeaders(),
        })
        if (!res.ok) throw new Error("Failed to load themes")
        const data = await res.json()
        setCheckedThemes(new Set((data.themes || []).map((t: OrgThemeAssignment) => t.themeName)))
        const def = (data.themes || []).find((t: OrgThemeAssignment) => t.isDefault)
        setDefaultTheme(def?.themeName ?? null)
      } catch {
        toast.error("Failed to load theme assignments")
      } finally {
        setLoading(false)
      }
    }
    fetchThemes()
  }, [orgId, initialThemes])

  const handleCheckToggle = (themeName: string, checked: boolean) => {
    setCheckedThemes((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(themeName)
      } else {
        next.delete(themeName)
        // If unchecked theme was the default, clear default
        if (defaultTheme === themeName) {
          setDefaultTheme(null)
        }
      }
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const themes = Array.from(checkedThemes)
      const res = await fetch(`/api/super-admin/organizations/${orgId}/themes`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          assignedThemes: themes,
          defaultTheme: defaultTheme,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save theme assignments")
      }
      toast.success("Theme assignments updated.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save theme assignments")
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

  const themeNames = Object.keys(THEME_SWATCHES)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3">
        {themeNames.map((name) => {
          const swatch = THEME_SWATCHES[name]
          const isChecked = checkedThemes.has(name)
          return (
            <div
              key={name}
              className="flex items-center justify-between rounded-lg border border-border p-3"
            >
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`theme-${name}`}
                  checked={isChecked}
                  onCheckedChange={(checked) =>
                    handleCheckToggle(name, checked === true)
                  }
                />
                {/* Color swatch */}
                <div className="flex gap-1">
                  <div
                    className="h-5 w-5 rounded border border-border"
                    style={{ backgroundColor: swatch.primary }}
                    title={`${swatch.label} primary`}
                  />
                  <div
                    className="h-5 w-5 rounded border border-border"
                    style={{ backgroundColor: swatch.accent }}
                    title={`${swatch.label} accent`}
                  />
                </div>
                <Label
                  htmlFor={`theme-${name}`}
                  className="cursor-pointer text-sm font-medium"
                >
                  {swatch.label}
                </Label>
              </div>

              {/* Default radio */}
              {isChecked && (
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="default-theme"
                    checked={defaultTheme === name}
                    onChange={() => setDefaultTheme(name)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">Default</span>
                </label>
              )}
            </div>
          )
        })}
      </div>

      <Button onClick={handleSave} disabled={saving} size="sm">
        {saving ? (
          <>
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Theme Assignments"
        )}
      </Button>
    </div>
  )
}
