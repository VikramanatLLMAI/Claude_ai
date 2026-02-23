"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { motion, AnimatePresence } from "motion/react"
import {
    Shield,
    Zap,
    ArrowRight,
    Check
} from "lucide-react"

type AuthMode = "signin" | "signup"

const AUTH_SESSION_KEY = "athena_auth_session"
const AUTH_TOKEN_KEY = "athena_auth_token"

export function LoginPage() {
    const router = useRouter()
    const [mode, setMode] = React.useState<AuthMode>("signin")
    const [error, setError] = React.useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    React.useEffect(() => {
        if (typeof window === "undefined") return
        const sessionData = window.localStorage.getItem(AUTH_SESSION_KEY)
        const token = window.localStorage.getItem(AUTH_TOKEN_KEY)

        if (sessionData && token) {
            try {
                const session = JSON.parse(sessionData)
                if (session.expiresAt && new Date(session.expiresAt) > new Date()) {
                    router.replace("/solutions")
                } else {
                    window.localStorage.removeItem(AUTH_SESSION_KEY)
                    window.localStorage.removeItem(AUTH_TOKEN_KEY)
                }
            } catch {
                window.localStorage.removeItem(AUTH_SESSION_KEY)
                window.localStorage.removeItem(AUTH_TOKEN_KEY)
            }
        }
    }, [router])

    const normalizeEmail = (value: string) => value.trim().toLowerCase()

    const writeSession = (token: string, user: { id: string; email: string; name?: string | null }, expiresAt: string) => {
        window.localStorage.setItem(AUTH_TOKEN_KEY, token)
        window.localStorage.setItem(
            AUTH_SESSION_KEY,
            JSON.stringify({ user, signedInAt: new Date().toISOString(), expiresAt })
        )
    }

    const handleModeChange = (nextMode: AuthMode) => {
        setMode(nextMode)
        setError(null)
    }

    const handleSignIn = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        setIsSubmitting(true)

        const formData = new FormData(event.currentTarget)
        const email = normalizeEmail(String(formData.get("email") || ""))
        const password = String(formData.get("password") || "")

        if (!email || !password) {
            setError("Please enter your email and password.")
            setIsSubmitting(false)
            return
        }

        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || "Invalid email or password.")
                setIsSubmitting(false)
                return
            }

            writeSession(data.token, data.user, data.expiresAt)
            router.push("/solutions")
        } catch (err) {
            console.error("Login error:", err)
            setError("Failed to sign in. Please try again.")
            setIsSubmitting(false)
        }
    }

    const handleSignUp = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        setError(null)
        setIsSubmitting(true)

        const formData = new FormData(event.currentTarget)
        const firstName = String(formData.get("firstName") || "").trim()
        const lastName = String(formData.get("lastName") || "").trim()
        const email = normalizeEmail(String(formData.get("email") || ""))
        const password = String(formData.get("password") || "")
        const acceptedTerms = Boolean(formData.get("terms"))

        if (!firstName || !lastName || !email || !password) {
            setError("Please complete all required fields.")
            setIsSubmitting(false)
            return
        }

        if (!acceptedTerms) {
            setError("Please accept the terms to continue.")
            setIsSubmitting(false)
            return
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters long.")
            setIsSubmitting(false)
            return
        }

        try {
            const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    password,
                    name: `${firstName} ${lastName}`,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                setError(data.error || "Failed to create account.")
                setIsSubmitting(false)
                return
            }

            writeSession(data.token, data.user, data.expiresAt)
            router.push("/solutions")
        } catch (err) {
            console.error("Signup error:", err)
            setError("Failed to create account. Please try again.")
            setIsSubmitting(false)
        }
    }

    const capabilities = [
        "Connect 50+ enterprise data sources via MCP",
        "Ask questions in natural language",
        "Generate insights and interactive dashboards",
        "Enterprise-grade security and compliance",
    ]

    return (
        <div className="relative flex h-screen overflow-y-auto bg-background">
            {/* Left Section - Branding */}
            <div className="hidden w-1/2 flex-col justify-between border-r border-border bg-muted/30 p-12 lg:flex">
                {/* Product Name */}
                <div>
                    <h1 className="text-5xl font-bold tracking-tight text-foreground">
                        Fab Orchestrator
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Intelligent Enterprise Platform
                    </p>
                </div>

                {/* Main Content */}
                <div className="max-w-lg">
                    <h2 className="text-4xl font-semibold leading-tight text-foreground">
                        Your data, your questions,
                        <br />
                        <span className="text-primary">instant insights.</span>
                    </h2>

                    <p className="mt-4 text-base text-muted-foreground">
                        Connect your enterprise data sources, ask questions in natural language,
                        and unlock powerful analytics — all in one intelligent platform.
                    </p>

                    {/* Capabilities List */}
                    <ul className="mt-8 space-y-3">
                        {capabilities.map((item) => (
                            <li key={item} className="flex items-center gap-3 text-sm text-foreground/80">
                                <div className="flex size-5 items-center justify-center rounded-full bg-primary/10">
                                    <Check className="size-3 text-primary" />
                                </div>
                                {item}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Footer - Logos & Badges */}
                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-6 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                            <Shield className="size-3.5 text-primary/70" />
                            <span>SOC 2 Compliant</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <Zap className="size-3.5 text-primary/70" />
                            <span>Enterprise Ready</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-end gap-4">
                        <Image
                            src="/logos/athena-logo.jpg"
                            alt="Athena"
                            width={180}
                            height={55}
                            className="h-[55px] w-auto object-contain opacity-70"
                            priority
                            unoptimized
                        />
                        <div className="h-10 w-px bg-border" />
                        <Image
                            src="/logos/llmatscale-logo.png"
                            alt="LLM at Scale.AI"
                            width={220}
                            height={65}
                            className="h-[60px] w-auto object-contain opacity-70"
                            priority
                            unoptimized
                        />
                    </div>
                </div>
            </div>

            {/* Right Section - Auth Form */}
            <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-20">
                {/* Mobile Logo */}
                <div className="mb-10 lg:hidden">
                    <h1 className="text-4xl font-bold tracking-tight text-foreground">
                        Fab Orchestrator
                    </h1>
                    <p className="mt-1 text-xs text-muted-foreground">
                        Intelligent Enterprise Platform
                    </p>
                </div>

                <div className="mx-auto w-full max-w-sm">
                    {/* Header */}
                    <div className="mb-8">
                        <AnimatePresence mode="wait">
                            <motion.h2
                                key={mode}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.15 }}
                                className="text-2xl font-semibold text-foreground"
                            >
                                {mode === "signin" ? "Sign in" : "Create account"}
                            </motion.h2>
                        </AnimatePresence>
                        <p className="mt-1 text-sm text-muted-foreground">
                            {mode === "signin"
                                ? "Enter your credentials to access your account."
                                : "Get started with your free account today."}
                        </p>
                    </div>

                    {/* Error Message */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                className="mb-6 rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                            >
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Forms */}
                    <AnimatePresence mode="wait">
                        {mode === "signin" ? (
                            <motion.form
                                key="signin"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-5"
                                onSubmit={handleSignIn}
                            >
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-foreground">
                                        Email
                                    </label>
                                    <Input
                                        name="email"
                                        type="email"
                                        placeholder="you@company.com"
                                        autoComplete="email"
                                        required
                                        className="h-11"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-foreground">
                                        Password
                                    </label>
                                    <Input
                                        name="password"
                                        type="password"
                                        placeholder="Enter your password"
                                        autoComplete="current-password"
                                        required
                                        className="h-11"
                                    />
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <label className="flex items-center gap-2 text-muted-foreground">
                                        <input
                                            type="checkbox"
                                            className="size-4 rounded border-input bg-background text-primary focus:ring-ring"
                                        />
                                        Remember me
                                    </label>
                                    <button
                                        type="button"
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="h-11 w-full"
                                >
                                    {isSubmitting ? "Signing in..." : "Sign in"}
                                    {!isSubmitting && <ArrowRight className="ml-2 size-4" />}
                                </Button>
                            </motion.form>
                        ) : (
                            <motion.form
                                key="signup"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="space-y-5"
                                onSubmit={handleSignUp}
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-foreground">
                                            First name
                                        </label>
                                        <Input
                                            name="firstName"
                                            type="text"
                                            placeholder="John"
                                            autoComplete="given-name"
                                            required
                                            className="h-11"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-2 block text-sm font-medium text-foreground">
                                            Last name
                                        </label>
                                        <Input
                                            name="lastName"
                                            type="text"
                                            placeholder="Doe"
                                            autoComplete="family-name"
                                            required
                                            className="h-11"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-foreground">
                                        Work email
                                    </label>
                                    <Input
                                        name="email"
                                        type="email"
                                        placeholder="you@company.com"
                                        autoComplete="email"
                                        required
                                        className="h-11"
                                    />
                                </div>
                                <div>
                                    <label className="mb-2 block text-sm font-medium text-foreground">
                                        Password
                                    </label>
                                    <Input
                                        name="password"
                                        type="password"
                                        placeholder="Min. 8 characters"
                                        autoComplete="new-password"
                                        required
                                        className="h-11"
                                    />
                                </div>
                                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                                    <input
                                        name="terms"
                                        type="checkbox"
                                        required
                                        className="mt-0.5 size-4 rounded border-input bg-background text-primary focus:ring-ring"
                                    />
                                    I agree to the Terms of Service and Privacy Policy
                                </label>
                                <Button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="h-11 w-full"
                                >
                                    {isSubmitting ? "Creating account..." : "Create account"}
                                    {!isSubmitting && <ArrowRight className="ml-2 size-4" />}
                                </Button>
                            </motion.form>
                        )}
                    </AnimatePresence>

                    {/* Mode Switch */}
                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        {mode === "signin" ? (
                            <>
                                Don&apos;t have an account?{" "}
                                <button
                                    type="button"
                                    onClick={() => handleModeChange("signup")}
                                    className="font-medium text-primary hover:text-primary/80"
                                >
                                    Sign up
                                </button>
                            </>
                        ) : (
                            <>
                                Already have an account?{" "}
                                <button
                                    type="button"
                                    onClick={() => handleModeChange("signin")}
                                    className="font-medium text-primary hover:text-primary/80"
                                >
                                    Sign in
                                </button>
                            </>
                        )}
                    </p>

                    {/* Copyright */}
                    <p className="mt-12 text-center text-[11px] text-muted-foreground/60">
                        © 2026 LLM at Scale.AI. All Rights Reserved.
                        <br />
                        Confidential and Proprietary Information. Version 1.0
                    </p>
                </div>
            </div>
        </div>
    )
}
