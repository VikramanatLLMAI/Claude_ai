"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2, Save } from "lucide-react"
import { getIcon, getIconNames } from "@/lib/icon-map"
import type { FeatureCard } from "@/lib/icon-map"
import { toast } from "sonner"

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

const ICON_NAMES = getIconNames()

const DEFAULT_CARDS: FeatureCard[] = [
  { icon: "Shield", title: "", subtitle: "" },
  { icon: "Zap", title: "", subtitle: "" },
  { icon: "Globe", title: "", subtitle: "" },
  { icon: "Users", title: "", subtitle: "" },
]

interface BrandingEditorProps {
  orgSlug: string
}

export function BrandingEditor({ orgSlug }: BrandingEditorProps) {
  const [headline, setHeadline] = React.useState("")
  const [badge, setBadge] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [featureCards, setFeatureCards] = React.useState<FeatureCard[]>(DEFAULT_CARDS)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)

  // Fetch existing branding on mount
  React.useEffect(() => {
    async function fetchBranding() {
      try {
        const res = await fetch(`/api/org/${orgSlug}/admin/branding`, {
          headers: getAuthHeaders(),
        })
        if (res.ok) {
          const data = await res.json()
          setHeadline(data.loginHeadline || "")
          setBadge(data.loginBadge || "")
          setDescription(data.loginDescription || "")
          if (data.loginFeatureCards && data.loginFeatureCards.length > 0) {
            // Pad to 4 cards if needed
            const cards = [...data.loginFeatureCards]
            while (cards.length < 4) {
              cards.push({ icon: "Sparkles", title: "", subtitle: "" })
            }
            setFeatureCards(cards.slice(0, 4))
          }
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false)
      }
    }
    fetchBranding()
  }, [orgSlug])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/org/${orgSlug}/admin/branding`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          loginHeadline: headline || null,
          loginBadge: badge || null,
          loginDescription: description || null,
          loginFeatureCards: featureCards,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Save failed")
      }

      toast.success("Branding saved successfully")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save branding")
    } finally {
      setSaving(false)
    }
  }

  const updateCard = (index: number, field: keyof FeatureCard, value: string) => {
    setFeatureCards((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />
        <div className="h-10 w-full rounded-lg bg-muted animate-pulse" />
        <div className="h-24 w-full rounded-lg bg-muted animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-auto">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          {/* Left Column - Edit Form */}
          <div className="space-y-6">
            {/* Headlines Section */}
            <div className="rounded-lg border border-border p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Headlines</h3>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Headline
                </label>
                <div className="relative">
                  <Input
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value.slice(0, 200))}
                    placeholder="e.g., Your AI Workspace"
                    maxLength={200}
                    className="pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {headline.length}/200
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Badge / Tagline
                </label>
                <div className="relative">
                  <Input
                    value={badge}
                    onChange={(e) => setBadge(e.target.value.slice(0, 100))}
                    placeholder="e.g., Powered by AI"
                    maxLength={100}
                    className="pr-14"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {badge.length}/100
                  </span>
                </div>
              </div>
            </div>

            {/* Description Section */}
            <div className="rounded-lg border border-border p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Description</h3>

              <div>
                <div className="relative">
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                    placeholder="Describe your workspace..."
                    maxLength={500}
                    rows={3}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <span className="absolute right-3 bottom-2 text-xs text-muted-foreground">
                    {description.length}/500
                  </span>
                </div>
              </div>
            </div>

            {/* Feature Cards Section */}
            <div className="rounded-lg border border-border p-5 space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Feature Cards</h3>
              <p className="text-xs text-muted-foreground -mt-2">
                4 cards displayed in a 2x2 grid on the login page branding panel.
              </p>

              <div className="space-y-4">
                {featureCards.map((card, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-border/50 bg-muted/20 p-4 space-y-3"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      Card {i + 1}
                    </div>

                    {/* Icon Selector */}
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Icon
                      </label>
                      <select
                        value={card.icon}
                        onChange={(e) => updateCard(i, "icon", e.target.value)}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {ICON_NAMES.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Title */}
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Title
                      </label>
                      <Input
                        value={card.title}
                        onChange={(e) => updateCard(i, "title", e.target.value.slice(0, 50))}
                        placeholder="e.g., Enterprise Security"
                        maxLength={50}
                      />
                    </div>

                    {/* Subtitle */}
                    <div>
                      <label className="block text-xs font-medium text-foreground mb-1">
                        Subtitle
                      </label>
                      <Input
                        value={card.subtitle}
                        onChange={(e) => updateCard(i, "subtitle", e.target.value.slice(0, 100))}
                        placeholder="e.g., End-to-end encryption"
                        maxLength={100}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Save Branding
              </Button>
            </div>
          </div>

          {/* Right Column - Live Preview */}
          <div className="xl:sticky xl:top-6 xl:self-start">
            <h3 className="mb-3 text-sm font-semibold text-foreground">
              Live Preview
            </h3>
            <div className="overflow-hidden rounded-xl border border-border shadow-lg">
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-8 text-white">
                {/* Preview Headline */}
                <h2 className="text-xl font-bold leading-tight">
                  {headline || (
                    <span className="text-white/30">Your Headline</span>
                  )}
                </h2>

                {/* Preview Badge */}
                {(badge || !headline) && (
                  <div className="mt-2">
                    <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-medium backdrop-blur-sm">
                      {badge || (
                        <span className="text-white/30">Badge text</span>
                      )}
                    </span>
                  </div>
                )}

                {/* Preview Description */}
                <p className="mt-3 text-xs leading-relaxed text-white/70">
                  {description || (
                    <span className="text-white/30">
                      Your description will appear here...
                    </span>
                  )}
                </p>

                {/* Preview Feature Cards */}
                <div className="mt-5 grid grid-cols-2 gap-2">
                  {featureCards.map((card, i) => {
                    const IconComponent = getIcon(card.icon)
                    const hasContent = card.title || card.subtitle
                    return (
                      <div
                        key={i}
                        className="rounded-lg bg-white/10 p-3 backdrop-blur-sm"
                      >
                        <IconComponent className="mb-1.5 size-4 text-white/80" />
                        <p className="text-xs font-medium text-white">
                          {card.title || (
                            <span className="text-white/30">Card title</span>
                          )}
                        </p>
                        <p className="mt-0.5 text-[10px] text-white/60">
                          {card.subtitle || (
                            <span className={hasContent ? "text-white/30" : "text-white/20"}>
                              Subtitle
                            </span>
                          )}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              This preview shows how the left panel of your org login page will look.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
