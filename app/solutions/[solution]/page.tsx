"use client"

import { useEffect, useMemo } from "react"
import { useRouter, useParams } from "next/navigation"
import { FullChatApp } from "@/components/full-chat-app"

// Valid solution types
const VALID_SOLUTIONS = [
  'manufacturing',
  'maintenance',
  'support',
  'change-management',
  'impact-analysis',
  'requirements',
] as const

type SolutionType = typeof VALID_SOLUTIONS[number]

const AUTH_SESSION_KEY = "athena_auth_session"
const AUTH_TOKEN_KEY = "athena_auth_token"

function isValidSolution(solution: string): solution is SolutionType {
  return VALID_SOLUTIONS.includes(solution as SolutionType)
}

export default function SolutionChatPage() {
  const router = useRouter()
  const params = useParams()

  // Get the solution type from URL params
  const solutionParam = params.solution as string

  // Check authentication and solution validity synchronously
  const authState = useMemo(() => {
    if (typeof window === "undefined") {
      return { isLoading: true, isAuthenticated: false, isValidSolution: false }
    }

    const session = window.localStorage.getItem(AUTH_SESSION_KEY)
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    const hasAuth = !!(session && token)
    const validSolution = isValidSolution(solutionParam)

    return {
      isLoading: false,
      isAuthenticated: hasAuth,
      isValidSolution: validSolution,
    }
  }, [solutionParam])

  // Handle redirects in useEffect
  useEffect(() => {
    if (authState.isLoading) return

    if (!authState.isAuthenticated) {
      router.replace("/")
      return
    }

    if (!authState.isValidSolution) {
      console.error(`Invalid solution type: ${solutionParam}`)
      router.replace("/solutions")
    }
  }, [authState, router, solutionParam])

  // Show loading state
  if (authState.isLoading || !authState.isAuthenticated || !authState.isValidSolution) {
    return (
      <div className="flex h-svh items-center justify-center bg-background overflow-hidden">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    )
  }

  // FullChatApp's SidebarProvider already has h-svh - no extra wrapper needed
  return <FullChatApp solutionType={solutionParam} />
}
