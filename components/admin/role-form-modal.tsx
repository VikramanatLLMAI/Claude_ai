"use client"

import * as React from "react"
import { Settings, Cpu, Gauge, ShieldCheck, Sparkles, Loader2, Info } from "lucide-react"
import { getIcon, getIconNames, type PromptSuggestion } from "@/lib/icon-map"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { RoleModelAssignment } from "@/components/admin/role-model-assignment"
import { toast } from "@/components/ui/toast"
import type { RoleData } from "@/components/admin/role-card"

const AUTH_TOKEN_KEY = "llmatscale_auth_token"

interface RoleFormModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  role?: RoleData
  orgSlug: string
  onSuccess: () => void
}

/**
 * RoleFormModal -- 5-tab create/edit modal for role configuration.
 *
 * Tabs:
 * 1. General (Settings icon): name, description
 * 2. Models & Tools (Cpu icon): model assignment + MCP note
 * 3. Limits (Gauge icon): daily request/token limits with toggle+input
 * 4. Permissions (ShieldCheck icon): custom instructions toggle, personal MCP toggle+count
 * 5. Suggestions (Sparkles icon): 4 prompt suggestion chips for welcome screen
 *
 * Create mode: POST /api/org/[slug]/admin/roles
 * Edit mode:   PUT /api/org/[slug]/admin/roles/[roleId]
 */
