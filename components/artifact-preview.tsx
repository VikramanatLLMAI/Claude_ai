"use client"

import { useState, useEffect, useRef } from "react"
import { Code2, Eye, Copy, Check, X, Download, Monitor, Smartphone, Tablet, ExternalLink, ChevronLeft, ChevronRight, Sparkles, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Artifact } from "@/lib/artifacts"
import { motion, AnimatePresence } from "motion/react"

type DeviceMode = "mobile" | "tablet" | "desktop"

const DEVICE_WIDTHS: Record<DeviceMode, string> = {
  mobile: "375px",
  tablet: "768px",
  desktop: "100%",
}

interface ArtifactPreviewProps {
  artifact: Artifact
  artifacts?: Artifact[]
  currentIndex?: number
  isStreaming?: boolean
  onClose?: () => void
  onNavigate?: (index: number) => void
}

export function ArtifactPreview({
  artifact,
  artifacts = [],
  currentIndex = 0,
  isStreaming = false,
  onClose,
  onNavigate,
}: ArtifactPreviewProps) {
  const [mode, setMode] = useState<"code" | "preview">("code")
  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop")
  const [copied, setCopied] = useState(false)
  const [iframeKey, setIframeKey] = useState(0)
  const codeContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isStreaming) {
      setMode("code")
    }
  }, [isStreaming])

  // Auto-scroll to follow streaming code
  useEffect(() => {
    if (isStreaming && mode === "code" && codeContainerRef.current) {
      codeContainerRef.current.scrollTop = codeContainerRef.current.scrollHeight
    }
  }, [artifact.content, isStreaming, mode])

  // Auto-switch to preview when streaming completes
  useEffect(() => {
    if (!isStreaming && mode === "code") {
      const timer = setTimeout(() => {
        setMode("preview")
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

  const handleDownload = () => {
    const blob = new Blob([artifact.content], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${artifact.title.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleOpenInBrowser = () => {
    const blob = new Blob([artifact.content], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank")
  }

  const handleRefreshPreview = () => {
    setIframeKey((prev) => prev + 1)
  }

  const hasMultipleArtifacts = artifacts.length > 1

  // Calculate stats
  const lineCount = artifact.content.split('\n').length
  const charCount = artifact.content.length

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="flex h-full flex-col border-l bg-background"
    >
      {/* Header - Two rows for better layout */}
      <div className="border-b">
        {/* Top row: Title and close */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b">
          <div className="flex items-center gap-2 min-w-0">
            {hasMultipleArtifacts && (
              <div className="flex items-center gap-1 mr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={() => onNavigate?.(currentIndex - 1)}
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground font-medium min-w-[3ch] text-center">
                  {currentIndex + 1}/{artifacts.length}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-primary/10 hover:text-primary transition-colors"
                  onClick={() => onNavigate?.(currentIndex + 1)}
                  disabled={currentIndex === artifacts.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-medium text-sm truncate max-w-[200px]">{artifact.title}</span>
              <span className="shrink-0 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                HTML
              </span>
              <AnimatePresence mode="wait">
                {isStreaming ? (
                  <motion.div
                    key="streaming"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="flex items-center gap-1.5 text-primary"
                  >
                    <Sparkles className="h-3.5 w-3.5 animate-pulse" />
                    <span className="text-xs font-medium">Live</span>
                  </motion.div>
                ) : (
                  <motion.span
                    key="stats"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-muted-foreground"
                  >
                    {lineCount} lines
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          </div>
          {onClose && (
            <motion.button
              type="button"
              className="h-8 w-8 shrink-0 flex items-center justify-center rounded-lg border border-transparent hover:border-destructive/20 hover:bg-destructive/10 hover:text-destructive transition-all z-50 cursor-pointer"
              onClick={onClose}
              aria-label="Close artifact preview"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <X className="h-4 w-4" />
            </motion.button>
          )}
        </div>

        {/* Bottom row: Controls */}
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            {/* Code/Preview Toggle */}
            <div className="flex items-center gap-0.5 rounded-lg border bg-muted p-0.5">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 gap-1.5 px-2.5 transition-all",
                  mode === "code" && "bg-background shadow-sm"
                )}
                onClick={() => setMode("code")}
              >
                <Code2 className="h-3.5 w-3.5" />
                <span className="text-xs">Code</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 gap-1.5 px-2.5 transition-all",
                  mode === "preview" && "bg-background shadow-sm"
                )}
                onClick={() => setMode("preview")}
                disabled={isStreaming}
              >
                <Eye className="h-3.5 w-3.5" />
                <span className="text-xs">Preview</span>
              </Button>
            </div>

            {/* Device Mode Toggle (Preview only) */}
            <AnimatePresence>
              {mode === "preview" && !isStreaming && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, x: -10 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: -10 }}
                  className="flex items-center gap-0.5 rounded-lg border bg-muted p-0.5"
                >
                  {[
                    { mode: "mobile" as DeviceMode, icon: Smartphone, title: "Mobile (375px)" },
                    { mode: "tablet" as DeviceMode, icon: Tablet, title: "Tablet (768px)" },
                    { mode: "desktop" as DeviceMode, icon: Monitor, title: "Desktop (Full Width)" },
                  ].map(({ mode: m, icon: Icon, title }) => (
                    <Button
                      key={m}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 w-7 p-0 transition-all",
                        deviceMode === m && "bg-background shadow-sm"
                      )}
                      onClick={() => setDeviceMode(m)}
                      title={title}
                    >
                      <Icon className="h-3.5 w-3.5" />
                    </Button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Refresh button for preview */}
            <AnimatePresence>
              {mode === "preview" && !isStreaming && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                >
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={handleRefreshPreview}
                    title="Refresh preview"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "h-7 gap-1.5 px-2 transition-all",
                  copied && "text-green-600 bg-green-50"
                )}
                onClick={handleCopy}
              >
                <motion.div
                  key={copied ? "check" : "copy"}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </motion.div>
                <span className="text-xs hidden sm:inline">{copied ? "Copied!" : "Copy"}</span>
              </Button>
            </motion.div>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2" onClick={handleDownload}>
              <Download className="h-3.5 w-3.5" />
              <span className="text-xs hidden sm:inline">Download</span>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 gap-1.5 px-2" onClick={handleOpenInBrowser}>
              <ExternalLink className="h-3.5 w-3.5" />
              <span className="text-xs hidden sm:inline">Open</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {mode === "code" ? (
            <motion.div
              key="code"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              ref={codeContainerRef}
              className="absolute inset-0 overflow-auto bg-muted/30"
            >
              <div className="p-4 font-mono text-sm leading-relaxed">
                {isStreaming ? (
                  // During streaming: simple display with streaming indicator
                  <>
                    <pre className="whitespace-pre-wrap break-words text-foreground">
                      {artifact.content}
                      <motion.span
                        className="inline-block w-2 h-4 bg-primary ml-0.5 align-middle"
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 0.8, repeat: Infinity }}
                      />
                    </pre>
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 flex items-center gap-3 text-xs"
                    >
                      <div className="flex items-center gap-2 text-primary">
                        <motion.div
                          className="h-2 w-2 rounded-full bg-primary"
                          animate={{ scale: [1, 1.2, 1], opacity: [1, 0.5, 1] }}
                          transition={{ duration: 1, repeat: Infinity }}
                        />
                        <span className="font-medium">Streaming code...</span>
                      </div>
                      <span className="text-muted-foreground">
                        {lineCount} lines - {charCount.toLocaleString()} chars
                      </span>
                    </motion.div>
                  </>
                ) : (
                  // After streaming: display with line numbers
                  <code className="block text-foreground">
                    {artifact.content.split('\n').map((line, i) => (
                      <div key={i} className="flex group">
                        <span className="select-none pr-4 text-right text-muted-foreground/40 min-w-[3.5em] group-hover:text-muted-foreground/60 transition-colors">
                          {i + 1}
                        </span>
                        <span className="flex-1 hover:bg-muted/50 -mx-2 px-2 rounded transition-colors">
                          {line || ' '}
                        </span>
                      </div>
                    ))}
                  </code>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 flex items-center justify-center overflow-hidden bg-white"
            >
              <motion.div
                className={cn(
                  "h-full transition-all duration-300",
                  deviceMode === "desktop" ? "w-full" : "border-x shadow-lg rounded-lg overflow-hidden"
                )}
                style={{
                  width: DEVICE_WIDTHS[deviceMode],
                  maxWidth: "100%",
                }}
                initial={{ scale: 0.98, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              >
                <iframe
                  key={iframeKey}
                  srcDoc={artifact.content}
                  className="h-full w-full border-0"
                  sandbox="allow-scripts allow-same-origin"
                  title={artifact.title}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom status bar */}
      <div className="border-t px-4 py-1.5 flex items-center justify-between text-xs text-muted-foreground bg-muted/30">
        <div className="flex items-center gap-3">
          <span>{lineCount} lines</span>
          <span>{charCount.toLocaleString()} characters</span>
        </div>
        <div className="flex items-center gap-2">
          {mode === "preview" && (
            <span className="capitalize">{deviceMode} view</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

/**
 * Mobile-friendly full-screen artifact preview
 */
export function MobileArtifactPreview({
  artifact,
  isStreaming = false,
  onClose,
}: Omit<ArtifactPreviewProps, "artifacts" | "currentIndex" | "onNavigate">) {
  return (
    <motion.div
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed inset-0 z-50 bg-background md:hidden"
    >
      <ArtifactPreview
        artifact={artifact}
        isStreaming={isStreaming}
        onClose={onClose}
      />
    </motion.div>
  )
}
