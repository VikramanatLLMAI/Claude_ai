"use client"

import { motion } from "motion/react"
import { ClaudeChatInput, type ClaudeChatInputHandle } from "@/components/ui/claude-style-chat-input"
import { getIcon, type PromptSuggestion } from "@/lib/icon-map"

// Time-based greeting helper
function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return "Good morning"
  if (hour >= 12 && hour < 17) return "Good afternoon"
  if (hour >= 17 && hour < 21) return "Good evening"
  return "Hey there"
}

// Default suggestion chips when no role-specific suggestions are configured
const DEFAULT_SUGGESTIONS: PromptSuggestion[] = [
  { icon: "Pencil", label: "Write", prompt: "Write: " },
  { icon: "BookOpen", label: "Learn", prompt: "Learn: " },
  { icon: "Code2", label: "Code", prompt: "Code: " },
  { icon: "Home", label: "Life stuff", prompt: "Life stuff: " },
]

// Shared Framer Motion ease curve
const EASE = [0.25, 0.1, 0.25, 1] as const

export interface WelcomeScreenProps {
  userName: string
  orgName: string
  orgLogoBase64: string | null
  orgLogoDisplayMode: string // "PLATFORM_AND_ORG" | "ORG_ONLY"
  suggestions: PromptSuggestion[]
  chatInputRef: React.RefObject<ClaudeChatInputHandle | null>
  chatInputProps: {
    onSendMessage: (data: {
      message: string
      files: unknown[]
      pastedContent: unknown[]
      model: string
      isThinkingEnabled: boolean
    }) => void
    models: { id: string; name: string; description: string }[]
    defaultModel: string
    placeholder?: string
    isLoading: boolean
    onStop: () => void
    webSearchEnabled: boolean
    onWebSearchChange: (enabled: boolean) => void
    isThinkingEnabled: boolean
    onThinkingChange: (enabled: boolean) => void
    activeMcpIds: string[]
    onMcpToggle: (connectionId: string, isActive: boolean) => void
    McpConnectionsSubmenu?: React.ComponentType<any> | null
    onManageConnectors?: () => void
    disabled: boolean
    disabledPlaceholder?: string
  }
}

/**
 * WelcomeScreen -- Standalone welcome component shown when no conversation is active.
 *
 * Displays:
 * 1. Org/platform logos (based on logoDisplayMode)
 * 2. Time-based greeting with user name
 * 3. Chat input (ClaudeChatInput)
 * 4. Suggestion chips (role-configured or defaults)
 */
export function WelcomeScreen({
  userName,
  orgName,
  orgLogoBase64,
  orgLogoDisplayMode,
  suggestions,
  chatInputRef,
  chatInputProps,
}: WelcomeScreenProps) {
  const activeSuggestions =
    suggestions.length > 0 ? suggestions : DEFAULT_SUGGESTIONS

  // Generate org initials for placeholder when no logo
  const orgInitials = orgName
    ? orgName
        .split(/\s+/)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase()
    : ""

  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -20, transition: { duration: 0.2 } }}
      transition={{ duration: 0.3 }}
      className="flex h-full flex-col items-center justify-center px-6"
    >
      <div className="w-full max-w-2xl flex flex-col items-center text-center">
        {/* Logos section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4, ease: EASE }}
          className="flex items-center gap-3 mb-6"
        >
          {orgLogoDisplayMode === "PLATFORM_AND_ORG" && (
            <>
              <span className="text-sm font-semibold text-foreground/70 tracking-tight">
                LLMatscale.ai
              </span>
              <span className="text-muted-foreground/40 text-xs select-none">
                +
              </span>
            </>
          )}
          {orgLogoBase64 ? (
            <img
              src={orgLogoBase64}
              alt={`${orgName} logo`}
              className="h-8 w-auto object-contain"
            />
          ) : orgInitials ? (
            <div className="flex items-center justify-center h-8 w-8 rounded-md bg-muted text-xs font-bold text-muted-foreground">
              {orgInitials}
            </div>
          ) : null}
        </motion.div>

        {/* Time-based greeting */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: EASE }}
          className="text-3xl md:text-4xl font-light text-foreground mb-8"
        >
          {getGreeting()}, {userName}
        </motion.h1>

        {/* Centered input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: EASE }}
          className="w-full mb-5"
        >
          <ClaudeChatInput
            ref={chatInputRef}
            onSendMessage={chatInputProps.onSendMessage}
            models={chatInputProps.models}
            defaultModel={chatInputProps.defaultModel}
            placeholder={chatInputProps.placeholder}
            isLoading={chatInputProps.isLoading}
            onStop={chatInputProps.onStop}
            webSearchEnabled={chatInputProps.webSearchEnabled}
            onWebSearchChange={chatInputProps.onWebSearchChange}
            isThinkingEnabled={chatInputProps.isThinkingEnabled}
            onThinkingChange={chatInputProps.onThinkingChange}
            activeMcpIds={chatInputProps.activeMcpIds}
            onMcpToggle={chatInputProps.onMcpToggle}
            McpConnectionsSubmenu={chatInputProps.McpConnectionsSubmenu ?? undefined}
            onManageConnectors={chatInputProps.onManageConnectors}
            disabled={chatInputProps.disabled}
            disabledPlaceholder={chatInputProps.disabledPlaceholder}
          />
        </motion.div>

        {/* Suggestion chips */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4, ease: EASE }}
          className="flex flex-wrap justify-center gap-2"
        >
          {activeSuggestions.map((suggestion) => {
            const IconComponent = getIcon(suggestion.icon)
            return (
              <button
                key={suggestion.label}
                onClick={() =>
                  chatInputRef.current?.setMessage(suggestion.prompt)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full
                           border border-border bg-transparent text-muted-foreground
                           hover:bg-muted hover:text-foreground transition-colors"
              >
                <IconComponent className="size-4" />
                {suggestion.label}
              </button>
            )
          })}
        </motion.div>
      </div>
    </motion.div>
  )
}
