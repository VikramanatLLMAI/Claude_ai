"use client"

import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/prompt-kit/chat-container"
import {
  Message,
  MessageAvatar,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input"
import { ScrollButton } from "@/components/prompt-kit/scroll-button"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useChat } from "@ai-sdk/react"
import { type UIMessage, DefaultChatTransport } from "ai"
import {
  ArrowUp,
  Bot,
  Check,
  ChevronUp,
  Copy,
  FolderOpen,
  Globe,
  Grid2X2,
  LogOut,
  MessageSquare,
  Mic,
  MoreHorizontal,
  Pencil,
  Pin,
  PinOff,
  Plug,
  Plus,
  Settings,
  Share2,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash,
  User2,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useKeyboardShortcuts, CHAT_SHORTCUTS } from "@/hooks/use-keyboard-shortcuts"
import { motion, AnimatePresence } from "motion/react"
import { extractArtifacts, hasArtifacts, getTextBeforeArtifact, getTextAfterArtifact, isArtifactStreaming, getStreamingArtifact, type Artifact } from "@/lib/artifacts"
import { ArtifactTile } from "@/components/artifact-tile"
import { ArtifactPreview } from "@/components/artifact-preview"
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from "react-resizable-panels"
import { Tool, extractToolParts, type ToolPart } from "@/components/prompt-kit/tool"
import { Loader } from "@/components/prompt-kit/loader"
import { Reasoning, ReasoningTrigger, ReasoningContent } from "@/components/prompt-kit/reasoning"
import { TextShimmer } from "@/components/prompt-kit/text-shimmer"
import { FeedbackBar } from "@/components/prompt-kit/feedback-bar"
import { PromptSuggestion, type Suggestion } from "@/components/prompt-kit/prompt-suggestion"
import { SystemMessage } from "@/components/prompt-kit/system-message"
import { StreamingText } from "@/components/prompt-kit/streaming-text"
import { Markdown } from "@/components/prompt-kit/markdown"
import Link from "next/link"
import Image from "next/image"

// Claude 4.5 series models
const CLAUDE_MODELS = [
  {
    id: "us.anthropic.claude-sonnet-4-5-20250929-v1:0",
    name: "Claude 4.5 Sonnet",
    description: "Most intelligent model, best for complex tasks",
  },
  {
    id: "us.anthropic.claude-haiku-4-5-20251001-v1:0",
    name: "Claude 4.5 Haiku",
    description: "Fast and efficient for simple tasks",
  },
  {
    id: "anthropic.claude-opus-4-1-20250805-v1:0",
    name: "Claude 4.1 Opus",
    description: "Best for complex reasoning and analysis",
  },
  {
    id: "us.anthropic.claude-sonnet-4-20250514-v1:0",
    name: "Claude 4 Sonnet",
    description: "Balanced performance and speed",
  },
] as const

type ClaudeModelId = (typeof CLAUDE_MODELS)[number]["id"]

// Database conversation type
interface Conversation {
  id: string
  title: string
  isPinned: boolean
  isShared: boolean
  model: string
  solutionType: string | null
  createdAt: string
  updatedAt: string
  lastMessage: string | null
}

const AUTH_SESSION_KEY = "athena_auth_session"
const AUTH_TOKEN_KEY = "athena_auth_token"

// Helper function to get auth headers for API calls
function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem(AUTH_TOKEN_KEY) || "" : ""
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  }
}

// Helper function to get user name from session
function getUserNameFromSession(): string {
  if (typeof window === 'undefined') return "User"
  try {
    const sessionData = localStorage.getItem(AUTH_SESSION_KEY)
    if (sessionData) {
      const session = JSON.parse(sessionData)
      return session.user?.name || session.user?.email?.split('@')[0] || "User"
    }
  } catch {
    // Ignore parse errors
  }
  return "User"
}

// Solution type display names
const SOLUTION_NAMES: Record<string, string> = {
  'manufacturing': 'Manufacturing',
  'maintenance': 'Maintenance',
  'support': 'Support',
  'change-management': 'Change Mgmt',
  'impact-analysis': 'Impact Analysis',
  'requirements': 'Requirements',
}

// MCP Connections Submenu Component
function McpConnectionsSubmenu({
  activeMcpIds,
  onToggle,
}: {
  activeMcpIds: string[]
  onToggle: (connectionId: string, isActive: boolean) => void
}) {
  const [connections, setConnections] = useState<{
    id: string
    name: string
    status: string
    availableTools?: { name: string }[]
  }[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchConnections = async () => {
      try {
        const res = await fetch("/api/mcp/connections", {
          headers: getAuthHeaders(),
        })
        if (res.ok) {
          const data = await res.json()
          setConnections(data)
        }
      } catch {
        // Silently fail - MCP connections are optional
      } finally {
        setIsLoading(false)
      }
    }
    fetchConnections()
  }, [])

  const connectedConnections = connections.filter((c) => c.status === "connected")

  if (isLoading) {
    return (
      <div className="px-2 py-3 text-center text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (connections.length === 0) {
    return (
      <div className="px-2 py-3 text-center">
        <Plug className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">No MCP connections</p>
        <a href="/settings?tab=mcp" className="text-xs text-primary hover:underline">
          Add Connection
        </a>
      </div>
    )
  }

  if (connectedConnections.length === 0) {
    return (
      <div className="px-2 py-3 text-center">
        <p className="text-xs text-muted-foreground">No connected servers</p>
        <a href="/settings?tab=mcp" className="text-xs text-primary hover:underline">
          Manage Connections
        </a>
      </div>
    )
  }

  return (
    <>
      {connectedConnections.map((connection) => {
        const isActive = activeMcpIds.includes(connection.id)
        const toolCount = connection.availableTools?.length || 0

        return (
          <div
            key={connection.id}
            className="grid grid-cols-[1fr_auto] items-center gap-2 px-2 py-2"
          >
            <div className="flex flex-col overflow-hidden">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
                <Label
                  htmlFor={`mcp-${connection.id}`}
                  className="font-medium cursor-pointer truncate"
                  title={connection.name}
                >
                  {connection.name}
                </Label>
              </div>
              <span className="text-xs text-muted-foreground ml-4 truncate">
                {toolCount} tool{toolCount !== 1 ? "s" : ""}
              </span>
            </div>
            <Switch
              id={`mcp-${connection.id}`}
              checked={isActive}
              onCheckedChange={(checked) => onToggle(connection.id, checked)}
              className="shrink-0"
            />
          </div>
        )
      })}
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild>
        <a href="/settings?tab=mcp" className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          Manage Connections
        </a>
      </DropdownMenuItem>
    </>
  )
}

