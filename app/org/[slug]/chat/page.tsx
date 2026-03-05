"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import { FullChatApp } from "@/components/full-chat-app"
import { OnboardingWizard } from "@/components/onboarding-wizard"
import { PageLoadingSkeleton } from "@/components/ui/skeleton-loaders"

const AUTH_SESSION_KEY = "llmatscale_auth_session"
const AUTH_TOKEN_KEY = "llmatscale_auth_token"

function hasValidSession() {
  if (typeof window === "undefined") return false
  const session = window.localStorage.getItem(AUTH_SESSION_KEY)
  const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
  return !!(session && token)
}

/**
 * Org-scoped chat page.
 *
 * Thin wrapper around the existing FullChatApp component.
 * Adds onboarding check: if the user has not accepted the current onboarding version,
 * the OnboardingWizard is shown instead of the chat UI.
 */
export default function OrgChatPage() {
  const router = useRouter()
  const params = useParams<{ slug: string }>()
  const session = hasValidSession()

  // Onboarding state
  const [onboardingRequired, setOnboardingRequired] = useState<boolean | null>(null)
  const [onboardingText, setOnboardingText] = useState<string | null>(null)
  const [conversationVisibility, setConversationVisibility] = useState(false)
  const [orgName, setOrgName] = useState("")

  useEffect(() => {
    if (typeof window === "undefined") return
    if (!hasValidSession()) {
      router.replace(`/org/${params.slug}/login`)
    }
  }, [router, params.slug])

  // Read org name from session
  useEffect(() => {
    try {
      const sessionData = localStorage.getItem(AUTH_SESSION_KEY)
      if (sessionData) {
        const parsed = JSON.parse(sessionData)
        if (parsed.organization?.name) {
          setOrgName(parsed.organization.name)
        }
      }
    } catch {
      // ignore
    }
  }, [])

  // Check onboarding requirement
  useEffect(() => {
    if (!session) return

    async function checkOnboarding() {
      try {
        const token = localStorage.getItem(AUTH_TOKEN_KEY) || ""
        const res = await fetch(`/api/org/${params.slug}/onboarding`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (res.ok) {
          const data = await res.json()
          setOnboardingRequired(data.required === true)
          setOnboardingText(data.text ?? null)

          // Also check conversation visibility for the onboarding notice
          // We can infer from the org settings - fetch separately
          try {
            const visRes = await fetch(`/api/org/${params.slug}/admin/settings/visibility`, {
              headers: { Authorization: `Bearer ${token}` },
            })
            if (visRes.ok) {
              const visData = await visRes.json()
              setConversationVisibility(visData.conversationVisibility === true)
            }
          } catch {
            // Non-admin users will get 403, which is fine - default to false
          }
        } else {
          // If endpoint fails, assume not required (graceful degradation)
          setOnboardingRequired(false)
        }
      } catch {
        setOnboardingRequired(false)
      }
    }

    checkOnboarding()
  }, [session, params.slug])

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingRequired(false)
  }, [])

  if (!session) {
    return <PageLoadingSkeleton />
  }

  // Still checking onboarding status
  if (onboardingRequired === null) {
    return <PageLoadingSkeleton />
  }

  // Onboarding required - show wizard
  if (onboardingRequired) {
    return (
      <OnboardingWizard
        orgName={orgName || params.slug}
        orgSlug={params.slug}
        onboardingText={onboardingText}
        conversationVisibility={conversationVisibility}
        onComplete={handleOnboardingComplete}
      />
    )
  }

  // FullChatApp's SidebarProvider already has h-svh - no extra wrapper needed
  return <FullChatApp />
}
