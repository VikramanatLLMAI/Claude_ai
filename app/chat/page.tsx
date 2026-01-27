"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { FullChatApp } from "@/components/full-chat-app"

const AUTH_SESSION_KEY = "athena_auth_session"

function getSession() {
    if (typeof window === "undefined") return null
    return window.localStorage.getItem(AUTH_SESSION_KEY)
}

export default function ChatPage() {
    const router = useRouter()
    const session = getSession()

    useEffect(() => {
        if (typeof window === "undefined") return
        if (!window.localStorage.getItem(AUTH_SESSION_KEY)) {
            router.replace("/")
        }
    }, [router])

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <p className="text-sm text-muted-foreground">Checking session...</p>
            </div>
        )
    }

    return <FullChatApp />
}
