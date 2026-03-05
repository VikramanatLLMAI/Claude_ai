"use client"

/**
 * ConversationViewer - Read-only conversation viewer dialog
 *
 * Displays full conversation messages chronologically with role badges.
 * Message content rendered with markdown (reuses Markdown from prompt-kit).
 * Includes user info header and single-conversation export button.
 *
 * NO edit, delete, or reply capabilities (OVIS-05).
 */

import * as React from "react"
import { Download, X, User, Bot, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Markdown } from "@/components/prompt-kit/markdown"

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

// ============================================
// Types
// ============================================

interface ConversationDetail {
  id: string
  title: string
  model: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
  }
  messages: Array<{
    id: string
    role: string
    content: string
    createdAt: string
  }>
}

interface ConversationViewerProps {
  slug: string
  conversationId: string
  onClose: () => void
}

// ============================================
// Helpers
// ============================================

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
}

// ============================================
// Component
// ============================================

export function ConversationViewer({
  slug,
  conversationId,
  onClose,
}: ConversationViewerProps) {
  const [detail, setDetail] = React.useState<ConversationDetail | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [exporting, setExporting] = React.useState(false)

  const apiBase = `/api/org/${slug}/admin`

  // Load conversation detail
  React.useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`${apiBase}/conversations/${conversationId}`, {
          headers: getAuthHeaders(),
        })
        if (res.ok) {
          setDetail(await res.json())
        } else {
          const data = await res.json().catch(() => ({}))
          setError(data.error || "Failed to load conversation")
        }
      } catch {
        setError("Failed to load conversation")
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [apiBase, conversationId])

  // Export single conversation
  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`${apiBase}/conversations/export`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({ conversationIds: [conversationId] }),
      })
      if (res.ok) {
        const disposition = res.headers.get("Content-Disposition") || ""
        const filenameMatch = disposition.match(/filename="?([^"]+)"?/)
        const filename = filenameMatch ? filenameMatch[1] : "conversation.json"

        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = filename
        a.click()
        URL.revokeObjectURL(url)
      }
    } catch {
      // ignore
    } finally {
      setExporting(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              {loading ? "Loading..." : detail?.title || "Conversation"}
            </DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Read-only view of a user conversation
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        {loading && (
          <div className="flex flex-1 items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && (
          <div className="flex flex-1 items-center justify-center py-16 text-destructive">
            {error}
          </div>
        )}

        {detail && !loading && (
          <>
            {/* User info header */}
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-3 flex-shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{detail.user.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {detail.user.email}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs font-mono">
                    {detail.model}
                  </Badge>
                  <span>{detail.messages.length} messages</span>
                  <span>Started {formatDateTime(detail.createdAt)}</span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exporting}
              >
                <Download className="mr-1.5 h-3.5 w-3.5" />
                {exporting ? "Exporting..." : "Export"}
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-4 py-2">
              {detail.messages.length === 0 ? (
                <div className="py-16 text-center text-muted-foreground">
                  No messages in this conversation.
                </div>
              ) : (
                detail.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className="group rounded-lg border p-4"
                  >
                    {/* Role header */}
                    <div className="mb-2 flex items-center gap-2">
                      <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                        msg.role === "user"
                          ? "bg-primary/10 text-primary"
                          : msg.role === "assistant"
                          ? "bg-violet-500/10 text-violet-600 dark:text-violet-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}>
                        {msg.role === "user" ? (
                          <User className="h-3.5 w-3.5" />
                        ) : (
                          <Bot className="h-3.5 w-3.5" />
                        )}
                      </div>
                      <Badge
                        variant="outline"
                        className="text-xs capitalize"
                      >
                        {msg.role}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDateTime(msg.createdAt)}
                      </span>
                    </div>

                    {/* Message content */}
                    <div className="pl-8 prose prose-sm dark:prose-invert max-w-none">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
