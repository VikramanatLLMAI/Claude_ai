"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { FullChatApp } from "@/components/full-chat-app"
import { PageLoadingSkeleton } from "@/components/ui/skeleton-loaders"

const AUTH_SESSION_KEY = "llmatscale_auth_session"
const AUTH_TOKEN_KEY = "llmatscale_auth_token"

function hasValidSession() {
    if (typeof window === "undefined") return false
    const session = window.localStorage.getItem(AUTH_SESSION_KEY)
    const token = window.localStorage.getItem(AUTH_TOKEN_KEY)
    return !!(session && token)
}

export default function ChatPage() {
    const router = useRouter()
    const session = hasValidSession()

    useEffect(() => {
        if (typeof window === "undefined") return
        if (!hasValidSession()) {
            router.replace("/")
        }
    }, [router])

    if (!session) {
        return <PageLoadingSkeleton />
    }

    // FullChatApp's SidebarProvider already has h-svh - no extra wrapper needed
    return <FullChatApp />
}
