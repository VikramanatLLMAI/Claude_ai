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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, type UIMessage } from "ai"
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
  Plus,
  Settings,
  Share2,
  Sparkles,
  Square,
  ThumbsDown,
  ThumbsUp,
  Trash,
  User2,
} from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { extractArtifacts, getMessageWithoutArtifacts, hasArtifacts, type Artifact } from "@/lib/artifacts"
import { ArtifactTile } from "@/components/artifact-tile"
import { ArtifactPreview } from "@/components/artifact-preview"

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
    id: "us.anthropic.claude-opus-4-5-20251101-v1:0",
    name: "Claude 4.5 Opus",
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

// Database message type
interface DbMessage {
  id: string
  role: "user" | "assistant"
  content: string
  conversationId: string
  createdAt: string
}

function ChatSidebar({
  conversations,
  selectedId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onPinConversation,
  onShareConversation,
}: {
  conversations: Conversation[]
  selectedId: string | null
  onSelectConversation: (id: string) => void
  onNewChat: () => void
  onDeleteConversation: (id: string) => void
  onPinConversation: (id: string, isPinned: boolean) => void
  onShareConversation: (id: string) => void
}) {
  // Ensure conversations is always an array
  const safeConversations = Array.isArray(conversations) ? conversations : []
  const pinnedConversations = safeConversations.filter((c) => c.isPinned)
  const unpinnedConversations = safeConversations.filter((c) => !c.isPinned)

  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="p-2 group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
        <div className="flex w-full items-center justify-between gap-2 group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center">
          <span className="text-sm font-medium group-data-[collapsible=icon]:hidden">
            LLMatscale.ai
          </span>
          <SidebarTrigger className="size-8 shrink-0 border-0 bg-transparent shadow-none hover:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0" />
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2 group-data-[collapsible=icon]:px-1">
        <SidebarGroup className="gap-0 group-data-[collapsible=icon]:px-0">
          <SidebarMenu className="group-data-[collapsible=icon]:items-center">
            <SidebarMenuButton tooltip="New chat" onClick={onNewChat}>
              <Plus className="size-4" />
              <span>New chat</span>
            </SidebarMenuButton>
            <SidebarMenuButton tooltip="Projects">
              <FolderOpen className="size-4" />
              <span>Projects</span>
            </SidebarMenuButton>
            <SidebarMenuButton tooltip="Artifacts">
              <Grid2X2 className="size-4" />
              <span>Artifacts</span>
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
                  <span>John Doe</span>
                  <ChevronUp className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                className="w-[--radix-popper-anchor-width]"
              >
                <DropdownMenuItem>
                  <User2 className="mr-2 size-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 size-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
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
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [initialMessages, setInitialMessages] = useState<UIMessage[]>([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)
  const [input, setInput] = useState("")
  const pendingMessageRef = useRef<{ text: string; messageId: string } | null>(null)
  const optimisticMessageCounterRef = useRef(0)
  const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null)
  const [showArtifactPreview, setShowArtifactPreview] = useState(false)

  // Determine API endpoint based on solution type
  const apiEndpoint = solutionType ? `/api/chat/${solutionType}` : "/api/chat"

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: apiEndpoint,
        body: {
          model: selectedModel,
          webSearch: webSearchEnabled,
          conversationId,
        },
      }),
    [apiEndpoint, selectedModel, webSearchEnabled, conversationId]
  )

  const {
    messages,
    status,
    stop,
    setMessages,
    sendMessage,
  } = useChat({
    messages: initialMessages,
    transport,
    onFinish: () => {
      scrollToBottom()
    },
  })

  const isLoading = status === "submitted" || status === "streaming"

  // If we just created a conversation, send the pending message once the id is available
  useEffect(() => {
    if (!conversationId) return
    const pending = pendingMessageRef.current
    if (!pending) return
    pendingMessageRef.current = null
    sendMessage({ text: pending.text, messageId: pending.messageId })
  }, [conversationId, sendMessage])

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      setIsLoadingMessages(true)
      fetch(`/api/conversations/${conversationId}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.messages) {
            const formattedMessages: UIMessage[] = data.messages.map((m: DbMessage) => ({
              id: m.id,
              role: m.role,
              parts: [
                {
                  type: "text",
                  text: m.content,
                },
              ],
            }))
            setInitialMessages(formattedMessages)
            setMessages((prev) => {
              // Avoid wiping optimistic/local messages when the database is empty
              if (prev.length > 0 && formattedMessages.length === 0) {
                return prev
              }
              return formattedMessages
            })
          }
        })
        .catch((error) => {
          console.error("Error loading messages:", error)
        })
        .finally(() => {
          setIsLoadingMessages(false)
        })
    } else {
      setInitialMessages([])
      setMessages([])
      setInput("")
      pendingMessageRef.current = null
    }
  }, [conversationId, setMessages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  // Auto-scroll when new messages come in or when streaming
  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
    const textFromParts = parts
      .filter((part) => part.type === "text" || part.type === "reasoning")
      .map((part) => ("text" in part ? part.text : ""))
      .join("")

    if (textFromParts) {
      return textFromParts
    }

    // Fallback for any legacy messages that might still use `content`
    const legacyContent = (message as { content?: unknown }).content
    return typeof legacyContent === "string" ? legacyContent : ""
  }

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || isLoading) return

    setInput("")
    const optimisticMessageId = createOptimisticUserMessage(text)

    // If no conversation exists, create one first
    if (!conversationId) {
      try {
        const response = await fetch("/api/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: text.slice(0, 50) + (text.length > 50 ? "..." : ""),
            model: selectedModel,
            solutionType: solutionType,
          }),
        })
        const newConversation = await response.json()
        onConversationCreated(newConversation.id)
        pendingMessageRef.current = { text, messageId: optimisticMessageId }
      } catch (error) {
        console.error("Error creating conversation:", error)
        setInput(text)
        // Roll back optimistic message on failure
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessageId))
      }
    } else {
      try {
        await sendMessage({ text, messageId: optimisticMessageId })
      } catch (error) {
        console.error("Error sending message:", error)
        setMessages((prev) => prev.filter((m) => m.id !== optimisticMessageId))
        setInput(text)
      }
    }
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden">
      <div className="relative flex flex-1 overflow-hidden">
        {/* Chat Area */}
        <div
          ref={chatContainerRef}
          className={cn(
            "relative overflow-y-auto transition-all duration-300",
            showArtifactPreview && activeArtifact ? "w-1/2" : "w-full"
          )}
        >
          <ChatContainerRoot className="h-full">
            <ChatContainerContent className="space-y-0 px-5 py-12">
            {isLoadingMessages ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
                    <Bot className="size-8 animate-pulse text-primary" />
                  </div>
                  <p className="text-muted-foreground">Loading messages...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="size-8 text-primary" />
                  </div>
                  <h2 className="mb-2 text-xl font-semibold">
                    How can I help you today?
                  </h2>
                  <p className="text-muted-foreground">
                    Start a conversation with {selectedModelInfo?.name}
                  </p>
                </div>
              </div>
            ) : (
              messages.map((message, index) => {
                const isAssistant = message.role === "assistant"
                const isLastMessage = index === messages.length - 1
                const isStreaming = isLoading && isLastMessage && isAssistant
                const messageText = getMessageText(message)

                // Detect artifacts in message
                const messageHasArtifacts = hasArtifacts(messageText)
                const artifacts = messageHasArtifacts ? extractArtifacts(messageText) : []
                const cleanedMessageText = messageHasArtifacts ? getMessageWithoutArtifacts(messageText) : messageText

                return (
                  <Message
                    key={message.id}
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
                        <div className="group max-w-[85%] sm:max-w-[75%]">
                          <MessageContent
                            className={cn(
                              "bg-[#FAF9F5]",
                              isStreaming && "animate-pulse"
                            )}
                            markdown
                          >
                            {cleanedMessageText || (isStreaming ? "Thinking..." : "")}
                          </MessageContent>

                          {/* Render artifact tiles */}
                          {artifacts.length > 0 && artifacts.map((artifact, artifactIndex) => (
                            <ArtifactTile
                              key={`${message.id}-artifact-${artifactIndex}`}
                              artifact={artifact}
                              isActive={activeArtifact === artifact && showArtifactPreview}
                              onClick={() => {
                                setActiveArtifact(artifact)
                                setShowArtifactPreview(true)
                              }}
                            />
                          ))}
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
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="group max-w-[85%] sm:max-w-[75%]">
                          <MessageContent className="inline-block w-fit max-w-full bg-[#e9e6dc] text-foreground">
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
                )
              })
            )}
            <div ref={messagesEndRef} />
          </ChatContainerContent>
        </ChatContainerRoot>

          <ScrollButton
            containerRef={chatContainerRef}
            scrollRef={messagesEndRef}
            className="bg-background absolute bottom-4 left-1/2 -translate-x-1/2"
          />
        </div>

        {/* Artifact Preview Panel */}
        {showArtifactPreview && activeArtifact && (
          <div className="w-1/2">
            <ArtifactPreview
              artifact={activeArtifact}
              isStreaming={isLoading && messages.length > 0 && messages[messages.length - 1].role === "assistant"}
              onClose={() => {
                setShowArtifactPreview(false)
                setActiveArtifact(null)
              }}
            />
          </div>
        )}
      </div>

      <div className="bg-background z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5">
        <div className={cn(
          "mx-auto transition-all duration-300",
          showArtifactPreview && activeArtifact ? "max-w-none" : "max-w-3xl"
        )}>
          <form onSubmit={onSubmit}>
            <PromptInput
              isLoading={isLoading}
              value={input}
              onValueChange={setInput}
              onSubmit={onSubmit}
              className="bg-card relative z-10 w-full rounded-3xl p-0 pt-1 shadow-sm focus-within:ring-0 focus-within:outline-none"
            >
              <div className="flex flex-col">
                <PromptInputTextarea
                  placeholder="Ask anything"
                  className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
                />

                <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                  <div className="flex items-center gap-2">
                    {/* Model Selection Dropdown */}
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
                      <DropdownMenuContent align="start" className="w-64">
                        <DropdownMenuLabel>Select Model</DropdownMenuLabel>
                        <DropdownMenuSeparator />
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
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {/* Web Search Toggle */}
                    <Button
                      variant={webSearchEnabled ? "default" : "outline"}
                      size="icon"
                      className="size-9 rounded-full"
                      type="button"
                      onClick={() => setWebSearchEnabled(!webSearchEnabled)}
                    >
                      <Globe size={18} />
                    </Button>

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
                    {isLoading ? (
                      <Button
                        variant="destructive"
                        size="icon"
                        onClick={stop}
                        className="size-9 rounded-full"
                        type="button"
                      >
                        <Square size={14} className="fill-current" />
                      </Button>
                    ) : (
                      <Button
                        size="icon"
                        disabled={!input?.trim()}
                        type="submit"
                        className="size-9 rounded-full"
                      >
                        <ArrowUp size={18} />
                      </Button>
                    )}
                  </div>
                </PromptInputActions>
              </div>
            </PromptInput>
          </form>

          {/* Model indicator */}
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Bot className="size-3" />
            <span>{selectedModelInfo?.name}</span>
            {webSearchEnabled && (
              <>
                <span>•</span>
                <Globe className="size-3" />
                <span>Web search enabled</span>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function FullChatApp() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<ClaudeModelId>(CLAUDE_MODELS[0].id)
  const [isLoading, setIsLoading] = useState(true)
  const [solutionType, setSolutionType] = useState<string | null>(null)

  // Get solution type from URL on mount
  useEffect(() => {
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
  }, [])

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      const response = await fetch("/api/conversations")
      const data = await response.json()
      // Only set if response is an array (not an error object)
      if (Array.isArray(data)) {
        setConversations(data)
      } else {
        console.error("Invalid conversations data:", data)
        setConversations([])
      }
    } catch (error) {
      console.error("Error fetching conversations:", error)
      setConversations([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewChat = useCallback(() => {
    setSelectedConversationId(null)
  }, [])

  const handleSelectConversation = useCallback((id: string) => {
    setSelectedConversationId(id)
  }, [])

  const handleConversationCreated = useCallback((id: string) => {
    setSelectedConversationId(id)
    // Refresh conversations list
    fetchConversations()
  }, [])

  const handleDeleteConversation = useCallback(async (id: string) => {
    try {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" })
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (selectedConversationId === id) {
        setSelectedConversationId(null)
      }
    } catch (error) {
      console.error("Error deleting conversation:", error)
    }
  }, [selectedConversationId])

  const handlePinConversation = useCallback(async (id: string, isPinned: boolean) => {
    try {
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
      />
      <SidebarInset>
        <ChatContent
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
