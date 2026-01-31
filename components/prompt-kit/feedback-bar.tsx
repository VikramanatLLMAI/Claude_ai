"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ThumbsUp, ThumbsDown, MessageSquare } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"

type FeedbackType = "positive" | "negative" | null

interface FeedbackBarProps {
  className?: string
  onFeedback?: (feedback: FeedbackType, comment?: string) => void
  onPositive?: () => void
  onNegative?: () => void
  showCommentPrompt?: boolean
  initialFeedback?: FeedbackType
}

const FeedbackBar = React.forwardRef<HTMLDivElement, FeedbackBarProps>(
  (
    {
      className,
      onFeedback,
      onPositive,
      onNegative,
      showCommentPrompt = true,
      initialFeedback = null,
    },
    ref
  ) => {
    const [feedback, setFeedback] = React.useState<FeedbackType>(initialFeedback)
    const [showComment, setShowComment] = React.useState(false)
    const [comment, setComment] = React.useState("")
    const [submitted, setSubmitted] = React.useState(false)

    const handleFeedback = (type: FeedbackType) => {
      setFeedback(type)

      if (type === "positive") {
        onPositive?.()
        onFeedback?.(type)
        setSubmitted(true)
      } else if (type === "negative") {
        onNegative?.()
        if (showCommentPrompt) {
          setShowComment(true)
        } else {
          onFeedback?.(type)
          setSubmitted(true)
        }
      }
    }

    const handleSubmitComment = () => {
      onFeedback?.(feedback, comment)
      setSubmitted(true)
      setShowComment(false)
    }

    if (submitted) {
      return (
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground",
            className
          )}
        >
          <span>Thanks for your feedback!</span>
        </motion.div>
      )
    }

    return (
      <div
        ref={ref}
        className={cn("space-y-2", className)}
      >
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-3 py-2"
        >
          <span className="text-sm text-muted-foreground">Was this helpful?</span>
          <div className="flex items-center gap-1">
            <Button
              variant={feedback === "positive" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-7 px-2",
                feedback === "positive" && "bg-green-500 hover:bg-green-600"
              )}
              onClick={() => handleFeedback("positive")}
            >
              <ThumbsUp className="h-4 w-4" />
            </Button>
            <Button
              variant={feedback === "negative" ? "default" : "ghost"}
              size="sm"
              className={cn(
                "h-7 px-2",
                feedback === "negative" && "bg-red-500 hover:bg-red-600"
              )}
              onClick={() => handleFeedback("negative")}
            >
              <ThumbsDown className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>

        <AnimatePresence>
          {showComment && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MessageSquare className="h-4 w-4" />
                  <span>What could be improved?</span>
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Optional: Tell us what went wrong..."
                  className="min-h-[80px] w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
                <div className="flex justify-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowComment(false)
                      onFeedback?.("negative")
                      setSubmitted(true)
                    }}
                  >
                    Skip
                  </Button>
                  <Button size="sm" onClick={handleSubmitComment}>
                    Submit
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)

FeedbackBar.displayName = "FeedbackBar"

export { FeedbackBar, type FeedbackType }
