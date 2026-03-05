"use client"

import * as React from "react"
import { ShieldAlert, X, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

const AUTH_TOKEN_KEY = "llmatscale_auth_token"
const IMPERSONATION_ORIGINAL_SESSION = "llmatscale_impersonation_original_session"

interface ImpersonationStatus {
  isImpersonating: boolean
  impersonatorName?: string
  targetUserName?: string
  targetUserEmail?: string
  reason?: string
  expiresAt?: string
}

/**
 * ImpersonationBanner
 *
 * Fixed-position banner displayed at the top of ALL pages during an active
 * impersonation session. Shows who is being impersonated, the reason,
 * a countdown timer, and an "End Impersonation" button.
 *
 * Renders nothing when not impersonating.
 */
export function ImpersonationBanner() {
  const [status, setStatus] = React.useState<ImpersonationStatus | null>(null)
  const [timeLeft, setTimeLeft] = React.useState("")
  const [ending, setEnding] = React.useState(false)

  // Check impersonation status on mount
  React.useEffect(() => {
    const isImpersonating = localStorage.getItem("llmatscale_impersonating")
    if (isImpersonating !== "true") {
      setStatus(null)
      return
    }

    const fetchStatus = async () => {
      try {
        const token = localStorage.getItem(AUTH_TOKEN_KEY)
        if (!token) return

        const res = await fetch("/api/super-admin/impersonation", {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          // Session expired or invalid — clean up
          handleExpired()
          return
        }

        const data: ImpersonationStatus = await res.json()
        if (!data.isImpersonating) {
          handleExpired()
          return
        }

        setStatus(data)
      } catch {
        // Network error — keep banner if we think we're impersonating
      }
    }

    fetchStatus()
  }, [])

  // Countdown timer
  React.useEffect(() => {
    if (!status?.expiresAt) return

    const updateTimer = () => {
      const now = Date.now()
      const expires = new Date(status.expiresAt!).getTime()
      const diff = expires - now

      if (diff <= 0) {
        setTimeLeft("Expired")
        handleExpired()
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [status?.expiresAt])

  const handleExpired = () => {
    // Session expired — restore original SA session
    restoreOriginalSession()
  }

  const handleEndImpersonation = async () => {
    setEnding(true)
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY)
      if (token) {
        await fetch("/api/super-admin/impersonation", {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      }
    } catch {
      // Even if the API call fails, restore the SA session
    }

    restoreOriginalSession()
  }

  const restoreOriginalSession = () => {
    // Restore the SA's original session
    const stored = localStorage.getItem(IMPERSONATION_ORIGINAL_SESSION)
    if (stored) {
      try {
        const original = JSON.parse(stored)
        if (original.token) {
          localStorage.setItem(AUTH_TOKEN_KEY, original.token)
        }
        if (original.session) {
          localStorage.setItem("llmatscale_auth_session", original.session)
        }
      } catch {
        // If parsing fails, just clear everything
      }
    }

    // Clean up impersonation markers
    localStorage.removeItem(IMPERSONATION_ORIGINAL_SESSION)
    localStorage.removeItem("llmatscale_impersonating")

    // Redirect to SA users page
    window.location.href = "/super-admin/users"
  }

  // Don't render if not impersonating
  if (!status?.isImpersonating) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 bg-amber-500 px-4 py-2 text-amber-950 shadow-md dark:bg-amber-600 dark:text-amber-50">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 shrink-0" />
        <span className="text-sm font-medium">
          Impersonating <strong>{status.targetUserName}</strong>
          {status.reason && (
            <span className="ml-1 font-normal opacity-80">
              -- {status.reason}
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-3">
        {timeLeft && (
          <div className="flex items-center gap-1.5 text-sm font-mono">
            <Clock className="h-3.5 w-3.5" />
            <span>{timeLeft}</span>
          </div>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={handleEndImpersonation}
          disabled={ending}
          className="border-amber-700 bg-amber-600/20 text-amber-950 hover:bg-amber-600/40 dark:border-amber-300 dark:text-amber-50 dark:hover:bg-amber-500/40"
        >
          {ending ? "Ending..." : "End Impersonation"}
        </Button>
      </div>
    </div>
  )
}
