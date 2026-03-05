"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import {
  Settings,
  Palette,
  Key,
  Plug,
  SlidersHorizontal,
  Sliders,
  X,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Plus,
  Moon,
  Sun,
  Monitor,
  Loader2,
  User as UserIcon,
  Smartphone,
  Tablet,
  Lock,
  Trash2,
  Upload,
  Shield,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { McpConnectionCard, type McpConnectionData } from "@/components/mcp/mcp-connection-card"
import { McpAddDialog } from "@/components/mcp/mcp-add-dialog"
import { InstructionEditor } from "@/components/admin/instruction-editor"
import { cn } from "@/lib/utils"

const AUTH_TOKEN_KEY = "llmatscale_auth_token"
const THEME_KEY = "llmatscale_theme"
const FONT_SIZE_KEY = "llmatscale_font_size"
const CODE_THEME_KEY = "llmatscale_code_theme"
const INSTRUCTIONS_KEY = "llmatscale_custom_instructions"

type Theme = "light" | "dark" | "system"
type CodeTheme = "github-dark" | "one-dark-pro" | "dracula"

type SettingsTab = "profile" | "general" | "appearance" | "api-keys" | "mcp" | "instructions" | "sessions" | "advanced"

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "profile", label: "Profile", icon: UserIcon },
  { id: "general", label: "General", icon: Settings },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "mcp", label: "MCP", icon: Plug },
  { id: "instructions", label: "Instructions Tuning", icon: SlidersHorizontal },
  { id: "sessions", label: "Sessions", icon: Monitor },
  { id: "advanced", label: "Advanced", icon: Sliders },
]

// DEPRECATED: Hardcoded CLAUDE_MODELS replaced by permittedModels prop from API.
// Kept as fallback for backward compatibility.
const FALLBACK_MODELS = [
  { id: "claude-sonnet-4-5-20250929", name: "Claude 4.5 Sonnet" },
]

interface SettingsModalProps {
  open: boolean
  onClose: () => void
  defaultTab?: SettingsTab
  currentModel?: string
  onDefaultModelChange?: (modelId: string) => void
  permittedModels?: { id: string; name: string }[]
  orgSlug?: string | null
}

