"use client"

import * as React from "react"
import { MessageSquare, Save, RefreshCw, RotateCcw, Sparkles } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "@/components/ui/toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

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

/**
 * Platform System Prompt editor page for Super Admin.
 *
 * Route: /super-admin/system-prompt
 *
 * Allows editing the platform-level layer of the 6-layer system prompt stack.
 * Changes are persisted to PlatformSettings.platformPrompt in the database.
 * Falls back to the hardcoded default when no custom prompt is saved.
 *
 * Features:
 * - AI-powered Enhance button (calls Haiku 4.5 to improve prompt)
 * - Reset to Default: Clears the custom prompt, reverting to hardcoded default
 */
export default function PlatformSystemPromptPage() {
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // Saved value (from last successful fetch/save)
  const [savedValue, setSavedValue] = React.useState<string>("")

  // Current editor value
  const [value, setValue] = React.useState<string>("")

  // Whether a custom prompt is stored (vs. using hardcoded default)
  const [isCustom, setIsCustom] = React.useState(false)

  // Enhance state
  const [enhancing, setEnhancing] = React.useState(false)
  const [originalBeforeEnhance, setOriginalBeforeEnhance] = React.useState<string | null>(null)

  // Dirty state
  const isDirty = value !== savedValue

  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Auto-grow textarea
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    const newHeight = Math.min(Math.max(textarea.scrollHeight, 200), 600)
    textarea.style.height = `${newHeight}px`
  }, [value])

  const fetchPrompt = React.useCallback(async () => {
    try {
      setError(null)
      const res = await fetch("/api/super-admin/system-prompt", {
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Failed to load prompt (${res.status})`)
      }
      const data = await res.json()
      setSavedValue(data.prompt ?? "")
      setValue(data.prompt ?? "")
      setIsCustom(data.isCustom ?? false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load prompt.")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    fetchPrompt()
  }, [fetchPrompt])

  // Ctrl+S keyboard shortcut
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault()
        if (isDirty && !saving) {
          handleSave()
        }
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirty, saving])

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/super-admin/system-prompt", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ prompt: value }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to save prompt.")
      }
      const data = await res.json()
      setSavedValue(data.prompt ?? "")
      setValue(data.prompt ?? "")
      setIsCustom(data.isCustom ?? false)
      toast.success("Platform system prompt saved.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save prompt.")
    } finally {
      setSaving(false)
    }
  }

  const handleResetToDefault = async () => {
    setSaving(true)
    try {
      // Send empty string to signal "reset to default"
      const res = await fetch("/api/super-admin/system-prompt", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ prompt: "" }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || "Failed to reset prompt.")
      }
      const data = await res.json()
      setSavedValue(data.prompt ?? "")
      setValue(data.prompt ?? "")
      setIsCustom(data.isCustom ?? false)
      toast.success("Platform system prompt reset to default.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset prompt.")
    } finally {
      setSaving(false)
    }
  }

  const handleEnhance = async () => {
    if (!value.trim()) return
    setEnhancing(true)
    setOriginalBeforeEnhance(value)

    try {
      const res = await fetch("/api/enhance-prompt", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ text: value, type: "platform" }),
      })

      if (res.ok) {
        const data = await res.json()
        setValue(data.enhanced)
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to enhance prompt")
        setOriginalBeforeEnhance(null)
      }
    } catch {
      toast.error("Network error. Please try again.")
      setOriginalBeforeEnhance(null)
    } finally {
      setEnhancing(false)
    }
  }

  const handleRevertEnhance = () => {
    if (originalBeforeEnhance !== null) {
      setValue(originalBeforeEnhance)
      setOriginalBeforeEnhance(null)
    }
  }

  const characterCount = value.length
  // Rough token estimate (~4 chars per token)
  const tokenEstimate = Math.ceil(characterCount / 4)

  return (
    <div className="flex h-screen flex-col">
      {/* Page header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold text-foreground">
              Platform System Prompt
            </h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isDirty && (
            <span className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
              Unsaved changes
            </span>
          )}
          {/* Reset to Default button */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={saving || !isCustom}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                Reset to Default
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset to Default Platform Prompt?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will overwrite your custom platform system prompt with the built-in default.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleResetToDefault}>
                  Reset to Default
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || saving}
          >
            {saving ? (
              <RefreshCw className="mr-1.5 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-3.5 w-3.5" />
            )}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {/* Error banner */}
        {error && (
          <div className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-2 text-xs underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="mx-auto max-w-3xl space-y-4">
          {/* Info section */}
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-3">
            <p className="text-sm text-muted-foreground">
              This prompt is injected at the <strong>platform layer</strong> of the 6-layer system
              prompt stack. It applies to all organizations and cannot be overridden by org admins or
              users. No token limit is enforced — the platform layer is uncapped.
            </p>
            {isCustom && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 font-medium">
                A custom prompt is currently active. Use &quot;Reset to Default&quot; to revert to
                the built-in prompt.
              </p>
            )}
          </div>

          {/* Editor */}
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-1.5 w-full" />
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  Prompt Content
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!value.trim() || enhancing || saving}
                      onClick={handleEnhance}
                      className="h-7 text-xs"
                    >
                      <Sparkles className="mr-1 h-3 w-3" />
                      {enhancing ? "Enhancing..." : "Enhance"}
                    </Button>
                    {originalBeforeEnhance !== null && !enhancing && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleRevertEnhance}
                        className="h-7 text-xs"
                      >
                        <RotateCcw className="mr-1 h-3 w-3" />
                        Revert
                      </Button>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground tabular-nums">
                    ~{tokenEstimate.toLocaleString()} tokens ({characterCount.toLocaleString()} chars)
                  </span>
                </div>
              </div>

              <div className="relative">
                {enhancing && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-background/60 backdrop-blur-[1px]">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  </div>
                )}
                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  disabled={enhancing}
                  placeholder="Enter the platform system prompt..."
                  className={`w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 font-mono overflow-y-auto resize-none ${enhancing ? "opacity-50" : ""}`}
                  style={{ minHeight: "200px", maxHeight: "600px" }}
                />
              </div>

              {/* Token progress bar (informational only, no limit) */}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Approximate token count (informational — no limit enforced)</span>
                <span>{tokenEstimate.toLocaleString()} tokens</span>
              </div>
            </div>
          )}

          {/* Save footer */}
          {!loading && (
            <div className="flex items-center justify-end gap-3 pt-2">
              {isDirty && (
                <span className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                  Unsaved changes
                </span>
              )}
              <Button
                onClick={handleSave}
                disabled={!isDirty || saving}
              >
                {saving ? (
                  <RefreshCw className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
