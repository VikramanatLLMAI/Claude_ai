"use client"

import { useState, useEffect } from "react"
import { Code2, Eye, Copy, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Artifact } from "@/lib/artifacts"

interface ArtifactPreviewProps {
  artifact: Artifact
  isStreaming?: boolean
  onClose?: () => void
}

export function ArtifactPreview({ artifact, isStreaming = false, onClose }: ArtifactPreviewProps) {
  const [mode, setMode] = useState<"code" | "preview">(isStreaming ? "code" : "preview")
  const [copied, setCopied] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)

  // Switch to preview mode when streaming is done
  useEffect(() => {
    if (!isStreaming && mode === "code") {
      const timer = setTimeout(() => {
        setMode("preview")
        // Force iframe reload
        setIframeKey((prev) => prev + 1)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [isStreaming, mode])

  const handleCopy = async () => {
    await navigator.clipboard.writeText(artifact.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex h-full flex-col border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-lg border bg-muted p-1">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 gap-2 px-3",
                mode === "code" && "bg-background shadow-sm"
              )}
              onClick={() => setMode("code")}
            >
              <Code2 className="h-4 w-4" />
              <span className="text-sm">Code</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-7 gap-2 px-3",
                mode === "preview" && "bg-background shadow-sm"
              )}
              onClick={() => setMode("preview")}
              disabled={isStreaming}
            >
              <Eye className="h-4 w-4" />
              <span className="text-sm">Preview</span>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm">{artifact.title}</span>
            <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
              {artifact.language}
            </span>
          </div>
          {isStreaming && (
            <span className="text-xs text-muted-foreground">Streaming...</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2"
            onClick={handleCopy}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span className="text-sm">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                <span className="text-sm">Copy</span>
              </>
            )}
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" className="h-8" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {mode === "code" ? (
          <div className="h-full overflow-auto bg-muted/30 p-4">
            <pre className="text-sm">
              <code>{artifact.content}</code>
            </pre>
          </div>
        ) : (
          <div className="h-full overflow-hidden bg-white">
            <iframe
              key={iframeKey}
              srcDoc={artifact.content}
              className="h-full w-full border-0"
              sandbox="allow-scripts allow-same-origin"
              title="Artifact Preview"
            />
          </div>
        )}
      </div>
    </div>
  )
}
