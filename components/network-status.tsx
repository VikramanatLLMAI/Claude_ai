"use client"

import * as React from "react"
import { WifiOff, RefreshCw } from "lucide-react"
import { motion, AnimatePresence } from "motion/react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useNetworkStatus } from "./providers"

interface NetworkStatusProps {
  className?: string
}

/**
 * Network status indicator banner
 * Shows a banner when the user loses internet connection
 */
export function NetworkStatusBanner({ className }: NetworkStatusProps) {
  const isOnline = useNetworkStatus()
  const [wasOffline, setWasOffline] = React.useState(false)
  const [showReconnected, setShowReconnected] = React.useState(false)

  React.useEffect(() => {
    if (!isOnline) {
      setWasOffline(true)
    } else if (wasOffline) {
      // Show "reconnected" message briefly
      setShowReconnected(true)
      const timer = setTimeout(() => {
        setShowReconnected(false)
        setWasOffline(false)
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [isOnline, wasOffline])

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "overflow-hidden bg-orange-500 text-white",
            className
          )}
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm">
            <WifiOff className="h-4 w-4" />
            <span>You&apos;re offline. Check your internet connection.</span>
          </div>
        </motion.div>
      )}
      {showReconnected && isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "overflow-hidden bg-green-500 text-white",
            className
          )}
        >
          <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm">
            <RefreshCw className="h-4 w-4" />
            <span>You&apos;re back online!</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/**
 * Compact network status indicator
 * Shows a small icon when offline
 */
export function NetworkStatusIndicator({ className }: NetworkStatusProps) {
  const isOnline = useNetworkStatus()

  if (isOnline) return null

  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className={cn(
        "flex items-center gap-1.5 rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
        className
      )}
    >
      <WifiOff className="h-3 w-3" />
      <span>Offline</span>
    </motion.div>
  )
}

/**
 * Hook to track if a request is pending during offline state
 */
export function usePendingOffline() {
  const isOnline = useNetworkStatus()
  const [hasPendingRequest, setHasPendingRequest] = React.useState(false)

  const setPending = React.useCallback((pending: boolean) => {
    if (!isOnline && pending) {
      setHasPendingRequest(true)
    } else if (isOnline) {
      setHasPendingRequest(false)
    }
  }, [isOnline])

  // Auto-clear pending when coming back online
  React.useEffect(() => {
    if (isOnline && hasPendingRequest) {
      setHasPendingRequest(false)
    }
  }, [isOnline, hasPendingRequest])

  return {
    isOnline,
    hasPendingRequest,
    setPending,
  }
}

/**
 * Offline-aware button
 * Disables and shows tooltip when offline
 */
export function OfflineAwareButton({
  children,
  onClick,
  disabled,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { children: React.ReactNode }) {
  const isOnline = useNetworkStatus()

  return (
    <Button
      onClick={onClick}
      disabled={disabled || !isOnline}
      className={className}
      title={!isOnline ? "You are offline" : undefined}
      {...props}
    >
      {children}
    </Button>
  )
}
