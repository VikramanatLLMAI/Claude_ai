"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { FullChatApp } from "@/components/full-chat-app"

const AUTH_SESSION_KEY = "athena_auth_session"
const AUTH_TOKEN_KEY = "athena_auth_token"

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
        return (
            <div className="flex h-svh items-center justify-center bg-background overflow-hidden">
                <p className="text-sm text-muted-foreground">Checking session...</p>
            </div>
        )
    }

    // FullChatApp's SidebarProvider already has h-svh - no extra wrapper needed
    return <FullChatApp />
}
