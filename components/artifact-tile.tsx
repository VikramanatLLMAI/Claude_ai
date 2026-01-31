"use client"

import { FileCode, Eye, ExternalLink, Share2, ArrowRight, Sparkles, Code2, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Artifact } from "@/lib/artifacts"
import { motion, AnimatePresence } from "motion/react"

interface ArtifactTileProps {
  artifact: Artifact
  artifactId?: string
  onClick?: () => void
  onShare?: () => void
  isActive?: boolean
  isStreaming?: boolean
}

export function ArtifactTile({
  artifact,
  artifactId,
  onClick,
  onShare,
  isActive = false,
  isStreaming = false,
}: ArtifactTileProps) {
  const handleOpenInBrowser = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isStreaming) return
    const blob = new Blob([artifact.content], { type: "text/html" })
    const url = URL.createObjectURL(blob)
    window.open(url, "_blank")
  }

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isStreaming) return
    onShare?.()
  }

  // Calculate approximate line count for the preview
  const lineCount = artifact.content.split("\n").length
  const charCount = artifact.content.length

  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
      whileHover={!isStreaming ? { scale: 1.01, y: -2 } : undefined}
      whileTap={!isStreaming ? { scale: 0.99 } : undefined}
      className={cn(
        "artifact-tile group relative mt-3 w-full cursor-pointer rounded-xl border p-4 transition-all duration-200",
        isStreaming && "artifact-tile-streaming",
        isActive && "artifact-tile-active"
      )}
      onClick={onClick}
    >
      {/* Streaming glow effect */}
      {isStreaming && (
        <motion.div
          className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10"
          animate={{
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      )}

      <div className="relative flex items-center justify-between gap-4">
        {/* Left side: Icon + Content */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          {/* Icon with animation */}
          <motion.div
            className={cn(
              "relative flex h-12 w-12 items-center justify-center rounded-xl",
              isStreaming
                ? "bg-gradient-to-br from-primary/30 to-primary/20"
                : "bg-gradient-to-br from-primary/15 to-primary/10"
            )}
            animate={isStreaming ? {
              scale: [1, 1.05, 1],
            } : undefined}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {isStreaming ? (
              <>
                <Code2 className="h-5 w-5 text-primary" />
                <motion.div
                  className="absolute -top-1 -right-1"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.7, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                  }}
                >
                  <Zap className="h-3.5 w-3.5 text-primary fill-primary" />
                </motion.div>
              </>
            ) : (
              <FileCode className="h-5 w-5 text-primary" />
            )}
          </motion.div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{artifact.title}</h3>
            <AnimatePresence mode="wait">
              {isStreaming ? (
                <motion.div
                  key="streaming"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="mt-1 flex items-center gap-2"
                >
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-1 h-1 rounded-full bg-primary"
                        animate={{
                          opacity: [0.3, 1, 0.3],
                          scale: [0.8, 1, 0.8],
                        }}
                        transition={{
                          duration: 0.8,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-primary font-medium">
                    Building artifact...
                  </span>
                </motion.div>
              ) : (
                <motion.p
                  key="static"
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="mt-0.5 text-xs text-muted-foreground"
                >
                  {lineCount} lines - {charCount.toLocaleString()} chars
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right side: Badge + Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* HTML Badge - always visible */}
          <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            HTML
          </span>

          <AnimatePresence mode="wait">
            {isStreaming ? (
              <motion.div
                key="streaming-indicator"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 text-primary"
              >
                <Sparkles className="h-4 w-4 animate-pulse" />
                <motion.div
                  animate={{ x: [0, 4, 0] }}
                  transition={{ duration: 1, repeat: Infinity }}
                >
                  <ArrowRight className="h-5 w-5" />
                </motion.div>
              </motion.div>
            ) : (
              <motion.div
                key="actions"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2"
              >
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-2.5 text-xs hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                  onClick={handleOpenInBrowser}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Open
                </Button>
                {artifactId && onShare && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 px-2 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-all"
                    onClick={handleShare}
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 px-2.5 text-xs bg-primary/5 border-primary/20 hover:bg-primary/15 hover:text-primary hover:border-primary/40 transition-all"
                >
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Active Indicator with animation */}
      <AnimatePresence>
        {isActive && !isStreaming && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute right-3 top-3"
          >
            <motion.div
              className="h-2.5 w-2.5 rounded-full bg-primary"
              animate={{
                boxShadow: [
                  "0 0 0 0 rgba(var(--primary), 0.4)",
                  "0 0 0 4px rgba(var(--primary), 0)",
                ],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom progress bar for streaming */}
      <AnimatePresence>
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0, scaleX: 0 }}
            className="absolute bottom-0 left-0 right-0 h-0.5 overflow-hidden rounded-b-xl"
            style={{ originX: 0 }}
          >
            <motion.div
              className="h-full bg-gradient-to-r from-primary/50 via-primary to-primary/50"
              animate={{
                x: ["-100%", "100%"],
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
