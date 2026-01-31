"use client"

import React from "react"
import { AlertTriangle, RefreshCw, Home, Bug, Frown, Coffee, Sparkles, WifiOff, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "motion/react"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorInfo: React.ErrorInfo | null
}

/**
 * Error Boundary component to catch and handle React errors gracefully
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Error caught by boundary:", error, errorInfo)
    this.setState({ errorInfo })
    this.props.onError?.(error, errorInfo)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <ErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleRetry}
        />
      )
    }

    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  errorInfo?: React.ErrorInfo | null
  onRetry?: () => void
  title?: string
  description?: string
}

// Friendly error messages to add personality
const friendlyMessages = [
  "Oops! I tripped over a digital rock.",
  "Something got tangled in the wires.",
  "I need a moment to collect my thoughts.",
  "Even AIs have off days sometimes.",
  "My circuits got a bit confused there.",
]

/**
 * Default error fallback UI component with friendly messaging
 */
export function ErrorFallback({
  error,
  errorInfo,
  onRetry,
  title = "Something went wrong",
  description,
}: ErrorFallbackProps) {
  const [showDetails, setShowDetails] = React.useState(false)
  const friendlyMessage = React.useMemo(
    () => description || friendlyMessages[Math.floor(Math.random() * friendlyMessages.length)],
    [description]
  )

  return (
    <div className="flex min-h-[400px] items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
      >
        <Card className="w-full max-w-md border-destructive/20">
          <CardHeader className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
              className="mx-auto mb-4 relative"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10">
                <Frown className="h-8 w-8 text-destructive" />
              </div>
              <motion.div
                className="absolute -top-1 -right-1"
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles className="h-4 w-4 text-destructive/50" />
              </motion.div>
            </motion.div>
            <CardTitle className="text-xl">{title}</CardTitle>
            <CardDescription className="mt-2">{friendlyMessage}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="rounded-lg bg-muted/50 p-3 border border-border"
              >
                <p className="font-mono text-sm text-muted-foreground break-words">
                  {error.message || "Unknown error"}
                </p>
              </motion.div>
            )}
            {showDetails && errorInfo && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="max-h-40 overflow-auto rounded-lg bg-muted/30 p-3 border border-border"
              >
                <pre className="font-mono text-xs text-muted-foreground whitespace-pre-wrap">
                  {errorInfo.componentStack}
                </pre>
              </motion.div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <div className="flex w-full gap-2">
              {onRetry && (
                <Button onClick={onRetry} className="flex-1 gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Try Again
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => window.location.href = "/"}
                className="flex-1 gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </div>
            {errorInfo && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full gap-2 text-muted-foreground"
              >
                <Bug className="h-4 w-4" />
                {showDetails ? "Hide" : "Show"} Technical Details
              </Button>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}

/**
 * Chat-specific error fallback with friendly messaging
 */
export function ChatErrorFallback({
  error,
  onRetry,
}: {
  error: Error | null
  onRetry?: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-8 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-destructive/20 to-destructive/5"
      >
        <Coffee className="h-7 w-7 text-destructive" />
      </motion.div>
      <h3 className="mb-2 text-lg font-semibold">Chat needs a coffee break</h3>
      <p className="mb-4 text-sm text-muted-foreground max-w-sm">
        {error?.message || "Something went wrong with the chat. Let's give it another try."}
      </p>
      {onRetry && (
        <Button onClick={onRetry} size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Wake it up
        </Button>
      )}
    </motion.div>
  )
}

/**
 * Network error display component with animation
 */
export function NetworkError({
  onRetry,
  message = "Unable to connect. Please check your internet connection.",
}: {
  onRetry?: () => void
  message?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-6 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="mb-4 relative"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-orange-500/20 to-orange-500/5">
          <WifiOff className="h-7 w-7 text-orange-600 dark:text-orange-400" />
        </div>
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-orange-500/30"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>
      <h3 className="mb-2 font-semibold">Connection Lost</h3>
      <p className="mb-4 text-sm text-muted-foreground max-w-sm">{message}</p>
      {onRetry && (
        <Button onClick={onRetry} variant="outline" size="sm" className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Reconnect
        </Button>
      )}
    </motion.div>
  )
}

/**
 * Rate limit error display component with countdown
 */
export function RateLimitError({
  retryAfter,
  onRetry,
}: {
  retryAfter?: number
  onRetry?: () => void
}) {
  const [countdown, setCountdown] = React.useState(retryAfter || 60)

  React.useEffect(() => {
    if (countdown <= 0) return

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [countdown])

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-6 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="mb-4"
      >
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-500/5">
          <Clock className="h-7 w-7 text-yellow-600 dark:text-yellow-400" />
        </div>
      </motion.div>
      <h3 className="mb-2 font-semibold">Slow down there, speedster!</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Too many requests. Let's take a breather.
      </p>
      {countdown > 0 ? (
        <motion.div
          key={countdown}
          initial={{ scale: 1.2, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-3xl font-mono font-bold text-primary"
        >
          {countdown}s
        </motion.div>
      ) : (
        onRetry && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button onClick={onRetry} size="sm" className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Try Again
            </Button>
          </motion.div>
        )
      )}
    </motion.div>
  )
}

/**
 * Empty state component for when there's no data
 */
export function EmptyState({
  icon: Icon = Sparkles,
  title = "Nothing here yet",
  description = "Start by creating something new.",
  action,
  actionLabel = "Get Started",
}: {
  icon?: React.ElementType
  title?: string
  description?: string
  action?: () => void
  actionLabel?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-8 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="mb-4"
      >
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-primary/5">
          <Icon className="h-8 w-8 text-primary/70" />
        </div>
      </motion.div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="mb-4 text-sm text-muted-foreground max-w-sm">{description}</p>
      {action && (
        <Button onClick={action} className="gap-2">
          <Sparkles className="h-4 w-4" />
          {actionLabel}
        </Button>
      )}
    </motion.div>
  )
}