export function RoleFormModal({
  open,
  onOpenChange,
  mode,
  role,
  orgSlug,
  onSuccess,
}: RoleFormModalProps) {
  // Form state
  const [name, setName] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [allowedModels, setAllowedModels] = React.useState<string[]>([])
  const [requestLimitEnabled, setRequestLimitEnabled] = React.useState(false)
  const [dailyRequestLimit, setDailyRequestLimit] = React.useState<number>(100)
  const [tokenLimitEnabled, setTokenLimitEnabled] = React.useState(false)
  const [dailyTokenLimit, setDailyTokenLimit] = React.useState<number>(1000000)
  const [customInstructionsEnabled, setCustomInstructionsEnabled] = React.useState(true)
  const [personalMcpEnabled, setPersonalMcpEnabled] = React.useState(false)
  const [personalMcpMaxCount, setPersonalMcpMaxCount] = React.useState<number>(3)
  const [promptSuggestions, setPromptSuggestions] = React.useState<PromptSuggestion[]>([
    { icon: "Pencil", label: "", prompt: "" },
    { icon: "BookOpen", label: "", prompt: "" },
    { icon: "Code2", label: "", prompt: "" },
    { icon: "Home", label: "", prompt: "" },
  ])
  const [saving, setSaving] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("general")

  // Initialize form state when modal opens or role changes
  React.useEffect(() => {
    if (open) {
      setActiveTab("general")
      if (mode === "edit" && role) {
        setName(role.name)
        setDescription(role.description || "")
        setAllowedModels(Array.isArray(role.allowedModels) ? (role.allowedModels as string[]) : [])
        setRequestLimitEnabled(role.dailyRequestLimit !== null)
        setDailyRequestLimit(role.dailyRequestLimit ?? 100)
        setTokenLimitEnabled(role.dailyTokenLimit !== null)
        setDailyTokenLimit(role.dailyTokenLimit ?? 1000000)
        setCustomInstructionsEnabled(role.customInstructionsEnabled)
        setPersonalMcpEnabled(role.personalMcpEnabled)
        setPersonalMcpMaxCount(role.personalMcpMaxCount)
        if (role.promptSuggestions && Array.isArray(role.promptSuggestions) && role.promptSuggestions.length > 0) {
          setPromptSuggestions(role.promptSuggestions as PromptSuggestion[])
        } else {
          setPromptSuggestions([
            { icon: "Pencil", label: "", prompt: "" },
            { icon: "BookOpen", label: "", prompt: "" },
            { icon: "Code2", label: "", prompt: "" },
            { icon: "Home", label: "", prompt: "" },
          ])
        }
      } else {
        // Create mode defaults
        setName("")
        setDescription("")
        setAllowedModels([])
        setRequestLimitEnabled(false)
        setDailyRequestLimit(100)
        setTokenLimitEnabled(false)
        setDailyTokenLimit(1000000)
        setCustomInstructionsEnabled(true)
        setPersonalMcpEnabled(false)
        setPersonalMcpMaxCount(3)
        setPromptSuggestions([
          { icon: "Pencil", label: "", prompt: "" },
          { icon: "BookOpen", label: "", prompt: "" },
          { icon: "Code2", label: "", prompt: "" },
          { icon: "Home", label: "", prompt: "" },
        ])
      }
    }
  }, [open, mode, role])

  // Handle save
  const handleSave = React.useCallback(async () => {
    // Client-side validation
    if (!name.trim() || name.trim().length < 3) {
      toast.error("Role name must be at least 3 characters")
      setActiveTab("general")
      return
    }
    if (name.trim().length > 50) {
      toast.error("Role name must be at most 50 characters")
      setActiveTab("general")
      return
    }
    if (description.length > 200) {
      toast.error("Description must be at most 200 characters")
      setActiveTab("general")
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY)
      // Filter out empty suggestions (all fields empty = use defaults)
      const filteredSuggestions = promptSuggestions.filter(s => s.label.trim() || s.prompt.trim())
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        allowedModels,
        customInstructionsEnabled,
        personalMcpEnabled,
        personalMcpMaxCount: personalMcpEnabled ? personalMcpMaxCount : 0,
        dailyRequestLimit: requestLimitEnabled ? dailyRequestLimit : null,
        dailyTokenLimit: tokenLimitEnabled ? dailyTokenLimit : null,
        promptSuggestions: filteredSuggestions.length > 0 ? filteredSuggestions : [],
      }

      const url = mode === "create"
        ? `/api/org/${orgSlug}/admin/roles`
        : `/api/org/${orgSlug}/admin/roles/${role?.id}`

      const method = mode === "create" ? "POST" : "PUT"

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to ${mode} role`)
      }

      toast.success(
        mode === "create"
          ? `Role "${name.trim()}" created`
          : `Role "${name.trim()}" updated`
      )
      onOpenChange(false)
      onSuccess()
    } catch (err) {
      const message = err instanceof Error ? err.message : `Failed to ${mode} role`
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }, [
    name, description, allowedModels, customInstructionsEnabled,
    personalMcpEnabled, personalMcpMaxCount, requestLimitEnabled,
    dailyRequestLimit, tokenLimitEnabled, dailyTokenLimit,
    promptSuggestions, mode, role, orgSlug, onOpenChange, onSuccess,
  ])

  // Model change handler for RoleModelAssignment (no-op save -- we collect state only)
  const handleModelsChange = React.useCallback(async (modelIds: string[]) => {
    setAllowedModels(modelIds)
  }, [])

  // Update a single suggestion field
  const updateSuggestion = React.useCallback((index: number, field: keyof PromptSuggestion, value: string) => {
    setPromptSuggestions(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }, [])

  // Available icon names for selector
  const iconNames = React.useMemo(() => getIconNames(), [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Role" : `Edit Role: ${role?.name}`}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Configure a new custom role for your organization."
              : "Update role settings including model access, limits, and permissions."}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="general" className="gap-1.5 text-xs sm:text-sm">
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">General</span>
            </TabsTrigger>
            <TabsTrigger value="models" className="gap-1.5 text-xs sm:text-sm">
              <Cpu className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Models</span>
            </TabsTrigger>
            <TabsTrigger value="limits" className="gap-1.5 text-xs sm:text-sm">
              <Gauge className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Limits</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-1.5 text-xs sm:text-sm">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Permissions</span>
            </TabsTrigger>
            <TabsTrigger value="suggestions" className="gap-1.5 text-xs sm:text-sm">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Suggestions</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: General */}
          <TabsContent value="general" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="role-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="role-name"
                placeholder="e.g., Developer, Analyst, Support"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">
                {name.length}/50 characters (minimum 3)
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-description">Description</Label>
              <textarea
                id="role-description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder="Brief description of this role's purpose..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/200 characters (optional)
              </p>
            </div>
          </TabsContent>

          {/* Tab 2: Models & Tools */}
          <TabsContent value="models" className="space-y-4 mt-4">
            <div>
              <h3 className="text-sm font-medium mb-3">Model Access</h3>
              <RoleModelAssignment
                roleId={role?.id || "new"}
                orgSlug={orgSlug}
                allowedModels={allowedModels}
                onSave={handleModelsChange}
              />
            </div>
            <div className="border-t border-border pt-4">
              <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
                <Info className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  MCP server assignments are managed from the MCP Servers page.
                  Org-wide and role-specific MCP assignments can be configured there.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Tab 3: Limits */}
          <TabsContent value="limits" className="space-y-6 mt-4">
            {/* Daily Request Limit */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="request-limit-toggle" className="text-sm">
                    Enable daily request limit
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Limit the number of chat requests per day for users in this role.
                  </p>
                </div>
                <Switch
                  id="request-limit-toggle"
                  checked={requestLimitEnabled}
                  onCheckedChange={setRequestLimitEnabled}
                />
              </div>
              {requestLimitEnabled && (
                <div className="ml-0 flex items-center gap-3">
                  <Label htmlFor="daily-request-limit" className="text-sm whitespace-nowrap">
                    Requests per day
                  </Label>
                  <Input
                    id="daily-request-limit"
                    type="number"
                    min={1}
                    className="w-28"
                    value={dailyRequestLimit}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val) && val > 0) {
                        setDailyRequestLimit(val)
                      }
                    }}
                  />
                </div>
              )}
            </div>

            {/* Daily Token Limit */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="token-limit-toggle" className="text-sm">
                    Enable daily token limit
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Limit the total tokens (input + output) per day for users in this role.
                  </p>
                </div>
                <Switch
                  id="token-limit-toggle"
                  checked={tokenLimitEnabled}
                  onCheckedChange={setTokenLimitEnabled}
                />
              </div>
              {tokenLimitEnabled && (
                <div className="ml-0 flex items-center gap-3">
                  <Label htmlFor="daily-token-limit" className="text-sm whitespace-nowrap">
                    Tokens per day
                  </Label>
                  <Input
                    id="daily-token-limit"
                    type="number"
                    min={1}
                    className="w-36"
                    value={dailyTokenLimit}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val) && val > 0) {
                        setDailyTokenLimit(val)
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 4: Permissions */}
          <TabsContent value="permissions" className="space-y-6 mt-4">
            {/* Custom Instructions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="custom-instructions-toggle" className="text-sm">
                    Allow custom instructions
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, users in this role can write personal custom instructions
                    that are appended to the system prompt.
                  </p>
                </div>
                <Switch
                  id="custom-instructions-toggle"
                  checked={customInstructionsEnabled}
                  onCheckedChange={setCustomInstructionsEnabled}
                />
              </div>
            </div>

            {/* Personal MCP Servers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="personal-mcp-toggle" className="text-sm">
                    Allow personal MCP servers
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, users can add their own MCP server connections
                    for custom tool integrations.
                  </p>
                </div>
                <Switch
                  id="personal-mcp-toggle"
                  checked={personalMcpEnabled}
                  onCheckedChange={setPersonalMcpEnabled}
                />
              </div>
              {personalMcpEnabled && (
                <div className="ml-0 flex items-center gap-3">
                  <Label htmlFor="mcp-max-count" className="text-sm whitespace-nowrap">
                    Max servers per user
                  </Label>
                  <Input
                    id="mcp-max-count"
                    type="number"
                    min={1}
                    max={20}
                    className="w-20"
                    value={personalMcpMaxCount}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10)
                      if (!isNaN(val) && val >= 1 && val <= 20) {
                        setPersonalMcpMaxCount(val)
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </TabsContent>

          {/* Tab 5: Suggestions */}
          <TabsContent value="suggestions" className="space-y-6 mt-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">
                Configure 4 starter prompt suggestions shown on the chat welcome screen for users with this role.
                Leave all fields empty to use defaults.
              </p>
            </div>
            {promptSuggestions.map((suggestion, index) => {
              const IconPreview = getIcon(suggestion.icon)
              return (
                <div key={index} className="space-y-3 p-4 rounded-lg border">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <IconPreview className="size-4" />
                    Suggestion {index + 1}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Icon</Label>
                      <select
                        value={suggestion.icon}
                        onChange={(e) => updateSuggestion(index, "icon", e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        {iconNames.map((iconName) => (
                          <option key={iconName} value={iconName}>
                            {iconName}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Label</Label>
                      <Input
                        value={suggestion.label}
                        onChange={(e) => updateSuggestion(index, "label", e.target.value)}
                        placeholder="e.g., Write"
                        maxLength={30}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Prompt text</Label>
                    <textarea
                      value={suggestion.prompt}
                      onChange={(e) => updateSuggestion(index, "prompt", e.target.value)}
                      placeholder="e.g., Help me write a professional email about..."
                      maxLength={500}
                      rows={2}
                      className="w-full px-3 py-2 text-sm rounded-md border border-input bg-transparent resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground text-right">{suggestion.prompt.length}/500</p>
                  </div>
                </div>
              )
            })}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPromptSuggestions([
                { icon: "Pencil", label: "", prompt: "" },
                { icon: "BookOpen", label: "", prompt: "" },
                { icon: "Code2", label: "", prompt: "" },
                { icon: "Home", label: "", prompt: "" },
              ])}
              className="text-muted-foreground"
            >
              Reset to defaults
            </Button>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? "Create Role" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
