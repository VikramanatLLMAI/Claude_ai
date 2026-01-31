"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, User, Cloud, Plug, Palette, Moon, Sun, Monitor, Eye, EyeOff, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { McpConnectionCard, type McpConnectionData } from "@/components/mcp/mcp-connection-card"
import { McpAddDialog } from "@/components/mcp/mcp-add-dialog"

const AUTH_SESSION_KEY = "athena_auth_session"
const AUTH_TOKEN_KEY = "athena_auth_token"
const THEME_KEY = "athena_theme"
const FONT_SIZE_KEY = "athena_font_size"
const CODE_THEME_KEY = "athena_code_theme"

type Theme = "light" | "dark" | "system"
type CodeTheme = "github-dark" | "one-dark-pro" | "dracula"

export default function SettingsPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("profile")
  const [connections, setConnections] = useState<McpConnectionData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [editingConnection, setEditingConnection] = useState<McpConnectionData | null>(null)

  // Profile state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [passwordChanging, setPasswordChanging] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // AWS Settings state
  const [awsAccessKey, setAwsAccessKey] = useState("")
  const [awsSecretKey, setAwsSecretKey] = useState("")
  const [awsRegion, setAwsRegion] = useState("us-east-1")
  const [awsTestStatus, setAwsTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle")
  const [awsTestMessage, setAwsTestMessage] = useState("")
  const [hasExistingCredentials, setHasExistingCredentials] = useState(false)
  const [maskedAccessKey, setMaskedAccessKey] = useState("")

  // Appearance state
  const [theme, setTheme] = useState<Theme>("system")
  const [fontSize, setFontSize] = useState(16)
  const [codeTheme, setCodeTheme] = useState<CodeTheme>("github-dark")

  // Check authentication and load user data
  useEffect(() => {
    const session = window.localStorage.getItem(AUTH_SESSION_KEY)
    if (!session) {
      router.push("/")
      return
    }

    // Load theme preferences from localStorage
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null
    const savedFontSize = localStorage.getItem(FONT_SIZE_KEY)
    const savedCodeTheme = localStorage.getItem(CODE_THEME_KEY) as CodeTheme | null

    if (savedTheme) setTheme(savedTheme)
    if (savedFontSize) setFontSize(parseInt(savedFontSize))
    if (savedCodeTheme) setCodeTheme(savedCodeTheme)

    // Apply theme
    applyTheme(savedTheme || "system")

    // Load user profile
    loadUserProfile()
    loadAwsConfig()
  }, [router])

  const loadUserProfile = async () => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY) || ""
      const res = await fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setName(data.user.name || "")
        setEmail(data.user.email || "")
      }
    } catch (error) {
      console.error("Error loading profile:", error)
    }
  }

  const loadAwsConfig = async () => {
    try {
      const res = await fetch("/api/user/aws")
      if (res.ok) {
        const data = await res.json()
        setHasExistingCredentials(data.hasCredentials)
        setMaskedAccessKey(data.accessKeyId || "")
        setAwsRegion(data.region || "us-east-1")
      }
    } catch (error) {
      console.error("Error loading AWS config:", error)
    }
  }

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    if (newTheme === "dark") {
      root.classList.add("dark")
    } else if (newTheme === "light") {
      root.classList.remove("dark")
    } else {
      // System preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      if (prefersDark) {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    }
  }

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem(THEME_KEY, newTheme)
    applyTheme(newTheme)
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

  // Profile handlers
  const handleSaveProfile = async () => {
    setProfileSaving(true)
    setProfileMessage(null)
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY) || ""
      const res = await fetch("/api/user/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name }),
      })

      if (res.ok) {
        setProfileMessage({ type: "success", text: "Profile updated successfully" })
      } else {
        const data = await res.json()
        setProfileMessage({ type: "error", text: data.error || "Failed to update profile" })
      }
    } catch (error) {
      setProfileMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setProfileSaving(false)
    }
  }

  const handleChangePassword = async () => {
    setPasswordChanging(true)
    setPasswordMessage(null)

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match" })
      setPasswordChanging(false)
      return
    }

    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY) || ""
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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
    } catch (error) {
      setPasswordMessage({ type: "error", text: "Network error. Please try again." })
    } finally {
      setPasswordChanging(false)
    }
  }

  // Fetch MCP connections
  const fetchConnections = useCallback(async () => {
    try {
      const res = await fetch("/api/mcp/connections")
      if (res.ok) {
        const data = await res.json()
        setConnections(data)
      }
    } catch (error) {
      console.error("Error fetching MCP connections:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchConnections()
  }, [fetchConnections])

  // MCP Connection handlers
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
      headers: { "Content-Type": "application/json" },
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
    const res = await fetch(`/api/mcp/connections/${id}/test`, {
      method: "POST",
    })

    if (res.ok) {
      await fetchConnections()
    }
  }

  const handleDisconnect = async (id: string) => {
    await fetch(`/api/mcp/connections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "disconnected", isActive: false }),
    })
    await fetchConnections()
  }

  const handleEditConnection = (connection: McpConnectionData) => {
    setEditingConnection(connection)
    setShowAddDialog(true)
  }

  const handleDeleteConnection = async (id: string) => {
    await fetch(`/api/mcp/connections/${id}`, {
      method: "DELETE",
    })
    await fetchConnections()
  }

  const handleRefreshTools = async (id: string) => {
    await fetch(`/api/mcp/connections/${id}/discover`, {
      method: "POST",
    })
    await fetchConnections()
  }

  // AWS Test Connection
  const handleTestAwsConnection = async () => {
    setAwsTestStatus("testing")
    setAwsTestMessage("")

    try {
      const res = await fetch("/api/user/aws/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessKeyId: awsAccessKey,
          secretAccessKey: awsSecretKey,
          region: awsRegion,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setAwsTestStatus("success")
        setAwsTestMessage("Connection successful! AWS Bedrock is accessible.")
      } else {
        setAwsTestStatus("error")
        setAwsTestMessage(data.error || "Connection failed")
      }
    } catch (error) {
      setAwsTestStatus("error")
      setAwsTestMessage("Network error. Please check your connection.")
    }
  }

  const handleSaveAwsCredentials = async () => {
    try {
      const res = await fetch("/api/user/aws", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          accessKeyId: awsAccessKey,
          secretAccessKey: awsSecretKey,
          region: awsRegion,
        }),
      })

      if (res.ok) {
        setAwsTestMessage("AWS credentials saved successfully")
        setAwsTestStatus("success")
        setHasExistingCredentials(true)
        setMaskedAccessKey(awsAccessKey.slice(0, 4) + "****" + awsAccessKey.slice(-4))
        setAwsAccessKey("")
        setAwsSecretKey("")
      } else {
        const data = await res.json()
        setAwsTestMessage(data.error || "Failed to save credentials")
        setAwsTestStatus("error")
      }
    } catch (error) {
      setAwsTestMessage("Network error. Please try again.")
      setAwsTestStatus("error")
    }
  }

  return (
    <div className="h-screen overflow-y-auto bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Settings</h1>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-8 grid w-full grid-cols-4">
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            <TabsTrigger value="aws" className="gap-2">
              <Cloud className="h-4 w-4" />
              <span className="hidden sm:inline">AWS Bedrock</span>
            </TabsTrigger>
            <TabsTrigger value="mcp" className="gap-2">
              <Plug className="h-4 w-4" />
              <span className="hidden sm:inline">MCP Connectors</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="gap-2">
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Appearance</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>Manage your profile information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    placeholder="Your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} disabled />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
                {profileMessage && (
                  <div
                    className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                      profileMessage.type === "success"
                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {profileMessage.type === "success" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {profileMessage.text}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button onClick={handleSaveProfile} disabled={profileSaving}>
                  {profileSaving ? "Saving..." : "Save Changes"}
                </Button>
              </CardFooter>
            </Card>

            {/* Change Password */}
            <Card>
              <CardHeader>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
                {passwordMessage && (
                  <div
                    className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                      passwordMessage.type === "success"
                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {passwordMessage.type === "success" ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <AlertCircle className="h-4 w-4" />
                    )}
                    {passwordMessage.text}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  onClick={handleChangePassword}
                  disabled={passwordChanging || !currentPassword || !newPassword || !confirmPassword}
                >
                  {passwordChanging ? "Changing..." : "Change Password"}
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* AWS Bedrock Tab */}
          <TabsContent value="aws">
            <Card>
              <CardHeader>
                <CardTitle>AWS Bedrock Configuration</CardTitle>
                <CardDescription>
                  Configure your AWS credentials to access Claude models via Bedrock.{" "}
                  <a
                    href="https://docs.aws.amazon.com/bedrock/latest/userguide/model-access.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    Learn more
                  </a>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {hasExistingCredentials && (
                  <div className="rounded-md border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-900/20">
                    <div className="flex items-center gap-2 text-green-800 dark:text-green-400">
                      <Check className="h-5 w-5" />
                      <span className="font-medium">Credentials configured</span>
                    </div>
                    <p className="mt-1 text-sm text-green-700 dark:text-green-500">
                      Access Key: {maskedAccessKey} | Region: {awsRegion}
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="aws-access-key">AWS Access Key ID</Label>
                  <Input
                    id="aws-access-key"
                    placeholder={hasExistingCredentials ? "Enter new key to update..." : "AKIA..."}
                    value={awsAccessKey}
                    onChange={(e) => setAwsAccessKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aws-secret-key">AWS Secret Access Key</Label>
                  <Input
                    id="aws-secret-key"
                    type="password"
                    placeholder="Enter your secret key"
                    value={awsSecretKey}
                    onChange={(e) => setAwsSecretKey(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="aws-region">AWS Region</Label>
                  <Input
                    id="aws-region"
                    placeholder="us-east-1"
                    value={awsRegion}
                    onChange={(e) => setAwsRegion(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Common regions: us-east-1, us-west-2, eu-west-1, ap-northeast-1
                  </p>
                </div>

                {awsTestMessage && (
                  <div
                    className={`flex items-center gap-2 rounded-md p-3 text-sm ${
                      awsTestStatus === "success"
                        ? "bg-green-500/10 text-green-700 dark:text-green-400"
                        : awsTestStatus === "error"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted"
                    }`}
                  >
                    {awsTestStatus === "success" ? (
                      <Check className="h-4 w-4" />
                    ) : awsTestStatus === "error" ? (
                      <AlertCircle className="h-4 w-4" />
                    ) : null}
                    {awsTestMessage}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleTestAwsConnection}
                    disabled={awsTestStatus === "testing" || !awsAccessKey || !awsSecretKey}
                  >
                    {awsTestStatus === "testing" ? "Testing..." : "Test Connection"}
                  </Button>
                  <Button onClick={handleSaveAwsCredentials} disabled={!awsAccessKey || !awsSecretKey}>
                    Save Credentials
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* MCP Connectors Tab */}
          <TabsContent value="mcp">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">MCP Connectors</h2>
                  <p className="text-sm text-muted-foreground">
                    Manage connections to Model Context Protocol servers
                  </p>
                </div>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Connector
                </Button>
              </div>

              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-muted-foreground">Loading connections...</p>
                  </div>
                </div>
              ) : connections.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Plug className="mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="mb-2 text-lg font-medium">No MCP Connectors</h3>
                    <p className="mb-4 text-center text-sm text-muted-foreground">
                      Connect to MCP servers to extend Claude&apos;s capabilities with custom tools.
                    </p>
                    <Button onClick={() => setShowAddDialog(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Your First Connector
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
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
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Theme</CardTitle>
                <CardDescription>Choose your preferred color theme</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button
                    variant={theme === "light" ? "default" : "outline"}
                    onClick={() => handleThemeChange("light")}
                    className="flex-1 gap-2"
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </Button>
                  <Button
                    variant={theme === "dark" ? "default" : "outline"}
                    onClick={() => handleThemeChange("dark")}
                    className="flex-1 gap-2"
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </Button>
                  <Button
                    variant={theme === "system" ? "default" : "outline"}
                    onClick={() => handleThemeChange("system")}
                    className="flex-1 gap-2"
                  >
                    <Monitor className="h-4 w-4" />
                    System
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Font Size</CardTitle>
                <CardDescription>Adjust the base font size for better readability</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Small (14px)</span>
                    <span className="font-medium">{fontSize}px</span>
                    <span className="text-sm text-muted-foreground">Large (20px)</span>
                  </div>
                  <input
                    type="range"
                    min="14"
                    max="20"
                    value={fontSize}
                    onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                    className="w-full accent-primary"
                  />
                  <p className="text-center text-sm" style={{ fontSize: `${fontSize}px` }}>
                    Sample text at {fontSize}px
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Code Theme</CardTitle>
                <CardDescription>Select the syntax highlighting theme for code blocks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {[
                    { id: "github-dark" as CodeTheme, label: "GitHub Dark" },
                    { id: "one-dark-pro" as CodeTheme, label: "One Dark Pro" },
                    { id: "dracula" as CodeTheme, label: "Dracula" },
                  ].map((option) => (
                    <Badge
                      key={option.id}
                      variant={codeTheme === option.id ? "default" : "outline"}
                      className="cursor-pointer px-4 py-2"
                      onClick={() => handleCodeThemeChange(option.id)}
                    >
                      {codeTheme === option.id && <Check className="mr-1 h-3 w-3" />}
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <McpAddDialog
        open={showAddDialog}
        onOpenChange={(open) => {
          setShowAddDialog(open)
          if (!open) setEditingConnection(null)
        }}
        onAdd={handleAddConnection}
        editData={editingConnection}
      />
    </div>
  )
}