function ChatSidebar({
  conversations,
  selectedId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onPinConversation,
  onShareConversation,
  solutionType,
  userName,
}: {
  conversations: Conversation[]
  selectedId: string | null
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  onDeleteConversation: (id: string) => void
  onPinConversation: (id: string, isPinned: boolean) => void
  onShareConversation: (id: string) => void
  solutionType?: string | null
  userName: string
}) {
  const router = useRouter()

  const handleSignOut = () => {
    window.localStorage.removeItem(AUTH_SESSION_KEY)
    window.localStorage.removeItem(AUTH_TOKEN_KEY)
    router.push("/")
  }

  // Navigate back to solutions page
  const handleBackToSolutions = () => {
    router.push("/solutions")
  }

  // Ensure conversations is always an array
  const safeConversations = Array.isArray(conversations) ? conversations : []
  const pinnedConversations = safeConversations.filter((c) => c.isPinned)
  const unpinnedConversations = safeConversations.filter((c) => !c.isPinned)

  // Get display name for current solution
  const solutionDisplayName = solutionType ? SOLUTION_NAMES[solutionType] || solutionType : 'General Chat'

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <div className="flex w-full items-center justify-between gap-2 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center">
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-medium">
              LLMatscale.ai
            </span>
            {solutionType && (
              <span className="text-xs text-muted-foreground">
                {solutionDisplayName}
              </span>
            )}
          </div>
          <SidebarTrigger className="size-8 shrink-0 border-0 bg-transparent shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-1">
        <SidebarGroup className="gap-0 group-data-[collapsible=icon]:px-0">
          <SidebarMenu className="group-data-[collapsible=icon]:items-center">
            <SidebarMenuButton tooltip={`New ${solutionDisplayName} chat`} onClick={onNewChat}>
              <Plus className="size-4" />
              <span>New chat</span>
            </SidebarMenuButton>
            <SidebarMenuButton tooltip="All Solutions" onClick={handleBackToSolutions}>
              <Grid2X2 className="size-4" />
              <span>Solutions</span>
            </SidebarMenuButton>
            <SidebarMenuButton tooltip="Projects">
              <FolderOpen className="size-4" />
              <span>Projects</span>
            </SidebarMenuButton>
          </SidebarMenu>
        </SidebarGroup>

        {/* Pinned Conversations */}
        {pinnedConversations.length > 0 && (
          <SidebarGroup className="group-data-[collapsible=icon]:px-0">
            <SidebarGroupLabel className="text-xs group-data-[collapsible=icon]:hidden">
              Pinned
            </SidebarGroupLabel>
            <SidebarMenu className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center">
              <SidebarMenuButton tooltip="Pinned">
                <Pin className="size-4" />
                <span>Pinned</span>
              </SidebarMenuButton>
            </SidebarMenu>
            <SidebarMenu className="group-data-[collapsible=icon]:hidden">
              {pinnedConversations.map((conversation) => (
                <SidebarMenuItem key={conversation.id} className="group/item">
                  <SidebarMenuButton
                    isActive={conversation.id === selectedId}
                    onClick={() => onSelectConversation(conversation.id)}
                    className="pr-8"
                  >
                    <Pin className="size-3 text-muted-foreground" />
                    <span className="truncate">{conversation.title}</span>
                  </SidebarMenuButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 size-6 -translate-y-1/2 opacity-0 transition-opacity group-hover/item:opacity-100 data-[state=open]:opacity-100"
                      >
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => onPinConversation(conversation.id, false)}>
                        <PinOff className="mr-2 size-4" />
                        <span>Unpin</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onShareConversation(conversation.id)}>
                        <Share2 className="mr-2 size-4" />
                        <span>Share</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDeleteConversation(conversation.id)}
                      >
                        <Trash className="mr-2 size-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        )}

        {/* Recent Conversations */}
        <SidebarGroup className="group-data-[collapsible=icon]:px-0">
          <SidebarGroupLabel className="text-xs group-data-[collapsible=icon]:hidden">
            Recents
          </SidebarGroupLabel>
          {/* Single Recents icon shown only when collapsed */}
          <SidebarMenu className="hidden group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:items-center">
            <SidebarMenuButton tooltip="Recents">
              <MessageSquare className="size-4" />
              <span>Recents</span>
            </SidebarMenuButton>
          </SidebarMenu>
          {/* Chat history shown only when expanded */}
          <SidebarMenu className="group-data-[collapsible=icon]:hidden">
            {unpinnedConversations.length === 0 ? (
              <div className="px-2 py-4 text-center text-xs text-muted-foreground">
                No conversations yet
              </div>
            ) : (
              unpinnedConversations.map((conversation) => (
                <SidebarMenuItem key={conversation.id} className="group/item">
                  <SidebarMenuButton
                    isActive={conversation.id === selectedId}
                    onClick={() => onSelectConversation(conversation.id)}
                    className="pr-8"
                  >
                    <span className="truncate">{conversation.title}</span>
                  </SidebarMenuButton>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 size-6 -translate-y-1/2 opacity-0 transition-opacity group-hover/item:opacity-100 data-[state=open]:opacity-100"
                      >
                        <MoreHorizontal className="size-4" />
                        <span className="sr-only">More options</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                      <DropdownMenuItem onClick={() => onPinConversation(conversation.id, true)}>
                        <Pin className="mr-2 size-4" />
                        <span>Pin</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onShareConversation(conversation.id)}>
                        <Share2 className="mr-2 size-4" />
                        <span>Share</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => onDeleteConversation(conversation.id)}
                      >
                        <Trash className="mr-2 size-4" />
                        <span>Delete</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </SidebarMenuItem>
              ))
            )}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  tooltip="Account"
                >
                  <User2 className="size-4" />
                  <span>{userName}</span>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <User2 className="mr-2 size-4" />
                    <span>Profile</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings">
                    <Settings className="mr-2 size-4" />
                    <span>Settings</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 size-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

function ChatContent({
  conversationId,
  selectedModel,
  setSelectedModel,
  onConversationCreated,
  solutionType,
}: {
  conversationId: string | null
  selectedModel: ClaudeModelId
  setSelectedModel: (model: ClaudeModelId) => void
  onConversationCreated: (id: string) => void
  solutionType: string | null
}) {
  const [webSearchEnabled, setWebSearchEnabled] = useState(false)
  const [activeMcpIds, setActiveMcpIds] = useState<string[]>([])
  const mcpLoadedRef = useRef(false) // Track if MCP connections have been loaded

  // Load connected MCP connections and enable them by default
  useEffect(() => {
    if (mcpLoadedRef.current) return
    mcpLoadedRef.current = true

    const loadConnectedMcps = async () => {
      try {
        const res = await fetch("/api/mcp/connections", {
          headers: getAuthHeaders(),
        })
        if (res.ok) {
          const connections = await res.json()
          // Enable all connected MCPs by default
          const connectedIds = connections
            .filter((c: { status: string }) => c.status === "connected")
            .map((c: { id: string }) => c.id)
          if (connectedIds.length > 0) {
            setActiveMcpIds(connectedIds)
          }
        }
      } catch {
        // Silently fail - MCP connections are optional
      }
    }
    loadConnectedMcps()
  }, [])

  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [input, setInput] = useState("")
  const pendingMessageRef = useRef<{ text: string; messageId: string } | null>(null)
  const currentConversationRef = useRef<string | null>(null)
  const isNewConversationRef = useRef(false) // Track if we just created a new conversation
  const optimisticMessageCounterRef = useRef(0)

  // Artifact state - use refs to prevent re-render loops
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null)
  const [allArtifacts, setAllArtifacts] = useState<Artifact[]>([])
  const [activeArtifactIndex, setActiveArtifactIndex] = useState(0)
  const [showArtifactPreview, setShowArtifactPreview] = useState(false)
  const [isStreamingArtifact, setIsStreamingArtifact] = useState(false)
  const userClosedArtifactRef = useRef<boolean>(false) // Track if user manually closed
  const lastDetectedArtifactIdRef = useRef<string | null>(null) // Track last detected artifact to prevent re-opening
  const showArtifactPreviewRef = useRef<boolean>(false) // Ref version to avoid callback recreation
  const artifactMessageIdRef = useRef<string | null>(null) // Track which message owns the current artifacts
  const manuallySelectedArtifactRef = useRef<boolean>(false) // Track if artifact was manually clicked (not auto-detected)

  const [modelJustChanged, setModelJustChanged] = useState(false)
  const prevModelRef = useRef<string>(selectedModel)

  // Keep ref in sync with state to avoid callback recreation
  useEffect(() => {
    showArtifactPreviewRef.current = showArtifactPreview
  }, [showArtifactPreview])

  // Track model changes for SystemMessage notification
  useEffect(() => {
    if (prevModelRef.current !== selectedModel) {
      setModelJustChanged(true)
      prevModelRef.current = selectedModel
      // Auto-dismiss after 3 seconds
      const timer = setTimeout(() => setModelJustChanged(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [selectedModel])

  // Get personalized suggestions based on solution type
  const suggestions = useMemo((): Suggestion[] => {
    switch (solutionType) {
      case "manufacturing":
        return [
          { label: "Show defects by machine for last month", description: "Natural language MES query", highlighted: true },
          { label: "Generate weekly production report", description: "Automated reporting with yield trends", highlighted: true },
          { label: "Drill down from plant to operator level", description: "Plant → Line → Operation → Equipment" },
          { label: "Predict output for next week", description: "AI forecasting based on current performance" },
          { label: "Show operator performance trends", description: "Cycle time and error analysis" },
          { label: "Trace product genealogy", description: "AI-assisted traceability mapping" },
        ]
      case "maintenance":
        return [
          { label: "Calculate MTBF for all machines", description: "From MES downtime logs", highlighted: true },
          { label: "Predict upcoming failure probabilities", description: "AI-based failure prediction", highlighted: true },
          { label: "Show MTTR trends this month", description: "Mean time to repair analysis" },
          { label: "Identify recurring failure modes", description: "Top failures impacting MTBF/MTTR" },
          { label: "Create maintenance dashboard", description: "Daily/weekly/monthly trends" },
          { label: "Evaluate supplier performance", description: "Recommendations based on failure patterns" },
        ]
      case "support":
        return [
          { label: "Suggest root cause for this issue", description: "With similar past ticket references", highlighted: true },
          { label: "Recommend troubleshooting steps", description: "Step-by-step resolution guide", highlighted: true },
          { label: "Predict resolution time for ticket", description: "AI severity and time prediction" },
          { label: "Create RCA for incident", description: "Root cause analysis document" },
          { label: "Recommend operator training needs", description: "Based on incident patterns" },
          { label: "Prioritize alerts by impact", description: "Smart alert prioritization" },
        ]
      case "change-management":
        return [
          { label: "Show workflow for part number ABC123", description: "Natural language workflow query", highlighted: true },
          { label: "Show objects mapped to current revision", description: "Object-to-revision mapping", highlighted: true },
          { label: "Find specs shared between flows", description: "Spec overrides impact analysis" },
          { label: "Which path expressions need updates?", description: "ECO change impact" },
          { label: "Generate redline document", description: "For approval after edits" },
          { label: "Show data collection parameters", description: "Shared across multiple processes" },
        ]
      case "impact-analysis":
        return [
          { label: "Show dependent objects for this part", description: "Dependency visualization", highlighted: true },
          { label: "Where is this component used?", description: "Where-used natural language query", highlighted: true },
          { label: "Show current WIP status", description: "Work-in-progress tracking" },
          { label: "List affected work orders", description: "Orders impacted by this change" },
          { label: "What path expressions are impacted?", description: "Routing and process path effects" },
          { label: "Calculate ROI for this change", description: "Cost-benefit analysis" },
        ]
      case "requirements":
        return [
          { label: "Generate industry-specific template", description: "Default requirements for your industry", highlighted: true },
          { label: "Create As-Is and To-Be process flows", description: "Document current vs desired state", highlighted: true },
          { label: "Generate use cases from requirements", description: "With test cases and acceptance criteria" },
          { label: "Map MES-ERP touchpoints", description: "Integration points and data flows" },
          { label: "Identify customizations needed", description: "Beyond OOB modules" },
          { label: "Map OOB modules to requirements", description: "Standard module recommendations" },
        ]
      default:
        return [
          { label: "Help me analyze data", description: "Get insights from your connected systems", highlighted: true },
          { label: "Answer my questions", description: "Get clear explanations on any topic", highlighted: true },
          { label: "Create a report or dashboard", description: "Visualize your data" },
          { label: "Explain a concept to me", description: "Learn about any topic" },
          { label: "Summarize information", description: "Get concise summaries" },
        ]
    }
  }, [solutionType])

  // Helper to extract reasoning parts from message
  // AI SDK sends reasoning with { type: 'reasoning', text: '...' }
  const getReasoningParts = (message: UIMessage): string[] => {
    const parts = Array.isArray(message.parts) ? message.parts : []
    return parts
      .filter((part) => part.type === "reasoning")
      .map((part) => {
        // AI SDK uses 'text' property for reasoning content
        if ("text" in part && part.text) return part.text as string
        // Fallback for 'reasoning' property (legacy)
        if ("reasoning" in part && part.reasoning) return part.reasoning as string
        return ""
      })
      .filter(Boolean)
  }

  // Sidebar control for artifact panel
  const { setOpen: setSidebarOpen } = useSidebar()
  const sidebarStateBeforeArtifact = useRef<boolean>(true)

  // Open artifact and collapse sidebar - memoized to prevent re-renders
  // Uses refs instead of state in dependencies to prevent recreation and infinite loops
  // manualSelection: true when user clicks an artifact tile (not auto-detected during streaming)
  const openArtifactPanel = useCallback((artifact: Artifact, artifacts: Artifact[] = [], streaming: boolean = false, manualSelection: boolean = false) => {
    // Check if this artifact was already opened (to prevent infinite loops)
    // Use ref version of showArtifactPreview to avoid dependency
    if (artifact.id === lastDetectedArtifactIdRef.current && showArtifactPreviewRef.current && !manualSelection) {
      // Just update the content without re-triggering
      setActiveArtifact(artifact)
      setAllArtifacts(artifacts.length > 0 ? artifacts : [artifact])
      setActiveArtifactIndex(artifacts.length > 0 ? artifacts.indexOf(artifact) : 0)
      setIsStreamingArtifact(streaming)
      return
    }

    // Track if this was a manual selection (prevents auto-detection from overwriting)
    manuallySelectedArtifactRef.current = manualSelection

    lastDetectedArtifactIdRef.current = artifact.id
    sidebarStateBeforeArtifact.current = true // Save current state (assume open)
    setSidebarOpen(false) // Collapse sidebar
    setActiveArtifact(artifact)
    setAllArtifacts(artifacts.length > 0 ? artifacts : [artifact])
    setActiveArtifactIndex(artifacts.length > 0 ? artifacts.indexOf(artifact) : 0)
    setShowArtifactPreview(true)
    setIsStreamingArtifact(streaming)
    userClosedArtifactRef.current = false // Reset the manual close flag
  }, [setSidebarOpen]) // Removed showArtifactPreview - using ref instead

  // Navigate between artifacts
  const navigateArtifact = useCallback((index: number) => {
    if (index >= 0 && index < allArtifacts.length) {
      setActiveArtifactIndex(index)
      setActiveArtifact(allArtifacts[index])
    }
  }, [allArtifacts])

  // Close artifact and restore sidebar
  const closeArtifactPanel = useCallback(() => {
    userClosedArtifactRef.current = true // Mark as manually closed by user
    lastDetectedArtifactIdRef.current = null // Reset tracking
    manuallySelectedArtifactRef.current = false // Reset manual selection flag
    setShowArtifactPreview(false)
    setActiveArtifact(null)
    setIsStreamingArtifact(false)
    setSidebarOpen(true) // Expand sidebar
  }, [setSidebarOpen])

  // Determine API endpoint based on solution type
  const apiEndpoint = solutionType ? `/api/chat/${solutionType}` : "/api/chat"

  // Create request body - this will be sent with each chat request
  const requestBody = useMemo(() => ({
    model: selectedModel,
    webSearch: webSearchEnabled,
    conversationId,
    activeMcpIds,
  }), [selectedModel, webSearchEnabled, conversationId, activeMcpIds])

  // Create transport with memoized configuration - includes auth headers
  const transport = useMemo(() => new DefaultChatTransport({
    api: apiEndpoint,
    body: requestBody,
    headers: getAuthHeaders(),
  }), [apiEndpoint, requestBody])

  const {
    messages,
    status,
    stop,
    setMessages,
    sendMessage,
    error,
  } = useChat({
    transport,
    messages: initialMessages,
    // Auto-scroll handled by use-stick-to-bottom
    onError: (err) => {
      console.error('[useChat] Error:', err)
    },
  })

  // Retry function - resends the last user message
  const retryLastMessage = useCallback(() => {
    if (messages.length < 2) return
    // Find the last user message
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')
    if (lastUserMsg) {
      const text = lastUserMsg.parts
        .filter(p => p.type === 'text')
        .map(p => ('text' in p ? p.text : ''))
        .join('')
      if (text) {
        // Remove the last assistant message and resend
        setMessages(messages.slice(0, -1))
        sendMessage({ text }, { body: requestBody })
      }
    }
  }, [messages, setMessages, sendMessage, requestBody])

  // Auto-generate conversation title after first exchange
  const generateTitle = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/conversations/${convId}/title`, {
        method: 'POST',
        headers: getAuthHeaders(),
      })
      if (!res.ok) {
        console.error('Failed to generate title: HTTP', res.status)
      }
    } catch (error) {
      console.error('Failed to generate title:', error)
    }
  }, [])

  // Copy last response to clipboard
  const copyLastResponse = useCallback(() => {
    const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant')
    if (lastAssistantMsg) {
      const text = getMessageText(lastAssistantMsg)
      navigator.clipboard.writeText(text)
    }
  }, [messages])

  // Save feedback to API
  const saveFeedback = useCallback(async (messageId: string, feedback: 'positive' | 'negative', comment?: string) => {
    try {
      await fetch('/api/messages/feedback', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ messageId, feedback, comment }),
      })
    } catch (error) {
      console.error('Failed to save feedback:', error)
    }
  }, [])

  // Keyboard shortcuts - must be after all callbacks are defined
  useKeyboardShortcuts({
    shortcuts: [
      {
        ...CHAT_SHORTCUTS.clearInput,
        action: () => {
          if (showArtifactPreview) {
            closeArtifactPanel()
          } else {
            setInput("")
          }
        },
      },
      {
        ...CHAT_SHORTCUTS.copyLastResponse,
        action: copyLastResponse,
      },
      {
        ...CHAT_SHORTCUTS.regenerate,
        action: retryLastMessage,
      },
    ],
  })

  // Helper to check if should show feedback bar (every 3rd assistant message)
  const shouldShowFeedbackBar = useCallback((messageIndex: number, role: string): boolean => {
    if (role !== "assistant") return false
    const assistantCount = messages
      .slice(0, messageIndex + 1)
      .filter(m => m.role === "assistant")
      .length
    return assistantCount > 0 && assistantCount % 3 === 0
  }, [messages])

  const isLoading = status === "submitted" || status === "streaming"

  // If we just created a conversation, send the pending message once the id is available
  useEffect(() => {
    if (!conversationId) return
    const pending = pendingMessageRef.current
    if (!pending) return

    // Clear the ref first to prevent double-sending
    pendingMessageRef.current = null

    // Small delay to ensure React state is fully updated and transport is recreated
    const timeoutId = setTimeout(() => {
      sendMessage({ text: pending.text, messageId: pending.messageId }, { body: requestBody })
      // Clear the new conversation flag after message is sent
      isNewConversationRef.current = false
    }, 50)

    return () => clearTimeout(timeoutId)
  }, [conversationId, sendMessage, requestBody])

  // Load messages when conversation changes (only for existing conversations, not new ones)
  useEffect(() => {
    // Skip loading if this is a new conversation being created
    if (isNewConversationRef.current) {
      return
    }

    // Update the ref to track current conversation
    currentConversationRef.current = conversationId

    if (conversationId) {
      setIsLoadingMessages(true)

      const fetchMessages = async () => {
        try {
          const res = await fetch(`/api/conversations/${conversationId}`, {
            headers: getAuthHeaders(),
          })
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}`)
          }
          const data = await res.json()

          // Check if we're still on the same conversation using the ref
          if (currentConversationRef.current !== conversationId) {
            return
          }

          if (data.messages && Array.isArray(data.messages) && data.messages.length > 0) {
            // API now returns UIMessage format directly - no transformation needed
            const loadedMessages: UIMessage[] = data.messages

            // Set both initial messages and current messages
            setInitialMessages(loadedMessages)
            // Use a timeout to ensure setMessages is called after any pending state updates
            setTimeout(() => {
              if (currentConversationRef.current === conversationId) {
                setMessages(loadedMessages)
              }
            }, 0)
          } else {
            // Clear messages for this conversation since server has none
            setInitialMessages([])
            setTimeout(() => {
              if (currentConversationRef.current === conversationId) {
                setMessages([])
              }
            }, 0)
          }
        } catch (error) {
          console.error("Error loading messages:", error)
        } finally {
          if (currentConversationRef.current === conversationId) {
            setIsLoadingMessages(false)
          }
        }
      }

      // Start fetching immediately
      fetchMessages()
    } else {
      // No conversation selected - clear everything
      currentConversationRef.current = null
      setInitialMessages([])
      setMessages([])
      setInput("")
    }
  }, [conversationId, setMessages])

  // Throttle ref for artifact detection (100ms minimum between updates)
  const lastArtifactUpdateRef = useRef<number>(0)
  const artifactUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Auto-detect artifacts during streaming and open preview
  // Throttled to reduce performance impact during fast streaming
  useEffect(() => {
    if (messages.length === 0) return
    // Don't auto-open if user manually closed
    if (userClosedArtifactRef.current) return

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant') return

    // If this is a DIFFERENT assistant message than before, reset artifacts immediately
    if (artifactMessageIdRef.current !== lastMessage.id) {
      artifactMessageIdRef.current = lastMessage.id
      setActiveArtifact(null)
      setAllArtifacts([])
      lastDetectedArtifactIdRef.current = null
      manuallySelectedArtifactRef.current = false // Reset manual selection for new message
      setIsStreamingArtifact(isLoading)
      lastArtifactUpdateRef.current = 0 // Allow immediate update for new message
    }

    const messageText = getMessageText(lastMessage)
    if (!messageText) return

    // Throttle artifact detection during streaming (100ms minimum)
    const now = Date.now()
    const timeSinceLastUpdate = now - lastArtifactUpdateRef.current
    const THROTTLE_MS = 100

    const processArtifacts = () => {
      lastArtifactUpdateRef.current = Date.now()

      // Check for BOTH complete and streaming artifacts
      const hasCompleteArtifact = hasArtifacts(messageText)
      const hasStreamingArtifactFlag = isArtifactStreaming(messageText)

      if (hasCompleteArtifact || hasStreamingArtifactFlag) {
        let artifacts: Artifact[] = []
        if (hasCompleteArtifact) {
          artifacts = extractArtifacts(messageText)
        } else if (hasStreamingArtifactFlag) {
          const { artifact } = getStreamingArtifact(messageText)
          if (artifact) artifacts = [artifact]
        }

        if (artifacts.length > 0) {
          const latestArtifact = artifacts[artifacts.length - 1]

          if (!showArtifactPreviewRef.current && isLoading) {
            // Auto-open artifact panel during streaming (reset manual selection flag)
            manuallySelectedArtifactRef.current = false
            openArtifactPanel(latestArtifact, artifacts, isLoading)
          } else if (showArtifactPreviewRef.current && !manuallySelectedArtifactRef.current) {
            // Only update if NOT manually selected (prevents overwriting user's artifact choice)
            setActiveArtifact(latestArtifact)
            setAllArtifacts(artifacts)
            setActiveArtifactIndex(artifacts.length - 1)
            setIsStreamingArtifact(isLoading)
          }
        }
      }
    }

    // If not loading (streaming complete), process immediately
    if (!isLoading) {
      if (artifactUpdateTimeoutRef.current) {
        clearTimeout(artifactUpdateTimeoutRef.current)
        artifactUpdateTimeoutRef.current = null
      }
      processArtifacts()
      return
    }

    // Throttle during streaming
    if (timeSinceLastUpdate >= THROTTLE_MS) {
      processArtifacts()
    } else {
      // Schedule update after throttle period
      if (artifactUpdateTimeoutRef.current) {
        clearTimeout(artifactUpdateTimeoutRef.current)
      }
      artifactUpdateTimeoutRef.current = setTimeout(processArtifacts, THROTTLE_MS - timeSinceLastUpdate)
    }

    return () => {
      if (artifactUpdateTimeoutRef.current) {
        clearTimeout(artifactUpdateTimeoutRef.current)
      }
    }
  }, [messages, isLoading, openArtifactPanel])

  // When streaming stops, keep artifact open but mark as complete
  useEffect(() => {
    if (!isLoading && isStreamingArtifact) {
      setIsStreamingArtifact(false)
    }
  }, [isLoading, isStreamingArtifact])

  const selectedModelInfo = CLAUDE_MODELS.find((m) => m.id === selectedModel)

  const createOptimisticUserMessage = (text: string) => {
    const nextId = optimisticMessageCounterRef.current++
    const messageId = `user-${Date.now()}-${nextId}`
    const optimisticMessage: UIMessage = {
      id: messageId,
      role: "user",
      parts: [
        {
          type: "text",
          text,
        },
      ],
    }

    setMessages((prev) => [...prev, optimisticMessage])
    return messageId
  }

  const getMessageText = (message: UIMessage): string => {
    const parts = Array.isArray(message.parts) ? message.parts : []

    // Only get text parts, NOT reasoning (reasoning is displayed separately)
    const textFromParts = parts
      .filter((part) => part.type === "text")
      .map((part) => ("text" in part ? part.text : ""))
      .join("")

    if (textFromParts) {
      return textFromParts
    }

    // Fallback for any legacy messages that might still use `content`
    const legacyContent = (message as { content?: unknown }).content
    return typeof legacyContent === "string" ? legacyContent : ""
  }

  // Extract tool parts from message using PromptKit's extractToolParts helper
  const getToolParts = (message: UIMessage): ToolPart[] => {
    const parts = Array.isArray(message.parts) ? message.parts : []
    return extractToolParts(parts)
  }

  // Segment message parts into ordered sections for proper rendering
  // Returns array of { type: 'text' | 'tool', content: string | ToolPart }
  type MessageSegment =
    | { type: 'text'; content: string }
    | { type: 'tool'; content: ToolPart }

  const getOrderedMessageSegments = (message: UIMessage): MessageSegment[] => {
    const parts = Array.isArray(message.parts) ? message.parts : []
    const segments: MessageSegment[] = []
    let currentText = ''

    for (const part of parts) {
      if (typeof part !== 'object' || part === null) continue

      const p = part as Record<string, unknown>
      const partType = p.type as string

      if (!partType) continue

      // Check if this is a tool part
      const isToolPart = partType.startsWith('tool-') ||
                         partType === 'tool-invocation' ||
                         partType === 'tool-call' ||
                         partType === 'tool-result'

      if (partType === 'text' && typeof p.text === 'string') {
        // Accumulate text
        currentText += (currentText ? '\n\n' : '') + p.text
      } else if (isToolPart) {
        // Flush any accumulated text before tool
        if (currentText.trim()) {
          segments.push({ type: 'text', content: currentText.trim() })
          currentText = ''
        }
        // Add tool segment
        const toolParts = extractToolParts([part])
        if (toolParts.length > 0) {
          segments.push({ type: 'tool', content: toolParts[0] })
        }
      }
      // Skip reasoning parts - they're handled separately
    }

    // Flush any remaining text
    if (currentText.trim()) {
      segments.push({ type: 'text', content: currentText.trim() })
    }

    return segments
  }

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return

    setInput("")
    userClosedArtifactRef.current = false // Reset so new artifacts can auto-open
    const optimisticMessageId = createOptimisticUserMessage(text)

    // If no conversation exists, create one first
    if (!conversationId) {
      try {
        // Mark that we're creating a new conversation - this prevents the message loading effect from clearing messages
        isNewConversationRef.current = true
        console.log("[createConversation] Creating with solutionType:", solutionType)
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            title: text.slice(0, 50) + (text.length > 50 ? "..." : ""),
            model: selectedModel,
            solutionType: solutionType,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }

        const newConversation = await response.json()
        console.log("[createConversation] Created:", newConversation.id, "solutionType:", newConversation.solutionType)
        if (!newConversation.id) {
          throw new Error("Invalid conversation response - no ID")
        }
        onConversationCreated(newConversation.id)
        pendingMessageRef.current = { text, messageId: optimisticMessageId }
      } catch (error) {
        isNewConversationRef.current = false
        console.error("Error creating conversation:", error)
        setInput(text)
        // Roll back optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessageId))
      }
    } else {
      try {
        // Pass body in the options object (second parameter)
        await sendMessage({ text, messageId: optimisticMessageId }, { body: requestBody })
      } catch (error) {
        console.error("Error sending message:", error)
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessageId))
        setInput(text)
      }
    }
  }

  return (
    <PanelGroup orientation="horizontal" className="h-full">
      {/* Left Panel: Chat + Prompt Input - SINGLE scrollable container */}
      <Panel defaultSize={showArtifactPreview ? 50 : 100} minSize={30}>
        <ChatContainerRoot className="h-full">
              <ChatContainerContent className="space-y-0 px-5 py-12">
                <AnimatePresence mode="wait">
                  {/* Error Display */}
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mx-auto max-w-3xl px-6"
                    >
                      <SystemMessage
                        variant="error"
                        cta={{ label: "Retry", onClick: retryLastMessage }}
                        dismissible
                      >
                        {error.message || "Something went wrong. Please try again."}
                      </SystemMessage>
                    </motion.div>
                  )}

                  {/* Model Change Notification */}
                  {modelJustChanged && (
                    <SystemMessage variant="action" dismissible onDismiss={() => setModelJustChanged(false)}>
                      Now using {selectedModelInfo?.name}
                    </SystemMessage>
                  )}

                  {isLoadingMessages ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex h-full items-center justify-center"
                    >
                      <div className="text-center">
                        <div className="mx-auto mb-4">
                          <Loader variant="pulse-dot" size="lg" />
                        </div>
                        <p className="text-muted-foreground">Loading messages...</p>
                      </div>
                    </motion.div>
                  ) : messages.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ type: "spring" as const, stiffness: 100, damping: 20 }}
                      className="flex h-full flex-col items-center justify-center px-6 pt-16"
                    >
                      <div className="w-full max-w-2xl text-center -mt-8">
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: 0.2, type: "spring" as const }}
                          className="mx-auto mb-6 flex items-center justify-center gap-6"
                        >
                          <Image
                            src="/logos/llmatscale-logo.png"
                            alt="LLM at Scale.AI"
                            width={240}
                            height={80}
                            className="h-[75px] w-auto object-contain"
                            unoptimized
                          />
                          <div className="h-14 w-px bg-border" />
                          <Image
                            src="/logos/athena-logo.jpg"
                            alt="Athena"
                            width={200}
                            height={65}
                            className="h-[65px] w-auto object-contain"
                            unoptimized
                          />
                        </motion.div>
                        <motion.h2
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.3 }}
                          className="mb-2 text-xl font-semibold"
                        >
                          How can I help you today?
                        </motion.h2>
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          className="mb-6 text-muted-foreground"
                        >
                          Start a conversation with {selectedModelInfo?.name}
                          {solutionType && ` - ${solutionType.replace("-", " ")} mode`}
                        </motion.p>
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                        >
                          <PromptSuggestion
                            suggestions={suggestions}
                            onSelect={(suggestion) => {
                              setInput(suggestion.label)
                            }}
                            columns={2}
                          />
                        </motion.div>
                      </div>
                    </motion.div>
                  ) : (
                    messages.map((message, index) => {
                      const isAssistant = message.role === "assistant"
                      const isLastMessage = index === messages.length - 1
                      const isStreaming = isLoading && isLastMessage && isAssistant
                      const messageText = getMessageText(message)

                      // Detect artifacts in message - optimized to avoid expensive ops for non-streaming messages
                      // For non-last messages, use simple string check first
                      const hasArtifactTag = messageText.includes('<artifact ')
                      let messageHasArtifacts = false
                      let hasStreamingArtifactFlag = false
                      let artifacts: Artifact[] = []

                      if (hasArtifactTag || (isStreaming && messageText.includes('<'))) {
                        // Only do expensive detection if there might be artifacts
                        const hasCompleteArtifacts = hasArtifacts(messageText)
                        hasStreamingArtifactFlag = isStreaming && isArtifactStreaming(messageText)
                        messageHasArtifacts = hasCompleteArtifacts || hasStreamingArtifactFlag

                        // Extract artifacts - for streaming, get partial artifact
                        if (hasCompleteArtifacts) {
                          artifacts = extractArtifacts(messageText)
                        } else if (hasStreamingArtifactFlag) {
                          const { artifact: streamingArtifact } = getStreamingArtifact(messageText)
                          if (streamingArtifact) {
                            artifacts = [streamingArtifact]
                          }
                        }
                      }

                      // Get ordered message segments (text and tool parts in correct order)
                      const messageSegments = isAssistant ? getOrderedMessageSegments(message) : []
                      const hasToolParts = messageSegments.some(s => s.type === 'tool')

                      return (
                        <motion.div
                          key={message.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{
                            type: "spring" as const,
                            stiffness: 200,
                            damping: 25,
                            delay: index * 0.02,
                          }}
                        >
                          <Message
                            className={cn(
                              "mx-auto w-full max-w-3xl items-start gap-3 px-6",
                              isAssistant ? "justify-start" : "justify-end"
                            )}
                          >
                            {isAssistant ? (
                              <>
                                <MessageAvatar className="mt-1 bg-primary/10 text-primary">
                                  <Bot className="size-4" />
                                </MessageAvatar>
                                <div className="group flex-1 min-w-0">
                                  {/* Reasoning/Extended Thinking - shown when model provides reasoning */}
                                  {(() => {
                                    const reasoningParts = getReasoningParts(message)
                                    if (reasoningParts.length === 0) return null
                                    return (
                                      <Reasoning isStreaming={isStreaming}>
                                        <ReasoningTrigger>
                                          {isStreaming ? (
                                            <TextShimmer duration={2}>Thinking</TextShimmer>
                                          ) : (
                                            "Thinking"
                                          )}
                                        </ReasoningTrigger>
                                        <ReasoningContent
                                          markdown
                                          className="ml-2 border-l-2 border-l-slate-200 px-2 pb-1 dark:border-l-slate-700"
                                        >
                                          {reasoningParts.join('\n\n')}
                                        </ReasoningContent>
                                      </Reasoning>
                                    )
                                  })()}

                                  {/* Render message segments in order: text -> tool -> text -> tool -> text */}
                                  {hasToolParts ? (
                                    // Message has tool parts - render segments in order, cleaning artifact content from text
                                    <>
                                      {messageSegments.map((segment, segIndex) => {
                                        if (segment.type === 'tool') {
                                          const toolPart = segment.content as ToolPart
                                          return (
                                            <Tool
                                              key={toolPart.toolCallId || `tool-${segIndex}`}
                                              toolPart={toolPart}
                                              className="max-w-none"
                                              defaultOpen={false}
                                            />
                                          )
                                        } else {
                                          // Text segment - clean artifact content if present
                                          const rawText = segment.content as string
                                          const textContent = messageHasArtifacts ? getTextBeforeArtifact(rawText) : rawText
                                          const isLastSegment = segIndex === messageSegments.length - 1

                                          // Don't render empty text segments
                                          if (!textContent.trim()) return null

                                          return (
                                            <MessageContent key={`text-${segIndex}`} role="assistant">
                                              {messageHasArtifacts ? (
                                                // Static render for artifact messages
                                                <Markdown>{textContent}</Markdown>
                                              ) : (
                                                <StreamingText
                                                  content={textContent}
                                                  isStreaming={isStreaming && isLastSegment}
                                                  markdown
                                                  showCursor={isStreaming && isLastSegment}
                                                />
                                              )}
                                            </MessageContent>
                                          )
                                        }
                                      })}

                                      {/* Show artifact tile if message has artifacts */}
                                      {messageHasArtifacts && artifacts.length > 0 && artifacts.map((artifact, artifactIndex) => (
                                        <ArtifactTile
                                          key={`${message.id}-artifact-${artifactIndex}`}
                                          artifact={artifact}
                                          isActive={activeArtifact?.id === artifact.id && showArtifactPreview}
                                          isStreaming={isStreaming && hasStreamingArtifactFlag}
                                          onClick={() => {
                                            openArtifactPanel(artifact, artifacts, isStreaming && hasStreamingArtifactFlag, true)
                                          }}
                                        />
                                      ))}
                                    </>
                                  ) : messageHasArtifacts ? (
                                    // Message has artifacts - use direct Markdown for static text (no streaming overhead)
                                    <>
                                      {/* Text BEFORE artifact tag - static, render directly */}
                                      {getTextBeforeArtifact(messageText) && (
                                        <MessageContent role="assistant">
                                          <Markdown>{getTextBeforeArtifact(messageText)}</Markdown>
                                        </MessageContent>
                                      )}

                                      {/* Artifact tile card - shown during AND after streaming */}
                                      {artifacts.length > 0 && artifacts.map((artifact, artifactIndex) => (
                                        <ArtifactTile
                                          key={`${message.id}-artifact-${artifactIndex}`}
                                          artifact={artifact}
                                          isActive={activeArtifact?.id === artifact.id && showArtifactPreview}
                                          isStreaming={isStreaming && hasStreamingArtifactFlag}
                                          onClick={() => {
                                            openArtifactPanel(artifact, artifacts, isStreaming && hasStreamingArtifactFlag, true)
                                          }}
                                        />
                                      ))}

                                      {/* Text AFTER artifact tag - static, render directly */}
                                      {!hasStreamingArtifactFlag && getTextAfterArtifact(messageText) && (
                                        <MessageContent role="assistant" className="mt-3">
                                          <Markdown>{getTextAfterArtifact(messageText)}</Markdown>
                                        </MessageContent>
                                      )}
                                    </>
                                  ) : (
                                    /* No tools or artifacts - normal message display with smooth streaming */
                                    <MessageContent role="assistant">
                                      {isStreaming ? (
                                        <StreamingText
                                          content={messageText || "Thinking..."}
                                          isStreaming={isStreaming}
                                          markdown
                                          charsPerTick={4}
                                          showCursor
                                        />
                                      ) : (
                                        <StreamingText
                                          content={messageText}
                                          isStreaming={false}
                                          markdown
                                          showCursor={false}
                                        />
                                      )}
                                    </MessageContent>
                                  )}
                                  {!isStreaming && (
                                    <MessageActions
                                      className={cn(
                                        "-ml-2.5 mt-1 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                                        isLastMessage && "opacity-100"
                                      )}
                                    >
                                      <MessageAction tooltip="Copy" delayDuration={100}>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-none border-0 bg-transparent p-0 hover:bg-transparent"
                                          onClick={() =>
                                            navigator.clipboard.writeText(messageText)
                                          }
                                        >
                                          <Copy />
                                        </Button>
                                      </MessageAction>
                                      <MessageAction tooltip="Upvote" delayDuration={100}>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-none border-0 bg-transparent p-0 hover:bg-transparent"
                                        >
                                          <ThumbsUp />
                                        </Button>
                                      </MessageAction>
                                      <MessageAction
                                        tooltip="Downvote"
                                        delayDuration={100}
                                      >
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 rounded-none border-0 bg-transparent p-0 hover:bg-transparent"
                                        >
                                          <ThumbsDown />
                                        </Button>
                                      </MessageAction>
                                    </MessageActions>
                                  )}

                                  {/* FeedbackBar - shown every 3rd assistant message */}
                                  {!isStreaming && shouldShowFeedbackBar(index, message.role) && (
                                    <div className="mt-3 flex justify-center">
                                      <FeedbackBar
                                        title="Was this response helpful?"
                                        onHelpful={() => saveFeedback(message.id, 'positive')}
                                        onNotHelpful={() => saveFeedback(message.id, 'negative')}
                                      />
                                    </div>
                                  )}
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="group max-w-[85%] sm:max-w-[75%]">
                                  <MessageContent role="user" className="inline-block w-fit max-w-full">
                                    {messageText}
                                  </MessageContent>
                                  <MessageActions
                                    className={cn(
                                      "mr-1 mt-1 flex justify-end gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                                    )}
                                  >
                                    <MessageAction tooltip="Edit" delayDuration={100}>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-none border-0 bg-transparent p-0 hover:bg-transparent"
                                      >
                                        <Pencil />
                                      </Button>
                                    </MessageAction>
                                    <MessageAction tooltip="Delete" delayDuration={100}>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-none border-0 bg-transparent p-0 hover:bg-transparent"
                                      >
                                        <Trash />
                                      </Button>
                                    </MessageAction>
                                    <MessageAction tooltip="Copy" delayDuration={100}>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 rounded-none border-0 bg-transparent p-0 hover:bg-transparent"
                                        onClick={() =>
                                          navigator.clipboard.writeText(messageText)
                                        }
                                      >
                                        <Copy />
                                      </Button>
                                    </MessageAction>
                                  </MessageActions>
                                </div>
                                <MessageAvatar className="mt-1" fallback="U" />
                              </>
                            )}
                          </Message>
                        </motion.div>
                      )
                    })
                  )}
                </AnimatePresence>
              </ChatContainerContent>

              {/* Scroll to bottom button */}
              <div className="pointer-events-none sticky bottom-32 z-10 flex justify-center">
                <ScrollButton className="pointer-events-auto bg-background border-border shadow-md" />
              </div>

              {/* Prompt Input - INSIDE ChatContainerRoot, sticky at bottom */}
              <div className="sticky bottom-0 z-20 bg-background px-3 pb-3 pt-2 md:px-5 md:pb-5">
                <div className="mx-auto max-w-3xl">
                <form onSubmit={onSubmit}>
                  <PromptInput
                    isLoading={isLoading}
                    value={input}
                    onValueChange={setInput}
                    onSubmit={onSubmit}
                    className="prompt-input relative z-10 w-full rounded-2xl p-0 shadow-sm focus-within:ring-0 focus-within:outline-none"
                  >
                    <div className="flex flex-col">
                      <PromptInputTextarea
                        placeholder="Ask anything"
                        className="min-h-[36px] pt-2.5 pl-4 text-sm leading-[1.3] sm:text-sm"
                      />

                      <PromptInputActions className="mt-2 flex w-full items-center justify-between gap-2 px-3 pb-2.5">
                        <div className="flex items-center gap-2">
                          {/* Consolidated Options Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="icon"
                                className="size-9 rounded-full"
                              >
                                <Plus size={18} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-72">
                              {/* Model Selection Submenu */}
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <Bot className="mr-2 size-4" />
                                  <span>Model</span>
                                  <span className="ml-auto text-xs text-muted-foreground">
                                    {selectedModelInfo?.name.split(" ").slice(-2).join(" ")}
                                  </span>
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-64">
                                  {CLAUDE_MODELS.map((model) => (
                                    <DropdownMenuItem
                                      key={model.id}
                                      onClick={() => setSelectedModel(model.id)}
                                      className="flex items-center justify-between"
                                    >
                                      <div className="flex flex-col">
                                        <span className="font-medium">{model.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {model.description}
                                        </span>
                                      </div>
                                      {selectedModel === model.id && (
                                        <Check className="size-4 text-primary" />
                                      )}
                                    </DropdownMenuItem>
                                  ))}
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>

                              <DropdownMenuSeparator />

                              {/* Web Search Toggle */}
                              <div className="flex items-center justify-between px-2 py-1.5">
                                <div className="flex items-center">
                                  <Globe className="mr-2 size-4" />
                                  <Label htmlFor="web-search" className="text-sm font-normal cursor-pointer">
                                    Web Search
                                  </Label>
                                </div>
                                <Switch
                                  id="web-search"
                                  checked={webSearchEnabled}
                                  onCheckedChange={setWebSearchEnabled}
                                />
                              </div>

                              <DropdownMenuSeparator />

                              {/* MCP Connections Submenu */}
                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <Plug className="mr-2 size-4" />
                                  <span>MCP Connections</span>
                                  {activeMcpIds.length > 0 && (
                                    <span className="ml-auto rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                                      {activeMcpIds.length}
                                    </span>
                                  )}
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent className="w-64">
                                  <McpConnectionsSubmenu
                                    activeMcpIds={activeMcpIds}
                                    onToggle={(connectionId, isActive) => {
                                      setActiveMcpIds((prev) => {
                                        return isActive
                                          ? [...prev, connectionId]
                                          : prev.filter((id) => id !== connectionId)
                                      })
                                    }}
                                  />
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Voice Input */}
                          <PromptInputAction tooltip="Voice input">
                            <Button
                              variant="outline"
                              size="icon"
                              className="size-9 rounded-full"
                              type="button"
                            >
                              <Mic size={18} />
                            </Button>
                          </PromptInputAction>
                        </div>

                        <div className="flex items-center gap-2">
                          <AnimatePresence mode="wait">
                            {isLoading ? (
                              <motion.div
                                key="stop"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={stop}
                                  className="size-9 rounded-full"
                                  type="button"
                                >
                                  <Square size={14} className="fill-current" />
                                </Button>
                              </motion.div>
                            ) : (
                              <motion.div
                                key="send"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                <Button
                                  size="icon"
                                  disabled={!input?.trim()}
                                  type="submit"
                                  className="size-9 rounded-full"
                                >
                                  <ArrowUp size={18} />
                                </Button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </PromptInputActions>
                    </div>
                  </PromptInput>
                </form>

                {/* Model indicator */}
                <motion.div
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground"
                >
                  <Bot className="size-3" />
                  <span>{selectedModelInfo?.name}</span>
                  <AnimatePresence>
                    {webSearchEnabled && (
                      <motion.span
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="flex items-center gap-2"
                      >
                        <span>-</span>
                        <Globe className="size-3" />
                        <span>Web search enabled</span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Copyright */}
                <p className="mt-2 text-center text-[10px] text-muted-foreground/50">
                  LLM at Scale.AI. All Rights Reserved. Confidential and Proprietary Information. Version 1.0
                </p>
              </div>
            </div>
        </ChatContainerRoot>
        </Panel>

        {/* Resize Handle + Right Panel: Artifact Preview */}
        {showArtifactPreview && activeArtifact && (
          <>
            <PanelResizeHandle className="w-2 bg-border hover:bg-primary/20 transition-colors cursor-col-resize flex items-center justify-center">
              <div className="w-0.5 h-8 bg-muted-foreground/30 rounded-full" />
            </PanelResizeHandle>
            <Panel defaultSize={50} minSize={20}>
              <ArtifactPreview
                artifact={activeArtifact}
                artifacts={allArtifacts}
                currentIndex={activeArtifactIndex}
                isStreaming={isStreamingArtifact}
                onClose={closeArtifactPanel}
                onNavigate={navigateArtifact}
              />
            </Panel>
          </>
        )}
      </PanelGroup>
  )
}

interface FullChatAppProps {
  solutionType?: string | null
}

function FullChatApp({ solutionType: propSolutionType }: FullChatAppProps = {}) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<ClaudeModelId>(CLAUDE_MODELS[0].id)
  const [isLoading, setIsLoading] = useState(true)
  const [solutionType, setSolutionType] = useState<string | null>(propSolutionType ?? null)
  const [userName, setUserName] = useState<string>("User")
  // Track the chat key separately - stays stable during new conversation creation
  // Only changes when user explicitly selects an existing conversation
  const [chatKey, setChatKey] = useState<string>('new-chat')
  const router = useRouter()

  // Load user name from session on mount
  useEffect(() => {
    setUserName(getUserNameFromSession())
  }, [])

  // Get solution type from prop or URL on mount
  useEffect(() => {
    // If solution type is provided as prop, use it and skip URL parsing
    if (propSolutionType !== undefined) {
      setSolutionType(propSolutionType)
      return
    }

    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search)
      const solution = params.get("solution")
      if (solution) {
        setSolutionType(solution)
        // Store in session storage so it persists
        sessionStorage.setItem("athena_solution_type", solution)
      } else {
        // Try to get from session storage
        const stored = sessionStorage.getItem("athena_solution_type")
        if (stored) {
          setSolutionType(stored)
        }
      }
    }
  }, [propSolutionType])

  // Fetch conversations filtered by solution type
  const fetchConversations = useCallback(async () => {
    try {
      // Build URL with solution type filter
      const url = new URL("/api/conversations", window.location.origin)
      if (solutionType) {
        url.searchParams.set("solutionType", solutionType)
      } else {
        // For general chat, fetch conversations without a solution type
        url.searchParams.set("solutionType", "")
      }

      console.log("[fetchConversations] Fetching with solutionType:", solutionType, "URL:", url.toString())

      const response = await fetch(url.toString(), {
        headers: getAuthHeaders(),
      })

      console.log("[fetchConversations] Response status:", response.status)

      // Check if response is ok before parsing
      if (!response.ok) {
        // Auth failed - user needs to log in
        if (response.status === 401) {
          console.log("[fetchConversations] 401 - redirecting to login")
          window.location.href = '/'
          return
        }
        console.error("[fetchConversations] Failed:", response.status)
        setConversations([])
        return
      }

      const data = await response.json()
      console.log("[fetchConversations] Data received:", data?.length ?? 0, "conversations")

      // Only set if response is an array (not an error object)
      if (Array.isArray(data)) {
        setConversations(data)
      } else {
        console.error("[fetchConversations] Invalid data format:", data)
        setConversations([])
      }
    } catch (error) {
      console.error("Error fetching conversations:", error)
      setConversations([])
    } finally {
      setIsLoading(false)
    }
  }, [solutionType])

  // Fetch conversations on mount and when solution type changes
  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const handleNewChat = useCallback(() => {
    setSelectedConversationId(null)
    setChatKey('new-chat')
  }, [])

  // Keyboard shortcuts for main app
  useKeyboardShortcuts({
    shortcuts: [
      {
        ...CHAT_SHORTCUTS.newChat,
        action: handleNewChat,
      },
      {
        ...CHAT_SHORTCUTS.openSettings,
        action: () => router.push('/settings'),
      },
    ],
  })

  const handleSelectConversation = useCallback((id: string) => {
    // When selecting an existing conversation, update both ID and key
    // This causes the ChatContent to remount and load messages
    setSelectedConversationId(id)
    setChatKey(id)
  }, [])

  const handleConversationCreated = useCallback((id: string) => {
    // When a new conversation is created, only update the conversationId
    // DO NOT update chatKey - this keeps the same ChatContent instance
    // so the pending message can be sent without losing the optimistic message
    setSelectedConversationId(id)
    // Refresh conversations list
    fetchConversations()
  }, [fetchConversations])

  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      })
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (selectedConversationId === id) {
        // Reset both ID and chatKey to force ChatContent remount
        // This ensures transport is recreated with null conversationId
        setSelectedConversationId(null)
        setChatKey('new-chat-' + Date.now()) // Force remount with unique key
      }
    } catch (error) {
      console.error("Error deleting conversation:", error)
    }
  }, [selectedConversationId])

  const handlePinConversation = useCallback(async (id: string, isPinned: boolean) => {
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ isPinned }),
      })
      setConversations((prev) =>
        prev.map((c) => (c.id === id ? { ...c, isPinned } : c))
      )
    } catch (error) {
      console.error("Error pinning conversation:", error)
    }
  }, [])

  const handleShareConversation = useCallback(async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ isShared: true }),
      })
      // Copy share link to clipboard
      const shareUrl = `${window.location.origin}/share/${id}`
      await navigator.clipboard.writeText(shareUrl)
      alert("Share link copied to clipboard!")
    } catch (error) {
      console.error("Error sharing conversation:", error)
    }
  }, [])

  return (
    <SidebarProvider>
      <ChatSidebar
        conversations={conversations}
        selectedId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onPinConversation={handlePinConversation}
        onShareConversation={handleShareConversation}
        solutionType={solutionType}
        userName={userName}
      />
      <SidebarInset className="overflow-hidden">
        <ChatContent
          key={chatKey}
          conversationId={selectedConversationId}
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          onConversationCreated={handleConversationCreated}
          solutionType={solutionType}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}

export { FullChatApp }