export function SettingsModal({ open, onClose, defaultTab = "general", currentModel, onDefaultModelChange, permittedModels, orgSlug }: SettingsModalProps) {
  // Use permitted models from API if available, otherwise fallback
  const CLAUDE_MODELS = (permittedModels && permittedModels.length > 0) ? permittedModels : FALLBACK_MODELS
  const [activeTab, setActiveTab] = useState<SettingsTab>(defaultTab)

  // Sync activeTab when defaultTab changes (e.g. opening from MCP connectors)
  useEffect(() => {
    setActiveTab(defaultTab)
  }, [defaultTab])

  // Profile state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Password state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordChanging, setPasswordChanging] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Anthropic API Key state
  const [anthropicApiKey, setAnthropicApiKey] = useState("")
  const [apiKeyTestStatus, setApiKeyTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [apiKeyTestMessage, setApiKeyTestMessage] = useState("")
  const [hasExistingApiKey, setHasExistingApiKey] = useState(false)
  const [maskedApiKey, setMaskedApiKey] = useState("")

  // Appearance state
  const [theme, setTheme] = useState<Theme>("system")
  const [fontSize, setFontSize] = useState(16)
  const [codeTheme, setCodeTheme] = useState<CodeTheme>("github-dark")

  // General settings
  const [defaultModel, setDefaultModel] = useState(currentModel || "claude-sonnet-4-5-20250929")

  // Sync defaultModel when currentModel prop changes (e.g. model changed from chat)
  useEffect(() => {
    if (currentModel) setDefaultModel(currentModel)
  }, [currentModel])
  const [sendWithEnter, setSendWithEnter] = useState(true)
  const [showCodeResults, setShowCodeResults] = useState(true)

  // Instructions Tuning state
  const [customInstructions, setCustomInstructions] = useState("")
  const [instructionsSaving, setInstructionsSaving] = useState(false)
  const [instructionsMessage, setInstructionsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [instructionsEnabled, setInstructionsEnabled] = useState(true)
  const [instructionsLoading, setInstructionsLoading] = useState(false)

  // MCP state
  const [connections, setConnections] = useState<McpConnectionData[]>([])
  const [mcpLoading, setMcpLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingConnection, setEditingConnection] = useState<McpConnectionData | null>(null)

  // Org Profile state (Profile tab with org context)
  interface OrgProfileData {
    name: string
    email: string
    avatarBase64: string | null
    roleName: string
    roleId: string
    joinedAt: string
  }
  const [orgProfile, setOrgProfile] = useState<OrgProfileData | null>(null)
  const [orgProfileLoading, setOrgProfileLoading] = useState(false)
  const [orgProfileName, setOrgProfileName] = useState("")
  const [orgProfileAvatarPreview, setOrgProfileAvatarPreview] = useState<string | null>(null)
  const [orgProfileAvatarChanged, setOrgProfileAvatarChanged] = useState(false)
  const [orgProfileSaving, setOrgProfileSaving] = useState(false)
  const [orgProfileMessage, setOrgProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  // Sessions state
  interface SessionData {
    id: string
    browser: string
    os: string
    device: string
    ipAddress: string | null
    lastUsedAt: string | null
    createdAt: string
    isCurrent: boolean
  }
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null)
  const [sessionConfirmId, setSessionConfirmId] = useState<string | null>(null)

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY) || ""
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    }
  }, [])

  // Reset to default tab when opened
  useEffect(() => {
    if (open) {
      setActiveTab(defaultTab)
    }
  }, [open, defaultTab])

  // Load data when modal opens
  useEffect(() => {
    if (!open) return

    // Load theme preferences
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null
    const savedFontSize = localStorage.getItem(FONT_SIZE_KEY)
    const savedCodeTheme = localStorage.getItem(CODE_THEME_KEY) as CodeTheme | null
    if (savedTheme) setTheme(savedTheme)
    if (savedFontSize) setFontSize(parseInt(savedFontSize))
    if (savedCodeTheme) setCodeTheme(savedCodeTheme)

    // Sync theme mode from API (server is source of truth)
    syncThemeModeFromApi()

    // Load profile and settings
    loadUserProfile()
    loadAnthropicConfig()
    fetchConnections()
    loadCustomInstructions()
    loadOrgProfile()
    loadSessions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const loadUserProfile = async () => {
    try {
      const res = await fetch("/api/auth/me", { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setName(data.user.name || "")
        setEmail(data.user.email || "")
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    }
  }

  const loadAnthropicConfig = async () => {
    try {
      const res = await fetch("/api/user/anthropic", { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setHasExistingApiKey(data.hasApiKey)
        setMaskedApiKey(data.maskedKey || "")
      }
    } catch (error) {
      console.error("Error loading Anthropic config:", error)
    }
  }

  const fetchConnections = async () => {
    try {
      const res = await fetch("/api/mcp/connections", { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setConnections(data)
      }
    } catch (error) {
      console.error("Error fetching MCP connections:", error)
    } finally {
      setMcpLoading(false)
    }
  }

  // Instructions
  const loadCustomInstructions = async () => {
    if (orgSlug) {
      // Org-backed custom instructions via API
      setInstructionsLoading(true)
      try {
        const res = await fetch(`/api/org/${orgSlug}/user/custom-instructions`, {
          headers: getAuthHeaders(),
        })
        if (res.ok) {
          const data = await res.json()
          setCustomInstructions(data.customInstructions || "")
          setInstructionsEnabled(data.enabled !== false)
        }
      } catch (error) {
        console.error("Error loading custom instructions:", error)
      } finally {
        setInstructionsLoading(false)
      }
    } else {
      // Fallback: localStorage-based instructions (non-org context)
      const saved = localStorage.getItem(INSTRUCTIONS_KEY)
      if (saved) setCustomInstructions(saved)
    }
  }

  // Org Profile loading (Profile tab)
  const loadOrgProfile = async () => {
    if (!orgSlug) return
    setOrgProfileLoading(true)
    try {
      const res = await fetch(`/api/org/${orgSlug}/profile`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        setOrgProfile(data)
        setOrgProfileName(data.name || "")
        setOrgProfileAvatarPreview(data.avatarBase64 || null)
        setOrgProfileAvatarChanged(false)
      }
    } catch (error) {
      console.error("Error loading org profile:", error)
    } finally {
      setOrgProfileLoading(false)
    }
  }

  // Avatar processing: auto-crop to centered square, resize to 200x200, JPEG 80%
  const processAvatarFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!file.type.startsWith("image/")) {
        reject(new Error("File must be an image (PNG or JPEG)"))
        return
      }
      const reader = new FileReader()
      reader.onload = () => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement("canvas")
          canvas.width = 200
          canvas.height = 200
          const ctx = canvas.getContext("2d")
          if (!ctx) {
            reject(new Error("Canvas not supported"))
            return
          }
          // Auto-crop to centered square
          const size = Math.min(img.width, img.height)
          const sx = (img.width - size) / 2
          const sy = (img.height - size) / 2
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200)
          const dataUrl = canvas.toDataURL("image/jpeg", 0.8)
          // Check size (Base64 payload after comma)
          const base64Part = dataUrl.split(",")[1] || ""
          const estimatedBytes = Math.ceil(base64Part.length * 3 / 4)
          if (estimatedBytes > 200 * 1024) {
            reject(new Error("Processed image exceeds 200KB. Try a smaller image."))
            return
          }
          resolve(dataUrl)
        }
        img.onerror = () => reject(new Error("Failed to load image"))
        img.src = reader.result as string
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(file)
    })
  }

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const processed = await processAvatarFile(file)
      setOrgProfileAvatarPreview(processed)
      setOrgProfileAvatarChanged(true)
      setOrgProfileMessage(null)
    } catch (err) {
      setOrgProfileMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to process image" })
    }
    // Reset input so same file can be re-selected
    if (avatarInputRef.current) avatarInputRef.current.value = ""
  }

  const handleRemoveAvatar = () => {
    setOrgProfileAvatarPreview(null)
    setOrgProfileAvatarChanged(true)
    setOrgProfileMessage(null)
  }

  const handleSaveOrgProfile = async () => {
    if (!orgSlug) return
    setOrgProfileSaving(true)
    setOrgProfileMessage(null)
    try {
      const body: Record<string, unknown> = {}
      if (orgProfileName !== orgProfile?.name) {
        body.name = orgProfileName
      }
      if (orgProfileAvatarChanged) {
        body.avatarBase64 = orgProfileAvatarPreview // null clears it
      }
      if (Object.keys(body).length === 0) {
        setOrgProfileMessage({ type: "success", text: "No changes to save" })
        setOrgProfileSaving(false)
        return
      }
      const res = await fetch(`/api/org/${orgSlug}/profile`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      })
      if (res.ok) {
        const data = await res.json()
        setOrgProfile(data)
        setOrgProfileName(data.name || "")
        setOrgProfileAvatarPreview(data.avatarBase64 || null)
        setOrgProfileAvatarChanged(false)
        // Also update the basic profile state so General tab stays in sync
        setName(data.name || "")
        setOrgProfileMessage({ type: "success", text: "Profile updated successfully" })
      } else {
        const data = await res.json()
        setOrgProfileMessage({ type: "error", text: data.error || "Failed to update profile" })
      }
    } catch {
      setOrgProfileMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setOrgProfileSaving(false)
    }
  }

  // Sessions loading
  const loadSessions = async () => {
    if (!orgSlug) return
    setSessionsLoading(true)
    try {
      const res = await fetch(`/api/org/${orgSlug}/sessions`, { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        // Sort: current session first, then by lastUsedAt descending
        const sorted = (data.sessions || []).sort((a: SessionData, b: SessionData) => {
          if (a.isCurrent && !b.isCurrent) return -1
          if (!a.isCurrent && b.isCurrent) return 1
          return 0
        })
        setSessions(sorted)
      }
    } catch (error) {
      console.error("Error loading sessions:", error)
    } finally {
      setSessionsLoading(false)
    }
  }

  const handleRevokeSession = async (sessionId: string) => {
    if (!orgSlug) return
    setRevokingSessionId(sessionId)
    try {
      const res = await fetch(`/api/org/${orgSlug}/sessions/${sessionId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      } else {
        const data = await res.json()
        console.error("Failed to revoke session:", data.error)
      }
    } catch (error) {
      console.error("Error revoking session:", error)
    } finally {
      setRevokingSessionId(null)
      setSessionConfirmId(null)
    }
  }

  // Helper: relative time (e.g., "5 minutes ago")
  const getRelativeTime = (dateStr: string | null): string => {
    if (!dateStr) return "Never"
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`
    return date.toLocaleDateString()
  }

  // Device icon helper
  const getDeviceIcon = (device: string) => {
    switch (device) {
      case "Mobile": return Smartphone
      case "Tablet": return Tablet
      default: return Monitor
    }
  }

  const handleSaveInstructions = async () => {
    setInstructionsSaving(true)
    setInstructionsMessage(null)
    if (orgSlug) {
      // Save via API
      try {
        const res = await fetch(`/api/org/${orgSlug}/user/custom-instructions`, {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({ customInstructions }),
        })
        if (res.ok) {
          setInstructionsMessage({ type: "success", text: "Instructions saved successfully" })
        } else {
          const data = await res.json()
          setInstructionsMessage({ type: "error", text: data.error || "Failed to save instructions" })
        }
      } catch {
        setInstructionsMessage({ type: "error", text: "Network error. Please try again." })
      } finally {
        setInstructionsSaving(false)
      }
    } else {
      // Fallback: save to localStorage
      try {
        localStorage.setItem(INSTRUCTIONS_KEY, customInstructions)
        setInstructionsMessage({ type: "success", text: "Instructions saved successfully" })
      } catch {
        setInstructionsMessage({ type: "error", text: "Failed to save instructions" })
      } finally {
        setInstructionsSaving(false)
      }
    }
  }

  // Theme
  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    if (newTheme === "dark") {
      root.classList.add("dark")
    } else if (newTheme === "light") {
      root.classList.remove("dark")
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      prefersDark ? root.classList.add("dark") : root.classList.remove("dark")
    }
  }

  const syncThemeModeFromApi = async () => {
    try {
      const res = await fetch("/api/user/preferences", { headers: getAuthHeaders() })
      if (res.ok) {
        const data = await res.json()
        const serverThemeMode = data.preferences?.themeMode as Theme | undefined
        if (serverThemeMode && serverThemeMode !== theme) {
          setTheme(serverThemeMode)
          localStorage.setItem(THEME_KEY, serverThemeMode)
          applyTheme(serverThemeMode)
        }
      }
    } catch (error) {
      console.error("Error syncing theme preferences:", error)
    }
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem(THEME_KEY, newTheme)
    applyTheme(newTheme)
    // Persist to API (fire-and-forget)
    fetch("/api/user/preferences", {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ themeMode: newTheme }),
    }).catch((err) => console.error("Error persisting theme mode:", err))
  }

  const handleFontSizeChange = (newSize: number) => {
    setFontSize(newSize)
    localStorage.setItem(FONT_SIZE_KEY, String(newSize))
    document.documentElement.style.setProperty("--base-font-size", `${newSize}px`)
  }

  const handleCodeThemeChange = (newCodeTheme: CodeTheme) => {
    setCodeTheme(newCodeTheme)
    localStorage.setItem(CODE_THEME_KEY, newCodeTheme)
  }

  // Profile save
  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setProfileMessage(null)
    try {
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ name }),
      })
      if (res.ok) {
        setProfileMessage({ type: "success", text: "Profile updated successfully" })
      } else {
        const data = await res.json()
        setProfileMessage({ type: "error", text: data.error || "Failed to update profile" })
      }
    } catch {
      setProfileMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setProfileSaving(false)
    }
  }

  // Password change
  const handleChangePassword = async () => {
    setPasswordChanging(true)
    setPasswordMessage(null)
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match" })
      setPasswordChanging(false)
      return
    }
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (res.ok) {
        setPasswordMessage({ type: "success", text: "Password changed successfully" })
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
      } else {
        const data = await res.json()
        setPasswordMessage({ type: "error", text: data.error || "Failed to change password" })
      }
    } catch {
      setPasswordMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setPasswordChanging(false)
    }
  }

  // Anthropic API key
  const handleTestAnthropicKey = async () => {
    setApiKeyTestStatus("testing")
    setApiKeyTestMessage("")
    try {
      const res = await fetch("/api/user/anthropic/test", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ apiKey: anthropicApiKey }),
      })
      const data = await res.json()
      if (res.ok) {
        setApiKeyTestStatus("success")
        setApiKeyTestMessage("API key is valid!")
      } else {
        setApiKeyTestStatus("error")
        setApiKeyTestMessage(data.error || "Validation failed")
      }
    } catch {
      setApiKeyTestStatus("error")
      setApiKeyTestMessage("Network error.")
    }
  }

  const handleSaveAnthropicKey = async () => {
    try {
      const res = await fetch("/api/user/anthropic", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ apiKey: anthropicApiKey }),
      })
      if (res.ok) {
        setApiKeyTestMessage("API key saved successfully")
        setApiKeyTestStatus("success")
        setHasExistingApiKey(true)
        setMaskedApiKey(anthropicApiKey.slice(0, 7) + "****" + anthropicApiKey.slice(-4))
        setAnthropicApiKey("")
      } else {
        const data = await res.json()
        setApiKeyTestMessage(data.error || "Failed to save")
        setApiKeyTestStatus("error")
      }
    } catch {
      setApiKeyTestMessage("Network error.")
      setApiKeyTestStatus("error")
    }
  }

  // MCP handlers
  const handleAddConnection = async (data: {
    name: string
    serverUrl: string
    authType: "none" | "api_key" | "oauth"
    oauthClientId?: string
    oauthClientSecret?: string
    apiKey?: string
  }) => {
    const res = await fetch("/api/mcp/connections", {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    })
    if (res.ok) {
      await fetchConnections()
    } else {
      const error = await res.json()
      throw new Error(error.message || "Failed to add connection")
    }
  }

  const handleConnect = async (id: string) => {
    await fetch(`/api/mcp/connections/${id}/test`, { method: "POST", headers: getAuthHeaders() })
    await fetchConnections()
  }

  const handleDisconnect = async (id: string) => {
    await fetch(`/api/mcp/connections/${id}`, {
      method: "PATCH",
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: "disconnected", isActive: false }),
    })
    await fetchConnections()
  }

  const handleEditConnection = (connection: McpConnectionData) => {
    setEditingConnection(connection)
    setShowAddDialog(true)
  }

  const handleDeleteConnection = async (id: string) => {
    await fetch(`/api/mcp/connections/${id}`, { method: "DELETE", headers: getAuthHeaders() })
    await fetchConnections()
  }

  const handleRefreshTools = async (id: string) => {
    await fetch(`/api/mcp/connections/${id}/discover`, { method: "POST", headers: getAuthHeaders() })
    await fetchConnections()
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50 animate-in fade-in-0 duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto flex w-full max-w-[820px] h-[min(640px,88vh)] rounded-xl border border-border bg-background shadow-2xl animate-in fade-in-0 zoom-in-95 duration-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Left sidebar */}
          <div className="flex w-[240px] shrink-0 flex-col border-r border-border p-3">
            <h2 className="mb-4 px-3 pt-1 text-lg font-semibold text-foreground">Settings</h2>
            <nav className="flex flex-col gap-0.5">
              {SETTINGS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <tab.icon className="size-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Right content */}
          <div className="flex flex-1 flex-col min-w-0">
            {/* Header with close button */}
            <div className="flex items-center justify-end p-3">
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
              {/* PROFILE TAB */}
              {activeTab === "profile" && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
                      Profile
                    </h3>

                    {!orgSlug ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <UserIcon className="mb-3 size-10 text-muted-foreground/50" />
                        <p className="text-sm font-medium text-foreground mb-1">Profile management</p>
                        <p className="text-xs text-muted-foreground">
                          Profile management is available in the organization context.
                        </p>
                      </div>
                    ) : orgProfileLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* Avatar section */}
                        <div className="flex items-start gap-5">
                          <div className="relative shrink-0">
                            <div className="size-[100px] rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                              {orgProfileAvatarPreview ? (
                                <img
                                  src={orgProfileAvatarPreview}
                                  alt="Avatar"
                                  className="size-full object-cover"
                                />
                              ) : (
                                <span className="text-2xl font-semibold text-muted-foreground">
                                  {(orgProfileName || orgProfile?.name || "U").slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 pt-2">
                            <input
                              ref={avatarInputRef}
                              type="file"
                              accept="image/png,image/jpeg"
                              className="hidden"
                              onChange={handleAvatarFileChange}
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => avatarInputRef.current?.click()}
                            >
                              <Upload className="mr-1.5 size-3.5" />
                              Upload Avatar
                            </Button>
                            {orgProfileAvatarPreview && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={handleRemoveAvatar}
                              >
                                <Trash2 className="mr-1.5 size-3.5" />
                                Remove Avatar
                              </Button>
                            )}
                            <p className="text-xs text-muted-foreground">
                              PNG or JPEG, auto-cropped to square, max 200KB
                            </p>
                          </div>
                        </div>

                        {/* Name field */}
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">Display Name</label>
                          <Input
                            value={orgProfileName}
                            onChange={(e) => setOrgProfileName(e.target.value)}
                            placeholder="Your name"
                          />
                        </div>

                        {/* Email field (read-only) */}
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                          <div className="relative">
                            <Input
                              value={orgProfile?.email || ""}
                              disabled
                              className="opacity-60 pr-9"
                            />
                            <Lock className="absolute right-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                        </div>

                        {/* Role field (read-only) */}
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1.5 block">Role</label>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              <Shield className="mr-1 size-3" />
                              {orgProfile?.roleName || "Member"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Role is managed by your administrator</p>
                        </div>

                        {/* Joined date */}
                        {orgProfile?.joinedAt && (
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">Joined</label>
                            <p className="text-sm text-muted-foreground">
                              {new Date(orgProfile.joinedAt).toLocaleDateString(undefined, {
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                        )}

                        {/* Save messages and button */}
                        {orgProfileMessage && (
                          <div className={cn(
                            "flex items-center gap-2 rounded-md p-3 text-sm",
                            orgProfileMessage.type === "success"
                              ? "bg-green-500/10 text-green-700 dark:text-green-400"
                              : "bg-destructive/10 text-destructive"
                          )}>
                            {orgProfileMessage.type === "success" ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
                            {orgProfileMessage.text}
                          </div>
                        )}
                        <Button size="sm" onClick={handleSaveOrgProfile} disabled={orgProfileSaving}>
                          {orgProfileSaving ? "Saving..." : "Save Changes"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* GENERAL TAB */}
              {activeTab === "general" && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
                      General Settings
                    </h3>

                    {/* Default Model */}
                    <div className="mb-6">
                      <label className="text-sm font-medium text-foreground mb-2 block">Default Model</label>
                      <select
                        value={defaultModel}
                        onChange={(e) => {
                          setDefaultModel(e.target.value)
                          onDefaultModelChange?.(e.target.value)
                        }}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {CLAUDE_MODELS.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Default Reasoning Level */}
                    <div className="mb-6">
                      <label className="text-sm font-medium text-foreground mb-2 block">Default Reasoning Level</label>
                      <div className="flex rounded-lg border border-border overflow-hidden">
                        {["Low", "Medium", "High"].map((level) => (
                          <button
                            key={level}
                            className={cn(
                              "flex-1 py-2.5 text-sm font-medium transition-colors",
                              level === "Medium"
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-foreground hover:bg-muted"
                            )}
                          >
                            {level}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Language */}
                    <div className="mb-6">
                      <label className="text-sm font-medium text-foreground mb-2 block">Language</label>
                      <select
                        className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        defaultValue="en-US"
                      >
                        <option value="en-US">English (US)</option>
                        <option value="en-GB">English (UK)</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                        <option value="ja">Japanese</option>
                      </select>
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Chat Behavior */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
                      Chat Behavior
                    </h3>

                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Send with Enter</p>
                          <p className="text-xs text-muted-foreground">Use Shift+Enter for new line</p>
                        </div>
                        <Switch checked={sendWithEnter} onCheckedChange={setSendWithEnter} />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">Show code execution results</p>
                          <p className="text-xs text-muted-foreground">Display output of code blocks</p>
                        </div>
                        <Switch checked={showCodeResults} onCheckedChange={setShowCodeResults} />
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Account */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
                      Account
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Display Name</label>
                        <Input
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Your name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
                        <Input value={email} disabled className="opacity-60" />
                        <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
                      </div>
                      {profileMessage && (
                        <div className={cn(
                          "flex items-center gap-2 rounded-md p-3 text-sm",
                          profileMessage.type === "success"
                            ? "bg-green-500/10 text-green-700 dark:text-green-400"
                            : "bg-destructive/10 text-destructive"
                        )}>
                          {profileMessage.type === "success" ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
                          {profileMessage.text}
                        </div>
                      )}
                      <Button size="sm" onClick={handleSaveProfile} disabled={profileSaving}>
                        {profileSaving ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </div>

                  <div className="border-t border-border" />

                  {/* Change Password */}
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
                      Change Password
                    </h3>

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Current Password</label>
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            className="absolute right-0 top-0 flex h-full items-center px-3 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">New Password</label>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            className="absolute right-0 top-0 flex h-full items-center px-3 text-muted-foreground hover:text-foreground"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Confirm New Password</label>
                        <Input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                      {passwordMessage && (
                        <div className={cn(
                          "flex items-center gap-2 rounded-md p-3 text-sm",
                          passwordMessage.type === "success"
                            ? "bg-green-500/10 text-green-700 dark:text-green-400"
                            : "bg-destructive/10 text-destructive"
                        )}>
                          {passwordMessage.type === "success" ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
                          {passwordMessage.text}
                        </div>
                      )}
                      <Button
                        size="sm"
                        onClick={handleChangePassword}
                        disabled={passwordChanging || !currentPassword || !newPassword || !confirmPassword}
                      >
                        {passwordChanging ? "Changing..." : "Change Password"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* APPEARANCE TAB */}
              {activeTab === "appearance" && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
                      Appearance
                    </h3>

                    {/* Theme */}
                    <div className="mb-6">
                      <label className="text-sm font-medium text-foreground mb-2 block">Theme</label>
                      <div className="flex rounded-lg border border-border overflow-hidden">
                        {([
                          { id: "light" as Theme, label: "Light", icon: Sun },
                          { id: "dark" as Theme, label: "Dark", icon: Moon },
                          { id: "system" as Theme, label: "System", icon: Monitor },
                        ]).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleThemeChange(t.id)}
                            className={cn(
                              "flex flex-1 items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors",
                              theme === t.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-foreground hover:bg-muted"
                            )}
                          >
                            <t.icon className="size-4" />
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Font Size */}
                    <div className="mb-6">
                      <label className="text-sm font-medium text-foreground mb-2 block">Font Size</label>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Small (14px)</span>
                          <span className="font-medium text-foreground">{fontSize}px</span>
                          <span>Large (20px)</span>
                        </div>
                        <input
                          type="range"
                          min="14"
                          max="20"
                          value={fontSize}
                          onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                          className="w-full accent-primary"
                        />
                        <p className="text-center text-sm text-muted-foreground" style={{ fontSize: `${fontSize}px` }}>
                          Sample text at {fontSize}px
                        </p>
                      </div>
                    </div>

                    {/* Code Theme */}
                    <div>
                      <label className="text-sm font-medium text-foreground mb-2 block">Code Theme</label>
                      <div className="flex rounded-lg border border-border overflow-hidden">
                        {([
                          { id: "github-dark" as CodeTheme, label: "GitHub Dark" },
                          { id: "one-dark-pro" as CodeTheme, label: "One Dark Pro" },
                          { id: "dracula" as CodeTheme, label: "Dracula" },
                        ]).map((ct) => (
                          <button
                            key={ct.id}
                            onClick={() => handleCodeThemeChange(ct.id)}
                            className={cn(
                              "flex-1 py-2.5 text-sm font-medium transition-colors",
                              codeTheme === ct.id
                                ? "bg-primary text-primary-foreground"
                                : "bg-background text-foreground hover:bg-muted"
                            )}
                          >
                            {ct.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* API KEYS TAB */}
              {activeTab === "api-keys" && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
                      Anthropic API
                    </h3>

                    {hasExistingApiKey && (
                      <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                        <div className="flex items-center gap-2 text-green-800 dark:text-green-400">
                          <Check className="size-4" />
                          <span className="text-sm font-medium">API key configured</span>
                        </div>
                        <p className="mt-1 text-xs text-green-700 dark:text-green-500">
                          Key: {maskedApiKey}
                        </p>
                      </div>
                    )}

                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1.5 block">Anthropic API Key</label>
                        <Input
                          type="password"
                          placeholder={hasExistingApiKey ? "Enter new key to update..." : "sk-ant-..."}
                          value={anthropicApiKey}
                          onChange={(e) => setAnthropicApiKey(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Your key starts with &quot;sk-ant-&quot;.{" "}
                          <a
                            href="https://console.anthropic.com/settings/keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-foreground"
                          >
                            Get your API key
                          </a>
                        </p>
                      </div>

                      {apiKeyTestMessage && (
                        <div className={cn(
                          "flex items-center gap-2 rounded-md p-3 text-sm",
                          apiKeyTestStatus === "success"
                            ? "bg-green-500/10 text-green-700 dark:text-green-400"
                            : apiKeyTestStatus === "error"
                              ? "bg-destructive/10 text-destructive"
                              : "bg-muted"
                        )}>
                          {apiKeyTestStatus === "success" && <Check className="size-4" />}
                          {apiKeyTestStatus === "error" && <AlertCircle className="size-4" />}
                          {apiKeyTestMessage}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleTestAnthropicKey}
                          disabled={apiKeyTestStatus === "testing" || !anthropicApiKey}
                        >
                          {apiKeyTestStatus === "testing" ? "Testing..." : "Test Key"}
                        </Button>
                        <Button size="sm" onClick={handleSaveAnthropicKey} disabled={!anthropicApiKey}>
                          Save Key
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* MCP TAB */}
              {activeTab === "mcp" && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      MCP Connectors
                    </h3>
                    <Button size="sm" onClick={() => setShowAddDialog(true)}>
                      <Plus className="mr-1.5 size-3.5" />
                      Add
                    </Button>
                  </div>

                  {mcpLoading ? (
                    <div className="space-y-3 py-4">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="rounded-lg border p-4 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 shrink-0 rounded-full bg-muted animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-4 w-1/3 rounded bg-muted animate-pulse" style={{ animationDelay: `${i * 100 + 50}ms` }} />
                              <div className="h-3 w-1/2 rounded bg-muted animate-pulse" style={{ animationDelay: `${i * 100 + 100}ms` }} />
                            </div>
                            <div className="h-6 w-14 rounded-full bg-muted animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : connections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Plug className="mb-3 size-10 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground mb-1">No connectors</p>
                      <p className="text-xs text-muted-foreground mb-4">
                        Connect MCP servers to extend Claude&apos;s capabilities.
                      </p>
                      <Button size="sm" onClick={() => setShowAddDialog(true)}>
                        <Plus className="mr-1.5 size-3.5" />
                        Add Connector
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {connections.map((connection) => (
                        <McpConnectionCard
                          key={connection.id}
                          connection={connection}
                          onConnect={handleConnect}
                          onDisconnect={handleDisconnect}
                          onEdit={handleEditConnection}
                          onDelete={handleDeleteConnection}
                          onRefresh={handleRefreshTools}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* INSTRUCTIONS TUNING TAB */}
              {activeTab === "instructions" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Custom Instructions
                    </h3>
                    <p className="text-sm text-muted-foreground mb-5">
                      Personalize how the AI responds to you. These instructions are added to every conversation.
                    </p>

                    {instructionsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {orgSlug ? (
                          <InstructionEditor
                            value={customInstructions}
                            onChange={setCustomInstructions}
                            maxTokens={200}
                            label="Custom Instructions"
                            description="Personalize how the AI responds to you. These instructions are added to every conversation."
                            disabled={!instructionsEnabled}
                            disabledMessage="Custom instructions disabled by your admin."
                          />
                        ) : (
                          <div>
                            <label className="text-sm font-medium text-foreground mb-1.5 block">
                              Custom Instructions
                            </label>
                            <textarea
                              value={customInstructions}
                              onChange={(e) => setCustomInstructions(e.target.value)}
                              placeholder="e.g., Always respond in a concise manner. Use code examples when explaining technical concepts. Prefer TypeScript over JavaScript..."
                              className="w-full min-h-[200px] rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                              rows={8}
                            />
                            <p className="text-xs text-muted-foreground mt-1.5">
                              These instructions will be included as context in every new conversation.
                            </p>
                          </div>
                        )}

                        {instructionsMessage && (
                          <div className={cn(
                            "flex items-center gap-2 rounded-md p-3 text-sm",
                            instructionsMessage.type === "success"
                              ? "bg-green-500/10 text-green-700 dark:text-green-400"
                              : "bg-destructive/10 text-destructive"
                          )}>
                            {instructionsMessage.type === "success" ? <Check className="size-4" /> : <AlertCircle className="size-4" />}
                            {instructionsMessage.text}
                          </div>
                        )}

                        {/* Hide save button when disabled (org context) */}
                        {(!orgSlug || instructionsEnabled) && (
                          <Button size="sm" onClick={handleSaveInstructions} disabled={instructionsSaving}>
                            {instructionsSaving ? "Saving..." : "Save Instructions"}
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* SESSIONS TAB */}
              {activeTab === "sessions" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                      Active Sessions
                    </h3>
                    <p className="text-sm text-muted-foreground mb-5">
                      Manage your active sessions across devices.
                    </p>

                    {!orgSlug ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Monitor className="mb-3 size-10 text-muted-foreground/50" />
                        <p className="text-sm font-medium text-foreground mb-1">Session management</p>
                        <p className="text-xs text-muted-foreground">
                          Session management is available in the organization context.
                        </p>
                      </div>
                    ) : sessionsLoading ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : sessions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Monitor className="mb-3 size-10 text-muted-foreground/50" />
                        <p className="text-sm font-medium text-foreground">No active sessions</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {sessions.length === 1 && sessions[0].isCurrent && (
                          <p className="text-sm text-muted-foreground mb-3">This is your only active session.</p>
                        )}
                        {sessions.map((session) => {
                          const DeviceIcon = getDeviceIcon(session.device)
                          return (
                            <div
                              key={session.id}
                              className={`rounded-lg border p-4 ${
                                session.isCurrent
                                  ? "border-green-500/30 bg-green-500/5 dark:border-green-500/20 dark:bg-green-500/5"
                                  : "border-border"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`flex size-9 items-center justify-center rounded-full ${
                                    session.isCurrent ? "bg-green-500/10" : "bg-muted"
                                  }`}>
                                    <DeviceIcon className={`size-4 ${
                                      session.isCurrent ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                                    }`} />
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium text-foreground">
                                      {session.browser} on {session.os}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {session.ipAddress || "Unknown IP"} &middot; {session.isCurrent ? "Active now" : `Active ${getRelativeTime(session.lastUsedAt)}`}
                                    </p>
                                  </div>
                                </div>
                                <div>
                                  {session.isCurrent ? (
                                    <Badge variant="outline" className="border-green-500/50 text-green-700 dark:text-green-400">
                                      Current Session
                                    </Badge>
                                  ) : sessionConfirmId === session.id ? (
                                    <div className="flex items-center gap-2">
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleRevokeSession(session.id)}
                                        disabled={revokingSessionId === session.id}
                                      >
                                        {revokingSessionId === session.id ? (
                                          <Loader2 className="size-3.5 animate-spin" />
                                        ) : (
                                          "Confirm"
                                        )}
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setSessionConfirmId(null)}
                                      >
                                        Cancel
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() => setSessionConfirmId(session.id)}
                                    >
                                      Revoke
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ADVANCED TAB */}
              {activeTab === "advanced" && (
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-5">
                      Advanced Settings
                    </h3>
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Sliders className="mb-3 size-10 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground mb-1">Coming soon</p>
                      <p className="text-xs text-muted-foreground">
                        Advanced settings for power users.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <McpAddDialog
        open={showAddDialog}
        onOpenChange={(openState) => {
          setShowAddDialog(openState)
          if (!openState) setEditingConnection(null)
        }}
        onAdd={handleAddConnection}
        editData={editingConnection}
      />
    </>
  )
}
